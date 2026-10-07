import { z } from 'zod';
import { isIP } from 'node:net';

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
const httpUrl = z.string().refine((value) => {
  const url = parseUrl(value);
  return url !== null && ['http:', 'https:'].includes(url.protocol);
});
const schema = z
  .object({
    APP_ENV: z.enum(['development', 'test', 'production']),
    TRUST_PROXY_CIDRS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean),
      )
      .refine(
        (values) =>
          values.length <= 8 &&
          values.every((value) => {
            const [address, mask, extra] = value.split('/');
            const family = isIP(address ?? '');
            return (
              !extra &&
              family !== 0 &&
              (mask === undefined ||
                (/^\d+$/.test(mask) &&
                  Number(mask) > 0 &&
                  Number(mask) <= (family === 4 ? 32 : 128)))
            );
          }),
      ),
    API_PORT: z.coerce.number().int().min(1).max(65535),
    API_HOST: z.enum(['127.0.0.1', '0.0.0.0']).default('127.0.0.1'),
    PUBLIC_WEB_URL: httpUrl.refine((value) => {
      const url = parseUrl(value);
      return (
        url !== null &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password
      );
    }),
    DATABASE_URL: z.string().refine((value) => {
      const url = parseUrl(value);
      return (
        url !== null && ['postgres:', 'postgresql:'].includes(url.protocol)
      );
    }),
    STORAGE_ENDPOINT: httpUrl,
    STORAGE_REGION: z.string().min(1).max(64),
    STORAGE_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/),
    STORAGE_ACCESS_KEY: z.string().min(3),
    STORAGE_SECRET_KEY: z.string().min(16),
    SMTP_HOST: z.string().min(1).default('127.0.0.1'),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
    SMTP_USER: z.string().default(''),
    SMTP_PASSWORD: z.string().default(''),
    MAIL_FROM: z.string().email().default('yearbook@localhost.test'),
    // Base64-encoded 32-byte key that seals TOTP secrets at rest.
    MFA_ENCRYPTION_KEY: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
  })
  .superRefine((value, context) => {
    if (value.APP_ENV === 'production') {
      if (
        !value.SMTP_USER ||
        !value.SMTP_PASSWORD ||
        value.MAIL_FROM.endsWith('.test')
      ) {
        context.addIssue({
          code: 'custom',
          path: ['SMTP_USER'],
          message: 'Production SMTP credentials and sender required.',
        });
      }
      for (const key of ['PUBLIC_WEB_URL', 'STORAGE_ENDPOINT'] as const) {
        if (parseUrl(value[key])?.protocol !== 'https:') {
          context.addIssue({
            code: 'custom',
            path: [key],
            message: 'HTTPS is required in production.',
          });
        }
      }
    }
  });
export type Environment = z.infer<typeof schema>;
export function parseEnvironment(
  input: Record<string, string | undefined>,
): Environment {
  const result = schema.safeParse(input);
  if (!result.success) {
    const keys = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(
      'Invalid environment variables: ' +
        keys.join(', ') +
        '. Check .env.example.',
    );
  }
  return result.data;
}
