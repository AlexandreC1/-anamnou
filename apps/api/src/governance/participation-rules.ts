import { z } from 'zod';
import { stepUp } from './rules.js';
const reference = z
  .string()
  .trim()
  .min(4)
  .max(120)
  .regex(/^[\p{L}\p{N} ._:/-]+$/u)
  .refine((value) => !value.includes('://'));
export const policyInput = stepUp
  .extend({
    schoolId: z.uuid(),
    jurisdiction: z.string().trim().min(2).max(120),
    notice: z.string().trim().min(100).max(6000),
    reviewReference: reference,
    expiresAt: z.iso
      .datetime()
      .refine(
        (value) =>
          Date.parse(value) > Date.now() &&
          Date.parse(value) <= Date.now() + 366 * 86400000,
      ),
  })
  .strict();
export const participationInput = z
  .object({ policyId: z.uuid(), version: z.number().int().nonnegative() })
  .strict();
export const participationDecision = stepUp
  .extend({
    version: z.number().int().positive(),
    approve: z.boolean(),
    authority: z.enum(['SELF', 'GUARDIAN', 'INSTITUTION', 'COMBINED']),
    reviewReference: reference,
    reason: z.string().trim().min(20).max(500),
    expiresAt: z.iso
      .datetime()
      .refine(
        (value) =>
          Date.parse(value) > Date.now() &&
          Date.parse(value) <= Date.now() + 366 * 86400000,
      ),
  })
  .strict();
export const participationWithdrawal = z
  .object({ version: z.number().int().positive() })
  .strict();
