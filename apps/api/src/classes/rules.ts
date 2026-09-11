import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import type {
  ClassRole,
  MembershipStatus,
} from '../generated/prisma/client.js';

export const idSchema = z.string().uuid();
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) =>
      [...value].every(
        (character) =>
          character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
      ),
    );
export const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export function generatedSlug(name: string) {
  const stem =
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
      .replace(/-$/g, '') || 'class';
  return stem + '-' + randomUUID().slice(0, 8);
}
export const schoolInput = z
  .object({
    name: text(120),
    slug: slugSchema.optional(),
    location: text(120).nullable().optional(),
  })
  .strict();
export const classInput = z
  .object({
    schoolId: idSchema,
    name: text(120),
    slug: slugSchema.optional(),
    graduationYear: z.number().int().min(1900).max(2200),
    motto: text(240).nullable().optional(),
  })
  .strict();
export const schoolPatch = schoolInput
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export const classPatch = classInput
  .omit({ schoolId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export const membershipInput = z
  .object({
    role: z.enum(['MEMBER', 'CLASS_ADMIN', 'STAFF', 'GUEST']),
    status: z.enum(['ACTIVE', 'REMOVED']),
  })
  .strict();
export const invitationInput = z
  .object({
    role: z.enum(['MEMBER', 'STAFF', 'GUEST']).default('MEMBER'),
    expiresInDays: z.number().int().min(1).max(30).default(7),
    maxUses: z.number().int().min(1).max(500).default(30),
  })
  .strict();
export const invitationCode = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{32}$/);
export const pagination = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export type Page = z.infer<typeof pagination>;
export function pageQuery(page: Page) {
  return { skip: (page.page - 1) * page.pageSize, take: page.pageSize + 1 };
}
export function pageResult<T>(rows: T[], page: Page) {
  return {
    items: rows.slice(0, page.pageSize),
    ...page,
    hasMore: rows.length > page.pageSize,
  };
}
export function protectLastAdmin(
  current: { role: ClassRole; status: MembershipStatus },
  next: { role: ClassRole; status: MembershipStatus },
  count: number,
) {
  if (
    current.role === 'CLASS_ADMIN' &&
    current.status === 'ACTIVE' &&
    (next.role !== 'CLASS_ADMIN' || next.status !== 'ACTIVE') &&
    count <= 1
  )
    throw new ConflictException();
}
