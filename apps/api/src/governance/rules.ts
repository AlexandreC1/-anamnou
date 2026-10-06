import { z } from 'zod';
import { factorSchema } from '../auth/mfa.js';

export const governanceRole = z.enum([
  'QUEUE_MANAGER',
  'CONSENT_REVIEWER',
  'SAFEGUARDING_REVIEWER',
  'PRIVACY_REVIEWER',
  'AUDITOR',
]);
export const queueRole = z.enum([
  'CONSENT_REVIEWER',
  'SAFEGUARDING_REVIEWER',
  'PRIVACY_REVIEWER',
]);
export const stepUp = z.object({
  password: z.string().min(1).max(128),
  code: factorSchema,
});
export const grantInput = stepUp
  .extend({
    schoolId: z.uuid(),
    userId: z.uuid(),
    role: governanceRole,
    expiresInDays: z.number().int().min(1).max(90),
  })
  .strict();
export const decisionInput = stepUp
  .extend({ reason: z.string().trim().min(20).max(500) })
  .strict();
export const queueInput = stepUp
  .extend({
    schoolId: z.uuid(),
    name: z.string().trim().min(2).max(120),
    role: queueRole,
    primaryGrantId: z.uuid(),
    backupGrantId: z.uuid(),
  })
  .strict();
export const queuePatch = queueInput
  .omit({ schoolId: true })
  .extend({ version: z.number().int().positive() })
  .strict();
export const listInput = z
  .object({ schoolId: z.uuid(), cursor: z.uuid().optional() })
  .strict();
