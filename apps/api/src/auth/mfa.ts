import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { z } from 'zod';
import { hashToken } from './security.js';

// RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30-second steps), the profile supported
// by common authenticator apps. Implemented on node:crypto to avoid a dependency.
const TOTP_STEP_SECONDS = 30;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32(bytes: Buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

export function totp(secret: Buffer, step: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', secret).update(counter).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000)
    .toString()
    .padStart(6, '0');
}

// Accepts one step of clock drift either way. Returns the matched step so the
// caller can reject replays of the same or an earlier step.
export function matchTotp(secret: Buffer, code: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  let matched: number | null = null;
  for (const step of [current - 1, current, current + 1])
    if (timingSafeEqual(Buffer.from(totp(secret, step)), Buffer.from(code)))
      matched = step;
  return matched;
}

export const newTotpSecret = () => randomBytes(20);
export function otpauthUri(secret: Buffer, account: string) {
  const label = encodeURIComponent('Anamnou:' + account);
  return `otpauth://totp/${label}?secret=${base32(secret)}&issuer=Anamnou&algorithm=SHA1&digits=6&period=${TOTP_STEP_SECONDS}`;
}

// Recovery codes carry 80 random bits, so a fast hash is sufficient at rest.
export function newRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () =>
    (base32(randomBytes(10)).match(/.{4}/g) ?? []).join('-'),
  );
}
export const recoveryCodeHash = (code: string) =>
  hashToken('mfa-recovery:' + code.toUpperCase().replace(/[\s-]/g, ''));

export const factorSchema = z
  .string()
  .trim()
  .regex(/^(?:\d{6}|[A-Za-z2-7]{4}(?:[\s-]?[A-Za-z2-7]{4}){3})$/);

// AES-256-GCM with the owning user ID as associated data: a sealed secret
// copied onto another account fails authentication instead of decrypting.
export class SecretBox {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) throw new Error('MFA key must be 32 bytes.');
  }
  seal(plain: Buffer, context: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(context));
    const data = Buffer.concat([cipher.update(plain), cipher.final()]);
    return (
      'v1.' + Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')
    );
  }
  open(sealed: string, context: string) {
    if (!sealed.startsWith('v1.'))
      throw new Error('Unknown MFA secret format.');
    const raw = Buffer.from(sealed.slice(3), 'base64');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      raw.subarray(0, 12),
    );
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
  }
}
