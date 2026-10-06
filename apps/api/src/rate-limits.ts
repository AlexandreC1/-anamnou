import type { Store } from 'express-rate-limit';
import type { Database } from './database.js';
import { hashToken } from './auth/security.js';

export class DatabaseRateLimitStore implements Store {
  readonly localKeys = false;
  constructor(
    private readonly database: Database,
    readonly prefix: string,
    private readonly windowMs: number,
  ) {}
  private key(value: string) {
    return this.prefix + ':' + hashToken(value);
  }
  async increment(value: string) {
    const key = this.key(value);
    const rows = await this.database.$queryRaw<
      { count: number; expiresAt: Date }[]
    >`
      INSERT INTO "AuthThrottle" ("key", "count", "expiresAt") VALUES (${key}, 1, NOW() + ${this.windowMs} * INTERVAL '1 millisecond')
      ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthThrottle"."expiresAt" <= NOW() THEN 1 ELSE LEAST("AuthThrottle"."count" + 1, 1000000) END,
      "expiresAt" = CASE WHEN "AuthThrottle"."expiresAt" <= NOW() THEN NOW() + ${this.windowMs} * INTERVAL '1 millisecond' ELSE "AuthThrottle"."expiresAt" END
      RETURNING "count", "expiresAt"`;
    const row = rows[0];
    if (!row) throw new Error('Rate limiter unavailable');
    return { totalHits: row.count, resetTime: row.expiresAt };
  }
  async decrement(value: string) {
    const key = this.key(value);
    await this.database
      .$executeRaw`UPDATE "AuthThrottle" SET "count" = GREATEST(0, "count" - 1) WHERE "key" = ${key}`;
  }
  async resetKey(value: string) {
    await this.database.authThrottle.deleteMany({
      where: { key: this.key(value) },
    });
  }
}
