import { apiFetch } from './api-transport';

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super('Request failed');
  }
}
export async function identityRequest(
  path: string,
  body?: object,
  method = 'POST',
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await apiFetch(path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
      : AbortSignal.timeout(12000),
    ...(body
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json();
}
export type Account = {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  emailVerified: boolean;
};
export function readAccount(value: unknown): Account {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !('email' in value) ||
    typeof value.email !== 'string' ||
    !('displayName' in value) ||
    typeof value.displayName !== 'string' ||
    !('locale' in value) ||
    typeof value.locale !== 'string' ||
    !('emailVerified' in value) ||
    value.emailVerified !== true
  )
    throw new Error('Invalid account response');
  return {
    id: value.id,
    email: value.email,
    displayName: value.displayName,
    locale: value.locale,
    emailVerified: true,
  };
}
