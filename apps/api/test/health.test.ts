import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { isolatedEnvironment } from './environment.js';

test('HTTP liveness works without dependencies; readiness fails safely', async () => {
  const app = await createApp(isolatedEnvironment());
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  try {
    const live = await fetch(url + '/health', {
      headers: { 'x-request-id': 'untrusted-request-id' },
    });
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: 'ok' });
    assert.match(live.headers.get('x-request-id') ?? '', /^[a-f0-9-]{36}$/);
    assert.notEqual(live.headers.get('x-request-id'), 'untrusted-request-id');
    assert.equal(live.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(live.headers.get('cache-control'), 'no-store');
    assert.equal(live.headers.get('x-powered-by'), null);
    const ready = await fetch(url + '/ready');
    assert.equal(ready.status, 503);
    const body = await ready.text();
    assert.match(body, /Service unavailable/);
    assert.doesNotMatch(body, /postgres|password|127\.0\.0\.1|stack|Prisma/i);
    const missing = await fetch(url + '/unknown?token=private');
    assert.equal(missing.status, 404);
    assert.doesNotMatch(await missing.text(), /private|unknown|stack/);
  } finally {
    await app.close();
  }
});
test('public endpoint rate limit rejects excess requests with a safe envelope', async () => {
  const app = await createApp(isolatedEnvironment());
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  try {
    for (let index = 0; index < 120; index++) {
      const response = await fetch(url + '/health');
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    }
    const limited = await fetch(url + '/health');
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get('retry-after'));
    const body = await limited.text();
    assert.match(body, /Too many requests/);
    assert.match(body, /requestId/);
  } finally {
    await app.close();
  }
});
