import { useEffect, useState } from 'react';
import { ApiError, identityRequest } from './identity-api';
import { classCopy } from './class-copy';
import type { Locale } from './identity-copy';

export type School = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
};
export type ClassSummary = {
  id: string;
  name: string;
  slug: string;
  schoolId: string;
  graduationYear: number;
  motto: string | null;
  school: { name: string };
};
export type ClassDetail = ClassSummary & {
  permissions: { manage: boolean; directory: boolean; contribute: boolean };
  memberCount: number | null;
};
export type Role = 'MEMBER' | 'CLASS_ADMIN' | 'STAFF' | 'GUEST';
export type Member = {
  id: string;
  displayName: string;
  role: Role;
  status: 'ACTIVE' | 'REMOVED';
  joinedAt: string;
};
export type Invitation = {
  id: string;
  role: Role;
  status: 'ACTIVE' | 'REVOKED';
  expiresAt: string;
  usedCount: number;
  maxUses: number;
};
export type InvitationSecret = Invitation & { code: string; url: string };
export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};
// These response types describe this application's own REST contract. Invalid/failed
// responses still enter the visible error boundary; server input validation is authoritative.
export async function classRequest<T>(
  path: string,
  body?: object,
  method = body ? 'POST' : 'GET',
  signal?: AbortSignal,
): Promise<T> {
  return (await identityRequest(path, body, method, signal)) as T;
}
export function classError(error: unknown, locale: Locale) {
  const t = classCopy[locale];
  if (!(error instanceof ApiError)) return t.error;
  return (
    (
      {
        400: t.invalid,
        401: t.signIn,
        403: t.denied,
        404: t.denied,
        409: t.conflict,
        429: t.limited,
      } as Record<number, string>
    )[error.status] ?? t.error
  );
}
export function useResource<T>(path: string) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    path: string;
    data?: T;
    error?: unknown;
  }>({ path });
  useEffect(() => {
    const controller = new AbortController();
    void classRequest<T>(path, undefined, 'GET', controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ path, data });
      },
      (error) => {
        if (!controller.signal.aborted) setState({ path, error });
      },
    );
    return () => controller.abort();
  }, [path, version]);
  const reload = () => {
    setState({ path });
    setVersion((value) => value + 1);
  };
  return { ...(state.path === path ? state : { path }), reload };
}
