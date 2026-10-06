import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Database } from '../database.js';
import type { IdentityService } from './service.js';
import { hashToken } from './security.js';
import {
  base32,
  matchTotp,
  newRecoveryCodes,
  newTotpSecret,
  otpauthUri,
  recoveryCodeHash,
  type SecretBox,
} from './mfa.js';

const PENDING_MS = 10 * 60_000;
const pendingContext = (userId: string) => userId + ':pending';

export class MfaService {
  constructor(
    private readonly database: Database,
    private readonly box: SecretBox,
    private readonly identity: IdentityService,
  ) {}

  async status(token: string | null) {
    const user = await this.identity.authenticate(token);
    return {
      enabled: user.mfaEnabledAt !== null,
      recoveryCodesRemaining: user.mfaEnabledAt
        ? await this.database.mfaRecoveryCode.count({
            where: { userId: user.id, usedAt: null },
          })
        : 0,
    };
  }

  async setup(token: string | null, password: string) {
    const user = await this.identity.authenticate(token);
    const current = await this.identity.confirmPassword(user, password);
    if (current.mfaEnabledAt) throw new ConflictException();
    const secret = newTotpSecret();
    await this.database.user.update({
      where: { id: user.id },
      data: {
        mfaPendingSecret: this.box.seal(secret, pendingContext(user.id)),
        mfaPendingExpiresAt: new Date(Date.now() + PENDING_MS),
      },
    });
    return {
      secret: base32(secret),
      uri: otpauthUri(secret, current.email),
    };
  }

  async enable(token: string | null, code: string) {
    const user = await this.identity.authenticate(token);
    await this.identity.throttle(user.id, 'mfa');
    const codes = newRecoveryCodes();
    await this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      if (current.mfaEnabledAt) throw new ConflictException();
      if (
        !current.mfaPendingSecret ||
        !current.mfaPendingExpiresAt ||
        current.mfaPendingExpiresAt <= new Date()
      )
        throw new BadRequestException();
      const secret = this.box.open(
        current.mfaPendingSecret,
        pendingContext(user.id),
      );
      const step = matchTotp(secret, code);
      if (step === null) throw new BadRequestException();
      await tx.user.update({
        where: { id: user.id },
        data: {
          mfaSecret: this.box.seal(secret, user.id),
          mfaEnabledAt: new Date(),
          mfaLastStep: step,
          mfaPendingSecret: null,
          mfaPendingExpiresAt: null,
        },
      });
      await tx.mfaRecoveryCode.deleteMany({ where: { userId: user.id } });
      await tx.mfaRecoveryCode.createMany({
        data: codes.map((value) => ({
          userId: user.id,
          codeHash: recoveryCodeHash(value),
        })),
      });
      // Other sessions were established without the new factor.
      await tx.session.deleteMany({
        where: { userId: user.id, tokenHash: { not: hashToken(token!) } },
      });
      await tx.session.update({
        where: { tokenHash: hashToken(token!) },
        data: { mfaVerifiedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          targetId: user.id,
          action: 'auth.mfa_enable',
        },
      });
    });
    await this.identity.clearThrottle(user.id, 'mfa');
    return { recoveryCodes: codes };
  }

  async disable(token: string | null, password: string, code: string) {
    const user = await this.reauthenticate(token, password, code);
    await this.database.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          mfaSecret: null,
          mfaEnabledAt: null,
          mfaLastStep: null,
          mfaPendingSecret: null,
          mfaPendingExpiresAt: null,
        },
      });
      await tx.mfaRecoveryCode.deleteMany({ where: { userId: user.id } });
      await tx.mfaChallenge.deleteMany({ where: { userId: user.id } });
      await tx.session.deleteMany({
        where: { userId: user.id, tokenHash: { not: hashToken(token!) } },
      });
      await tx.session.update({
        where: { tokenHash: hashToken(token!) },
        data: { mfaVerifiedAt: null },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          targetId: user.id,
          action: 'auth.mfa_disable',
        },
      });
    });
    return { status: 'ok' };
  }

  async regenerate(token: string | null, password: string, code: string) {
    const user = await this.reauthenticate(token, password, code);
    const codes = newRecoveryCodes();
    await this.database.$transaction(async (tx) => {
      await tx.mfaRecoveryCode.deleteMany({ where: { userId: user.id } });
      await tx.mfaRecoveryCode.createMany({
        data: codes.map((value) => ({
          userId: user.id,
          codeHash: recoveryCodeHash(value),
        })),
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          targetId: user.id,
          action: 'auth.mfa_recovery_regenerate',
        },
      });
    });
    return { recoveryCodes: codes };
  }

  // Step-up check for sensitive operations: current password plus a second factor.
  async reauthenticate(token: string | null, password: string, code: string) {
    const user = await this.identity.authenticate(token);
    await this.identity.confirmPassword(user, password);
    await this.identity.throttle(user.id, 'mfa');
    if (!(await this.verifyFactor(user.id, code)))
      throw new BadRequestException();
    await this.identity.clearThrottle(user.id, 'mfa');
    return user;
  }

  async completeLogin(challengeToken: string | null, code: string) {
    if (!challengeToken) throw new UnauthorizedException();
    const tokenHash = hashToken(challengeToken);
    // Count the attempt atomically before checking the code.
    const counted = await this.database.mfaChallenge.updateMany({
      where: { tokenHash, attempts: { lt: 5 }, expiresAt: { gt: new Date() } },
      data: { attempts: { increment: 1 } },
    });
    const challenge =
      counted.count === 1
        ? await this.database.mfaChallenge.findUnique({ where: { tokenHash } })
        : null;
    if (!challenge) throw new UnauthorizedException();
    await this.identity.throttle(challenge.userId, 'mfa');
    if (!(await this.verifyFactor(challenge.userId, code)))
      throw new UnauthorizedException();
    await this.identity.clearThrottle(challenge.userId, 'mfa');
    return this.identity.finishMfaLogin(tokenHash, challenge.userId);
  }

  private async verifyFactor(userId: string, code: string) {
    const user = await this.database.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.mfaEnabledAt || !user.mfaSecret) return false;
    if (/^\d{6}$/.test(code)) {
      const step = matchTotp(this.box.open(user.mfaSecret, user.id), code);
      if (step === null) return false;
      // A code is accepted once: its time step must advance the stored step.
      const used = await this.database.user.updateMany({
        where: {
          id: user.id,
          mfaEnabledAt: { not: null },
          OR: [{ mfaLastStep: null }, { mfaLastStep: { lt: step } }],
        },
        data: { mfaLastStep: step },
      });
      return used.count === 1;
    }
    const used = await this.database.mfaRecoveryCode.updateMany({
      where: { userId, codeHash: recoveryCodeHash(code), usedAt: null },
      data: { usedAt: new Date() },
    });
    if (used.count === 1)
      await this.database.auditLog.create({
        data: {
          actorUserId: userId,
          targetId: userId,
          action: 'auth.mfa_recovery_used',
        },
      });
    return used.count === 1;
  }
}
