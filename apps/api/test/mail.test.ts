import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityMailer } from '../src/auth/mail.js';
import { isolatedEnvironment } from './environment.js';
import { parseEnvironment } from '../src/config.js';

test('Gmail refreshes OAuth and sends localized MIME with a fragment reset link', async () => {
  let calls = 0;
  const mail = new IdentityMailer(
    {
      ...isolatedEnvironment(),
      MAIL_TRANSPORT: 'gmail',
      MAIL_FROM: 'sender@gmail.com',
      GMAIL_CLIENT_ID: 'test.apps.googleusercontent.com',
      GMAIL_CLIENT_SECRET: 'test-secret',
      GMAIL_REFRESH_TOKEN: 'test-refresh',
    },
    async (url, options) => {
      calls++;
      assert.equal(options?.redirect, 'error');
      assert.ok(options?.signal);
      if (calls === 1) {
        assert.equal(url, 'https://oauth2.googleapis.com/token');
        const form = options?.body as URLSearchParams;
        assert.equal(form.get('grant_type'), 'refresh_token');
        assert.equal(form.get('refresh_token'), 'test-refresh');
        return Response.json({ access_token: 'temporary-token' });
      }
      assert.equal(
        url,
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      );
      assert.equal(
        new Headers(options?.headers).get('authorization'),
        'Bearer temporary-token',
      );
      const raw = JSON.parse(String(options?.body)).raw;
      const mime = Buffer.from(raw, 'base64url').toString();
      assert.ok(mime.includes('To: recipient@example.org'));
      assert.ok(mime.includes('From: sender@gmail.com'));
      assert.ok(
        mime
          .replace(/=\r\n/g, '')
          .replace(/=3D/g, '=')
          .includes('/reset-password#token=private-token'),
      );
      assert.ok(mime.includes('Subject: =?UTF-8?'));
      return Response.json({ id: 'gmail-receipt' });
    },
  );
  await mail.send(
    'recipient@example.org',
    'fr',
    'RESET_PASSWORD',
    'private-token',
  );
  assert.equal(calls, 2);
});

test('Gmail OAuth and delivery failures expose only safe errors', async () => {
  for (const failAt of [1, 2]) {
    for (const failure of ['rejection', 'receipt', 'network']) {
      let calls = 0;
      const mail = new IdentityMailer(
        { ...isolatedEnvironment(), MAIL_TRANSPORT: 'gmail' },
        async () => {
          calls++;
          if (calls !== failAt)
            return Response.json({ access_token: 'temporary-token' });
          if (failure === 'network') throw new Error('private-credential');
          return Response.json(
            { detail: 'private-credential' },
            { status: failure === 'rejection' ? 429 : 200 },
          );
        },
      );
      await assert.rejects(
        mail.send(
          'recipient@example.org',
          'en',
          'VERIFY_EMAIL',
          'private-token',
        ),
        { message: 'Email delivery failed.' },
      );
    }
  }
});

test('Gmail configuration requires dedicated OAuth credentials and a Gmail sender', () => {
  const base = Object.fromEntries(
    Object.entries(isolatedEnvironment()).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(',') : String(value),
    ]),
  );
  assert.throws(() => parseEnvironment({ ...base, MAIL_TRANSPORT: 'gmail' }));
  assert.equal(
    parseEnvironment({
      ...base,
      MAIL_TRANSPORT: 'gmail',
      MAIL_FROM: 'sender@gmail.com',
      GMAIL_CLIENT_ID: 'test.apps.googleusercontent.com',
      GMAIL_CLIENT_SECRET: 'test-secret',
      GMAIL_REFRESH_TOKEN: 'test-refresh',
    }).MAIL_TRANSPORT,
    'gmail',
  );
});

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
