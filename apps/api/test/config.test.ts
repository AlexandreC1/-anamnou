import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnvironment } from '../src/config.js';
import { isolatedEnvironment } from './environment.js';

test('environment rejects missing variables without exposing input values', () => {
  const secret = 'private-value-must-not-appear';
  assert.throws(
    () => parseEnvironment({ DATABASE_URL: secret }),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes('DATABASE_URL') &&
      !error.message.includes(secret),
  );
});
test('environment rejects out-of-range ports and non-HTTP storage endpoints', () => {
  const valid = {
    ...isolatedEnvironment(),
    API_PORT: '4000',
    SMTP_PORT: '1025',
  };
  assert.throws(() => parseEnvironment({ ...valid, API_PORT: '65536' }));
  assert.throws(() =>
    parseEnvironment({ ...valid, STORAGE_ENDPOINT: 'file:///etc/passwd' }),
  );
  assert.throws(() =>
    parseEnvironment({
      ...valid,
      PUBLIC_WEB_URL: 'http://localhost:3000/some-path',
    }),
  );
});
test('production environment requires HTTPS and explicit secrets', () => {
  const valid = {
    ...isolatedEnvironment(),
    API_PORT: '4000',
    SMTP_PORT: '587',
    APP_ENV: 'production',
  };
  assert.throws(() => parseEnvironment(valid));
  assert.equal(
    parseEnvironment({
      ...valid,
      PUBLIC_WEB_URL: 'https://example.org',
      STORAGE_ENDPOINT: 'https://storage.example.org',
      SMTP_USER: 'smtp-test-user',
      SMTP_PASSWORD: 'smtp-test-password',
      MAIL_FROM: 'yearbook@example.org',
    }).APP_ENV,
    'production',
  );
});
