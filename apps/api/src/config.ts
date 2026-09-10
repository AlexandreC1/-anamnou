import { z } from 'zod';

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
    API_PORT: z.coerce.number().int().min(1).max(65535),
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
  })
  .superRefine((value, context) => {
    if (value.APP_ENV === 'production') {
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
