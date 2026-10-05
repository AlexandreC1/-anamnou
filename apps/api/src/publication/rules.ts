import { z } from 'zod';
import { idSchema, pagination } from '../classes/rules.js';
export const readerQuery = pagination.extend({
  kind: z.enum(['MEMBERS', 'STAFF', 'QUOTES']).optional(),
});
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const deleteInput = z
  .object({ profileVersion: z.number().int().min(0).optional() })
  .strict();
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) =>
      [...value].every((character) => {
        const code = character.charCodeAt(0);
        return (
          code === 9 ||
          code === 10 ||
          code === 13 ||
          (code >= 32 && code !== 127)
        );
      }),
    );
const optionalText = (max: number) => text(max).nullable();
export const profileInput = z
  .object({
    version: z.number().int().min(0),
    displayName: text(80).min(1),
    nickname: optionalText(80),
    bio: optionalText(1000),
    quote: optionalText(280),
    activities: optionalText(500),
    aspiration: optionalText(280),
    contact: optionalText(300),
    visibility: z.enum(['PRIVATE', 'CLASS']),
    contactVisibility: z.enum(['PRIVATE', 'CLASS']),
    photoAssetId: idSchema.nullable(),
  })
  .strict();
export const intentInput = z
  .object({
    classId: idSchema,
    purpose: z.enum(['PROFILE', 'YEARBOOK']),
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    size: z.number().int().min(1).max(MAX_IMAGE_BYTES),
    alt: text(240).min(1),
  })
  .strict();
export const sectionInput = z
  .object({
    id: idSchema.optional(),
    type: z.enum([
      'COVER',
      'MESSAGE',
      'CLASS_PHOTO',
      'MEMBERS',
      'STAFF',
      'QUOTES',
      'GALLERY',
      'ACKNOWLEDGEMENTS',
      'GRADUATION',
    ]),
    title: text(120).min(1),
    body: text(4000),
    assetIds: z
      .array(idSchema)
      .max(12)
      .refine((values) => new Set(values).size === values.length),
  })
  .strict();
export const yearbookInput = z
  .object({
    version: z.number().int().min(0),
    title: text(120).min(1),
    theme: z.enum(['PAPER', 'INK', 'GARDEN']),
    sections: z
      .array(sectionInput)
      .min(1)
      .max(20)
      .refine((values) => {
        const ids = values.flatMap((value) => (value.id ? [value.id] : []));
        return ids.length === new Set(ids).size;
      }),
  })
  .strict();
