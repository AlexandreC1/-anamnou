import {
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Database } from '../database.js';
import type { IdentityMailer } from './mail.js';
import { hashToken, newToken } from './security.js';

export class IdentityDelivery implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('IdentityDelivery');
  private timer?: ReturnType<typeof setTimeout>;
  private active: Promise<void> = Promise.resolve();
  private stopped = false;
  constructor(
    private readonly database: Database,
    private readonly mailer: IdentityMailer,
  ) {}
  onModuleInit() {
    this.schedule();
  }
  private schedule() {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.active = this.deliverOne()
        .catch(() => {
          this.logger.error({ event: 'identity.delivery_failed' });
        })
        .finally(() => this.schedule());
    }, 500);
    this.timer.unref();
  }
  async onModuleDestroy() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.active;
  }
  async deliverOne() {
    const leaseId = randomUUID();
    const token = newToken();
    const tokenHash = hashToken(token);
    const claimed = await this.database.$transaction(async (tx) => {
      const jobs = await tx.$queryRaw<
        {
          id: string;
          userId: string;
          purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD';
          attempts: number;
        }[]
      >`
        SELECT "id", "userId", "purpose", "attempts" FROM "IdentityEmailJob"
        WHERE "nextAttemptAt" <= NOW() AND "failedAt" IS NULL AND "attempts" < 8
        ORDER BY "nextAttemptAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
      const job = jobs[0];
      if (!job) return;
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${job.userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: job.userId },
      });
      if (
        (job.purpose === 'VERIFY_EMAIL' && user.status !== 'PENDING') ||
        (job.purpose === 'RESET_PASSWORD' && user.status !== 'ACTIVE')
      ) {
        await tx.identityEmailJob.delete({ where: { id: job.id } });
        return;
      }
      const expiresAt = new Date(
        Date.now() + (job.purpose === 'VERIFY_EMAIL' ? 24 * 60 : 30) * 60000,
      );
      await tx.identityToken.upsert({
        where: { userId_purpose: { userId: user.id, purpose: job.purpose } },
        create: { userId: user.id, purpose: job.purpose, tokenHash, expiresAt },
        update: { tokenHash, expiresAt },
      });
      // A durable lease commits before SMTP. No database locks span network I/O.
      await tx.identityEmailJob.update({
        where: { id: job.id },
        data: {
          leaseId,
          attempts: { increment: 1 },
          nextAttemptAt: new Date(Date.now() + 60000),
        },
      });
      return { ...job, email: user.email, locale: user.locale };
    });
    if (!claimed) return;
    try {
      await this.mailer.send(
        claimed.email,
        claimed.locale,
        claimed.purpose,
        token,
      );
      await this.database.$transaction(async (tx) => {
        const removed = await tx.identityEmailJob.deleteMany({
          where: { id: claimed.id, leaseId },
        });
        if (removed.count)
          await tx.auditLog.create({
            data: {
              actorUserId: claimed.userId,
              targetId: claimed.userId,
              action: 'auth.email_sent',
            },
          });
      });
    } catch (error) {
      await this.database.$transaction(async (tx) => {
        await tx.identityToken.deleteMany({ where: { tokenHash } });
        await tx.identityEmailJob.updateMany({
          where: { id: claimed.id, leaseId },
          data: {
            leaseId: null,
            nextAttemptAt: new Date(
              Date.now() + Math.min(3600000, 60000 * 2 ** claimed.attempts),
            ),
            ...(claimed.attempts >= 7 ? { failedAt: new Date() } : {}),
          },
        });
      });
      if (claimed.attempts >= 7)
        this.logger.error({ event: 'identity.delivery_dead_letter' });
      throw error;
    }
  }
}
