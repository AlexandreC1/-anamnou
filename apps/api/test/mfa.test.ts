import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  base32,
  factorSchema,
  matchTotp,
  newRecoveryCodes,
  otpauthUri,
  recoveryCodeHash,
  SecretBox,
  totp,
} from '../src/auth/mfa.js';

// RFC 6238 appendix B, SHA-1 seed, truncated to the six digits apps display.
const rfcSecret = Buffer.from('12345678901234567890');
test('TOTP matches RFC 6238 reference values', () => {
  for (const [seconds, expected] of [
    [59, '287082'],
    [1111111109, '081804'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ] as const)
    assert.equal(totp(rfcSecret, Math.floor(seconds / 30)), expected);
  assert.equal(base32(rfcSecret), 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
});

test('TOTP accepts one step of drift and reports the step for replay control', () => {
  const now = 1111111109_000;
  const step = Math.floor(now / 30_000);
  assert.equal(matchTotp(rfcSecret, totp(rfcSecret, step), now), step);
  assert.equal(matchTotp(rfcSecret, totp(rfcSecret, step - 1), now), step - 1);
  assert.equal(matchTotp(rfcSecret, totp(rfcSecret, step - 2), now), null);
  assert.equal(matchTotp(rfcSecret, '12345', now), null);
  assert.equal(matchTotp(rfcSecret, 'abcdef', now), null);
});

test('sealed secrets are bound to their owner and reject tampering', () => {
  const box = new SecretBox(randomBytes(32));
  const secret = randomBytes(20);
  const sealed = box.seal(secret, 'user-a');
  assert.ok(!sealed.includes(secret.toString('base64')));
  assert.deepEqual(box.open(sealed, 'user-a'), secret);
  assert.throws(() => box.open(sealed, 'user-b'));
  assert.throws(() => new SecretBox(randomBytes(32)).open(sealed, 'user-a'));
  const raw = Buffer.from(sealed.slice(3), 'base64');
  raw[raw.length - 1]! ^= 1;
  assert.throws(() => box.open('v1.' + raw.toString('base64'), 'user-a'));
  assert.throws(() => new SecretBox(randomBytes(16)));
});

test('recovery codes are unique, high entropy and normalized before hashing', () => {
  const codes = newRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  for (const code of codes) {
    assert.match(code, /^[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}$/);
    assert.ok(factorSchema.safeParse(code).success);
    assert.equal(
      recoveryCodeHash(code),
      recoveryCodeHash(code.toLowerCase().replace(/-/g, ' ')),
    );
  }
  assert.notEqual(recoveryCodeHash(codes[0]!), recoveryCodeHash(codes[1]!));
  for (const invalid of ['', '12345', '1234567', 'AAAA-AAAA', '<script>'])
    assert.equal(factorSchema.safeParse(invalid).success, false);
});

test('enrollment URI encodes the account label and authenticator parameters', () => {
  const uri = new URL(otpauthUri(rfcSecret, 'reader+test@example.test'));
  assert.equal(uri.protocol, 'otpauth:');
  assert.equal(uri.searchParams.get('secret'), base32(rfcSecret));
  assert.equal(uri.searchParams.get('issuer'), 'Anamnou');
  assert.equal(uri.searchParams.get('digits'), '6');
  assert.ok(uri.pathname.includes('reader%2Btest%40example.test'));
});
