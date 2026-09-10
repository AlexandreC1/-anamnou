import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { parseEnvironment } from '../src/config.js';
import { createDatabase } from '../src/database.js';
import { S3ObjectStorage } from '../src/storage.js';

const environment = parseEnvironment(process.env);
if (environment.APP_ENV === 'production')
  throw new Error('Integration tests must not run in production.');

test('real API is ready against migrated PostgreSQL and initialized MinIO', async () => {
  const app = await createApp(environment);
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  try {
    const response = await fetch(url + '/ready');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    const schema = await fetch(url + '/openapi.json');
    assert.equal(schema.status, 200);
    const specification = await schema.text();
    assert.match(specification, /\/health/);
    assert.match(specification, /\/ready/);
    assert.doesNotMatch(specification, /\/auth/);
    const cors = await fetch(url + '/health', {
      headers: { Origin: 'https://untrusted.example' },
    });
    assert.notEqual(
      cors.headers.get('access-control-allow-origin'),
      'https://untrusted.example',
    );
  } finally {
    await app.close();
  }
});

test('PostgreSQL enforces uniqueness and transaction rollback', async () => {
  const database = createDatabase(environment.DATABASE_URL);
  const key = 'test-' + randomUUID();
  try {
    const results = await Promise.allSettled([
      database.systemMetadata.create({ data: { key, value: 'one' } }),
      database.systemMetadata.create({ data: { key, value: 'two' } }),
    ]);
    assert.equal(
      results.filter((result) => result.status === 'fulfilled').length,
      1,
    );
    assert.equal(
      results.filter((result) => result.status === 'rejected').length,
      1,
    );
    await assert.rejects(
      database.$transaction(async (transaction) => {
        await transaction.systemMetadata.update({
          where: { key },
          data: { value: 'rollback' },
        });
        throw new Error('Deliberate transaction rollback test.');
      }),
      /Deliberate transaction rollback test/,
    );
    assert.notEqual(
      (await database.systemMetadata.findUniqueOrThrow({ where: { key } }))
        .value,
      'rollback',
    );
  } finally {
    await database.systemMetadata.deleteMany({ where: { key } });
    await database.$disconnect();
  }
});

test('private object storage round-trip, anonymous denial, deletion and invalid keys', async () => {
  const storage = new S3ObjectStorage(environment);
  const key = 'integration/' + randomUUID();
  const content = new TextEncoder().encode('Storage integration fixture');
  try {
    await storage.put(key, content, 'application/octet-stream');
    assert.deepEqual(await storage.get(key), content);
    const anonymous = await fetch(
      environment.STORAGE_ENDPOINT +
        '/' +
        environment.STORAGE_BUCKET +
        '/' +
        key,
    );
    assert.equal(anonymous.status, 403);
    await assert.rejects(
      storage.put('../escape', content, 'text/plain'),
      /Invalid object key/,
    );
    await storage.delete(key);
    await assert.rejects(storage.get(key));
  } finally {
    await storage.delete(key);
    storage.close();
  }
});
