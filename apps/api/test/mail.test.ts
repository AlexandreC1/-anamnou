import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityMailer } from '../src/auth/mail.js';
import { isolatedEnvironment } from './environment.js';
import { parseEnvironment } from '../src/config.js';

test('Resend reset delivery uses HTTPS, localized text, fragment tokens and a stable retry key', async () => {
  const keys: string[] = [];
  const mail = new IdentityMailer(
    {
      ...isolatedEnvironment(),
      MAIL_TRANSPORT: 'resend',
      RESEND_API_KEY: 're_test-only-credential',
    },
    async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal(options?.redirect, 'error');
      const headers = new Headers(options?.headers);
      assert.equal(
        headers.get('authorization'),
        'Bearer re_test-only-credential',
      );
      const key = headers.get('idempotency-key')!;
      assert.match(key, /^[a-f0-9]{64}$/);
      keys.push(key);
      const body = JSON.parse(String(options?.body));
      assert.equal(body.subject, 'Réinitialisez votre mot de passe');
      assert.deepEqual(body.to, ['recipient@example.org']);
      assert.ok(body.text.includes('/reset-password#token=private-token'));
      return Response.json({ id: 'receipt-id' });
    },
  );
  await mail.send(
    'recipient@example.org',
    'fr',
    'RESET_PASSWORD',
    'private-token',
  );
  await mail.send(
    'recipient@example.org',
    'fr',
    'RESET_PASSWORD',
    'private-token',
  );
  assert.equal(keys[0], keys[1]);
});

test('Resend rejection, invalid receipts and network failures remain retryable without leaking provider details', async () => {
  for (const send of [
    async () =>
      Response.json({ error: 'secret-provider-detail' }, { status: 429 }),
    async () => Response.json({}),
    async () => {
      throw new Error('secret-provider-detail');
    },
  ]) {
    const mail = new IdentityMailer(
      {
        ...isolatedEnvironment(),
        MAIL_TRANSPORT: 'resend',
        RESEND_API_KEY: 're_test-only-credential',
      },
      send,
    );
    await assert.rejects(
      mail.send('recipient@example.org', 'en', 'VERIFY_EMAIL', 'private-token'),
      { message: 'Email delivery failed.' },
    );
  }
});

test('Resend configuration requires its credential without requiring unused SMTP credentials', () => {
  const base = {
    ...Object.fromEntries(
      Object.entries(isolatedEnvironment()).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(',') : String(value),
      ]),
    ),
    API_PORT: '4000',
    MAIL_TRANSPORT: 'resend',
    APP_ENV: 'production',
    PUBLIC_WEB_URL: 'https://app.example.org',
    STORAGE_ENDPOINT: 'https://storage.example.org',
    MAIL_FROM: 'accounts@example.org',
  };
  assert.throws(() => parseEnvironment(base));
  assert.equal(
    parseEnvironment({ ...base, RESEND_API_KEY: 're_test-only-credential' })
      .MAIL_TRANSPORT,
    'resend',
  );
});
