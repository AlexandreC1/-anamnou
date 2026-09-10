import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import * as argon2 from 'argon2';

export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const cookieName = 'yearbook_session';
export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
} as const;
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(15).max(128);
export const localeSchema = z.enum(['ht', 'fr', 'en', 'es']);
export const nameSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) =>
    [...value].every(
      (character) =>
        character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    ),
  );
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException();
  return result.data;
}
export function sessionToken(cookie: string | undefined): string | null {
  const matches = (cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(cookieName + '='));
  if (matches.length !== 1) return null;
  const token = matches[0]?.slice(cookieName.length + 1);
  return token && tokenSchema.safeParse(token).success ? token : null;
}
