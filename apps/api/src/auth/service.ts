import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Database } from '../database.js';
import {
  hashToken,
  newToken,
  passwordOptions,
  SESSION_MS,
} from './security.js';
import type { User } from '../generated/prisma/client.js';

export const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  locale: user.locale,
  role: user.role,
  emailVerified: user.emailVerifiedAt !== null,
});

export class IdentityService {
  private readonly dummyHash = argon2.hash(newToken(), passwordOptions);
  constructor(private readonly database: Database) {}

  async throttle(email: string, operation: string) {
    const key = operation + ':' + hashToken(email);
    const rows = await this.database.$queryRaw<{ count: number }[]>`
      INSERT INTO "AuthThrottle" ("key", "count", "expiresAt") VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
      ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthThrottle"."expiresAt" <= NOW() THEN 1 ELSE "AuthThrottle"."count" + 1 END,
      "expiresAt" = CASE WHEN "AuthThrottle"."expiresAt" <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE "AuthThrottle"."expiresAt" END
      RETURNING "count"`;
    if ((rows[0]?.count ?? 11) > 10)
      throw new HttpException('Rate limited', 429);
  }

  async register(input: {
    email: string;
    password: string;
    displayName: string;
    locale: string;
  }) {
    await this.throttle(input.email, 'register');
    const passwordHash = await argon2.hash(input.password, passwordOptions);
    // Unique insert avoids racing registration and never changes an existing password.
    await this.database.$transaction(async (tx) => {
      const result = await tx.user.createMany({
        data: {
          email: input.email,
          passwordHash,
          displayName: input.displayName,
          locale: input.locale,
        },
        skipDuplicates: true,
      });
      if (result.count === 0) return;
      const user = await tx.user.findUniqueOrThrow({
        where: { email: input.email },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          targetId: user.id,
          action: 'auth.register',
        },
      });
      await tx.identityEmailJob.create({
        data: { userId: user.id, purpose: 'VERIFY_EMAIL' },
      });
    });
  }

  async requestToken(
    email: string,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
  ) {
    await this.throttle(email, purpose);
    const user = await this.database.user.findUnique({ where: { email } });
    if (
      !user ||
      user.status === 'DISABLED' ||
      (purpose === 'VERIFY_EMAIL' && user.status !== 'PENDING') ||
      (purpose === 'RESET_PASSWORD' && user.status !== 'ACTIVE')
    )
      return;
    await this.issueToken(user, purpose);
  }

  private async issueToken(
    user: User,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
  ) {
    await this.database.identityEmailJob.upsert({
      where: { userId_purpose: { userId: user.id, purpose } },
      create: { userId: user.id, purpose },
      update: { nextAttemptAt: new Date(), attempts: 0 },
    });
  }

  async redeem(
    token: string,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
    password?: string,
  ) {
    const passwordHash = password
      ? await argon2.hash(password, passwordOptions)
      : undefined;
    await this.database.$transaction(async (tx) => {
      const record = await tx.identityToken.findUnique({
        where: { tokenHash: hashToken(token) },
      });
      if (
        !record ||
        record.purpose !== purpose ||
        record.expiresAt <= new Date()
      )
        throw new BadRequestException();
      // Lock user before token consumption, serializing reset with login and other resets.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${record.userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: record.userId },
      });
      if (user.status === 'DISABLED') throw new BadRequestException();
      const consumed = await tx.identityToken.deleteMany({
        where: {
          tokenHash: hashToken(token),
          purpose,
          expiresAt: { gt: new Date() },
        },
      });
      if (consumed.count !== 1) throw new BadRequestException();
      await tx.user.update({
        where: { id: user.id },
        data:
          purpose === 'VERIFY_EMAIL'
            ? { status: 'ACTIVE', emailVerifiedAt: new Date() }
            : { passwordHash },
      });
      if (purpose === 'RESET_PASSWORD')
        await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          targetId: user.id,
          action:
            purpose === 'VERIFY_EMAIL'
              ? 'auth.verify_email'
              : 'auth.reset_password',
        },
      });
    });
  }

  async login(email: string, password: string) {
    await this.throttle(email, 'login');
    const user = await this.database.user.findUnique({ where: { email } });
    const valid = await argon2.verify(
      user?.passwordHash ?? (await this.dummyHash),
      password,
    );
    if (!user || !valid || user.status !== 'ACTIVE')
      throw new UnauthorizedException();
    const token = newToken();
    await this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      if (
        current.passwordHash !== user.passwordHash ||
        current.status !== 'ACTIVE'
      )
        throw new UnauthorizedException();
      await tx.session.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + SESSION_MS),
        },
      });
      await tx.auditLog.create({
        data: { actorUserId: user.id, targetId: user.id, action: 'auth.login' },
      });
    });
    return { token, user: publicUser(user) };
  }

  async authenticate(token: string | null) {
    if (!token) throw new UnauthorizedException();
    const session = await this.database.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.user.status !== 'ACTIVE' ||
      !session.user.emailVerifiedAt
    )
      throw new UnauthorizedException();
    return session.user;
  }

  async logout(token: string | null) {
    if (!token) return;
    await this.database.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { tokenHash: hashToken(token) },
      });
      await tx.session.deleteMany({ where: { tokenHash: hashToken(token) } });
      if (session)
        await tx.auditLog.create({
          data: {
            actorUserId: session.userId,
            targetId: session.userId,
            action: 'auth.logout',
          },
        });
    });
  }

  async update(
    token: string | null,
    input: { displayName?: string; locale?: string },
  ) {
    const user = await this.authenticate(token);
    return publicUser(
      await this.database.user.update({ where: { id: user.id }, data: input }),
    );
  }
  requirePlatformAdmin(user: User) {
    if (user.role !== 'PLATFORM_ADMIN') throw new ForbiddenException();
  }
}
