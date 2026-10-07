import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proxyApi } from './proxy.mjs';

test('unconfigured previews deny account requests without reaching an origin', async () => {
  let calls = 0;
  const response = await proxyApi(
    new Request('https://preview.example/api/auth/register', {
      method: 'POST',
    }),
    {},
    () => {
      calls++;
    },
  );
  assert.equal(response.status, 503);
  assert.equal(calls, 0);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('proxy preserves method, credentials and query but strips spoofed forwarding headers', async () => {
  const request = new Request('https://app.example/api/me?cursor=abc', {
    headers: {
      cookie: 'session=test',
      origin: 'https://app.example',
      'x-forwarded-for': '1.2.3.4',
    },
  });
  const response = await proxyApi(
    request,
    { API_ENABLED: 'true', API_ORIGIN: 'https://backend.example' },
    async (url, options) => {
      assert.equal(url, 'https://backend.example/me?cursor=abc');
      assert.equal(options.headers.get('cookie'), 'session=test');
      assert.equal(options.headers.get('origin'), 'https://app.example');
      assert.equal(options.headers.get('x-forwarded-for'), null);
      assert.equal(options.redirect, 'manual');
      return new Response('private', {
        headers: {
          'cache-control': 'public',
          'set-cookie': 'session=next; Secure; HttpOnly',
        },
      });
    },
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(
    response.headers.get('set-cookie'),
    'session=next; Secure; HttpOnly',
  );
});
test('proxy cannot change origin through a double slash and rejects unsafe configuration', async () => {
  await proxyApi(
    new Request('https://app.example/api//attacker.example/me'),
    { API_ENABLED: 'true', API_ORIGIN: 'https://backend.example' },
    async (url) => {
      assert.equal(new URL(url).origin, 'https://backend.example');
      return new Response('ok');
    },
  );
  for (const url of [
    'http://localhost:4000',
    'https://user:password@backend.example',
    'https://backend.example/path',
  ])
    assert.equal(
      (
        await proxyApi(new Request('https://app.example/api/me'), {
          API_ENABLED: 'true',
          API_ORIGIN: url,
        })
      ).status,
      503,
    );
});
