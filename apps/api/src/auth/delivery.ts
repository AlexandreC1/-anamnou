import {
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
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
          // Never log SMTP exceptions: they can contain recipients or message content.
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
    let jobId: string | undefined;
    try {
      await this.database.$transaction(
        async (tx) => {
          const jobs = await tx.$queryRaw<
            {
              id: string;
              userId: string;
              purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD';
            }[]
          >`
          SELECT "id", "userId", "purpose" FROM "IdentityEmailJob"
          WHERE "nextAttemptAt" <= NOW() ORDER BY "nextAttemptAt"
          FOR UPDATE SKIP LOCKED LIMIT 1`;
          const job = jobs[0];
          if (!job) return;
          jobId = job.id;
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
          const token = newToken();
          const tokenHash = hashToken(token);
          const expiresAt = new Date(
            Date.now() +
              (job.purpose === 'VERIFY_EMAIL' ? 24 * 60 : 30) * 60000,
          );
          await tx.identityToken.upsert({
            where: {
              userId_purpose: { userId: user.id, purpose: job.purpose },
            },
            create: {
              userId: user.id,
              purpose: job.purpose,
              tokenHash,
              expiresAt,
            },
            update: { tokenHash, expiresAt },
          });
          await this.mailer.send(user.email, user.locale, job.purpose, token);
          await tx.identityEmailJob.delete({ where: { id: job.id } });
          await tx.auditLog.create({
            data: {
              actorUserId: user.id,
              targetId: user.id,
              action: 'auth.email_sent',
            },
          });
        },
        { timeout: 20000 },
      );
    } catch (error) {
      if (jobId)
        await this.database.identityEmailJob.updateMany({
          where: { id: jobId },
          data: {
            attempts: { increment: 1 },
            nextAttemptAt: new Date(Date.now() + 60000),
          },
        });
      throw error;
    }
  }
}
