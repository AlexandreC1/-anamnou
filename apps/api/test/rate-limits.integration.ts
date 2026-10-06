import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseEnvironment } from '../src/config.js';
import { createDatabase } from '../src/database.js';
import { DatabaseRateLimitStore } from '../src/rate-limits.js';

test('rate limits share atomic counters across instances and survive store restart', async () => {
  const environment = parseEnvironment(process.env);
  if (environment.APP_ENV !== 'test')
    throw new Error('Isolated test database required');
  const db = createDatabase(environment.DATABASE_URL);
  const prefix = 'rate-test-' + randomUUID().slice(0, 8);
  try {
    const first = new DatabaseRateLimitStore(db, prefix, 60_000);
    const second = new DatabaseRateLimitStore(db, prefix, 60_000);
    const counts = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        (index % 2 ? first : second).increment('client'),
      ),
    );
    assert.deepEqual(
      counts.map((result) => result.totalHits).sort((a, b) => a - b),
      [1, 2, 3, 4, 5, 6, 7, 8],
    );
    const restarted = new DatabaseRateLimitStore(db, prefix, 60_000);
    assert.equal((await restarted.increment('client')).totalHits, 9);
    await restarted.resetKey('client');
    assert.equal((await restarted.increment('client')).totalHits, 1);
  } finally {
    await db.authThrottle.deleteMany({
      where: { key: { startsWith: prefix } },
    });
    await db.$disconnect();
  }
});
