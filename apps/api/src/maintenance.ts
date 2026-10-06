import {
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import type { Database } from './database.js';
import type { ObjectStorage } from './storage.js';
import { cleanupMedia } from './publication/cleanup.js';

export async function cleanupIdentity(database: Database, now = new Date()) {
  // Bounded batches: expired state cannot accumulate into an unbounded delete.
  return database.$transaction(async (tx) => {
    const sessions =
      await tx.$executeRaw`DELETE FROM "Session" WHERE "tokenHash" IN (SELECT "tokenHash" FROM "Session" WHERE "expiresAt" < ${now} LIMIT 1000)`;
    const tokens =
      await tx.$executeRaw`DELETE FROM "IdentityToken" WHERE "tokenHash" IN (SELECT "tokenHash" FROM "IdentityToken" WHERE "expiresAt" < ${now} LIMIT 1000)`;
    const counters =
      await tx.$executeRaw`DELETE FROM "AuthThrottle" WHERE "key" IN (SELECT "key" FROM "AuthThrottle" WHERE "expiresAt" < ${now} LIMIT 1000)`;
    return { sessions, tokens, counters };
  });
}

export class Maintenance implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private active: Promise<void> = Promise.resolve();
  private readonly logger = new Logger('Maintenance');
  constructor(
    private readonly database: Database,
    private readonly storage: ObjectStorage,
  ) {}
  onModuleInit() {
    this.schedule();
  }
  private schedule() {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.active = this.run()
        .catch(() => {
          this.logger.error({ event: 'maintenance.failed' });
        })
        .finally(() => this.schedule());
    }, 5 * 60_000);
    this.timer.unref();
  }
  async run() {
    const identity = await cleanupIdentity(this.database);
    const media = await cleanupMedia(this.database, this.storage);
    this.logger.log({ event: 'maintenance.completed', ...identity, media });
  }
  async onModuleDestroy() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.active;
  }
}
