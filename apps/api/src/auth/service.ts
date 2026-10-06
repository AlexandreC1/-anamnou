import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Database } from '../database.js';
import {
  hashToken,
  MFA_CHALLENGE_MS,
  newToken,
  SESSION_MS,
} from './security.js';
import type { User } from '../generated/prisma/client.js';
import { hashPassword, verifyPassword } from './hashing.js';
const sharedDummyHash = hashPassword(newToken());

export const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  locale: user.locale,
  role: user.role,
  emailVerified: user.emailVerifiedAt !== null,
  mfaEnabled: user.mfaEnabledAt !== null,
});

export class IdentityService {
  private readonly dummyHash = sharedDummyHash;
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
  async clearThrottle(identifier: string, operation: string) {
    await this.database.authThrottle.deleteMany({
      where: { key: operation + ':' + hashToken(identifier) },
    });
  }

  async register(input: {
    email: string;
    password: string;
    displayName: string;
    locale: string;
  }) {
    await this.throttle(input.email, 'register');
    const passwordHash = await hashPassword(input.password);
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
      update: {
        nextAttemptAt: new Date(),
        attempts: 0,
        leaseId: null,
        failedAt: null,
      },
    });
  }

  async redeem(
    token: string,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
    password?: string,
  ) {
    // Reject nonexistent/expired/purpose-mismatched tokens before expensive work.
    // The transaction below rechecks and consumes the token atomically.
    const eligible = await this.database.identityToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { status: true } } },
    });
    if (
      !eligible ||
      eligible.purpose !== purpose ||
      eligible.expiresAt <= new Date() ||
      eligible.user.status === 'DISABLED'
    )
      throw new BadRequestException();
    const passwordHash = password ? await hashPassword(password) : undefined;
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
      if (purpose === 'RESET_PASSWORD') {
        await tx.session.deleteMany({ where: { userId: user.id } });
        await tx.mfaChallenge.deleteMany({ where: { userId: user.id } });
      }
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

  async login(email: string, password: string, address: string) {
    // Counted per account and client address before hashing. An attacker's
    // address is cut off after ten attempts, including a correct guess, while
    // the owner signing in from elsewhere is unaffected.
    const pair = 'login-ip:' + hashToken(address).slice(0, 16);
    await this.throttle(email, pair);
    const user = await this.database.user.findUnique({ where: { email } });
    const valid = await verifyPassword(
      user?.passwordHash ?? (await this.dummyHash),
      password,
    );
    if (!user || !valid || user.status !== 'ACTIVE') {
      await this.throttle(email, 'login');
      throw new UnauthorizedException();
    }
    await this.clearThrottle(email, pair);
    await this.clearThrottle(email, 'login');
    if (user.mfaEnabledAt) {
      const challenge = newToken();
      await this.database.mfaChallenge.create({
        data: {
          tokenHash: hashToken(challenge),
          userId: user.id,
          expiresAt: new Date(Date.now() + MFA_CHALLENGE_MS),
        },
      });
      return { challenge };
    }
    return this.startSession(user.id, user.passwordHash, null);
  }

  async finishMfaLogin(challengeHash: string, userId: string) {
    const user = await this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const consumed = await tx.mfaChallenge.deleteMany({
        where: {
          tokenHash: challengeHash,
          userId,
          expiresAt: { gt: new Date() },
        },
      });
      if (consumed.count !== 1) throw new UnauthorizedException();
      return tx.user.findUniqueOrThrow({ where: { id: userId } });
    });
    if (!user.mfaEnabledAt) throw new UnauthorizedException();
    return this.startSession(user.id, user.passwordHash, new Date());
  }

  private async startSession(
    userId: string,
    passwordHash: string,
    mfaVerifiedAt: Date | null,
  ) {
    const token = newToken();
    const user = await this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({
        where: { id: userId },
      });
      if (current.passwordHash !== passwordHash || current.status !== 'ACTIVE')
        throw new UnauthorizedException();
      const oldest = await tx.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: 9,
        select: { tokenHash: true },
      });
      await tx.session.deleteMany({
        where: {
          tokenHash: { in: oldest.map((session) => session.tokenHash) },
        },
      });
      await tx.session.create({
        data: {
          tokenHash: hashToken(token),
          userId,
          expiresAt: new Date(Date.now() + SESSION_MS),
          mfaVerifiedAt,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          targetId: userId,
          action: 'auth.login',
          metadata: { mfa: mfaVerifiedAt !== null },
        },
      });
      return current;
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
      session.lastSeenAt.getTime() <
        Date.now() -
          (session.user.role === 'PLATFORM_ADMIN'
            ? 60 * 60_000
            : 24 * 60 * 60_000) ||
      session.user.status !== 'ACTIVE' ||
      !session.user.emailVerifiedAt
    )
      throw new UnauthorizedException();
    if (session.lastSeenAt.getTime() < Date.now() - 5 * 60_000) {
      const refreshed = await this.database.session.updateMany({
        where: { tokenHash: session.tokenHash, expiresAt: { gt: new Date() } },
        data: { lastSeenAt: new Date() },
      });
      if (refreshed.count !== 1) throw new UnauthorizedException();
    }
    // Platform privileges apply only to sessions that proved a second factor.
    // Without one, the account acts as an ordinary user and can still enroll.
    if (
      session.user.role === 'PLATFORM_ADMIN' &&
      !(session.mfaVerifiedAt && session.user.mfaEnabledAt)
    )
      return { ...session.user, role: 'USER' as const };
    return session.user;
  }

  async sessions(token: string | null) {
    const user = await this.authenticate(token);
    const rows = await this.database.session.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
        lastSeenAt: {
          gt: new Date(
            Date.now() -
              (user.role === 'PLATFORM_ADMIN' ? 1 : 24) * 60 * 60_000,
          ),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        lastSeenAt: true,
        tokenHash: true,
      },
    });
    return rows.map(({ tokenHash, ...session }) => ({
      ...session,
      current: tokenHash === hashToken(token!),
    }));
  }
  async revokeSession(token: string | null, id?: string) {
    const user = await this.authenticate(token);
    await this.database.$transaction(async (tx) => {
      await tx.session.deleteMany({
        where: { userId: user.id, ...(id ? { id } : {}) },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          targetId: user.id,
          action: id ? 'auth.session_revoke' : 'auth.sessions_revoke_all',
        },
      });
    });
    return { status: 'ok' };
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
    if (user.role !== 'PLATFORM_ADMIN' || !user.mfaEnabledAt)
      throw new ForbiddenException();
  }
  async confirmPassword(user: User, password: string) {
    // Bounded reauthentication guessing with a stolen session.
    await this.throttle(user.id, 'reauth');
    const current = await this.database.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    if (
      current.status !== 'ACTIVE' ||
      !(await verifyPassword(current.passwordHash, password))
    )
      throw new UnauthorizedException();
    await this.clearThrottle(user.id, 'reauth');
    return current;
  }
}
