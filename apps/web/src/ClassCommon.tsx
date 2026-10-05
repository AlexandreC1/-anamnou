import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { classCopy } from './class-copy';
import { classError, classRequest, type Page, type Role } from './class-api';
import type { Locale } from './identity-copy';

export function LoadState({
  error,
  retry,
  locale,
}: {
  error?: unknown;
  retry: () => void;
  locale: Locale;
}) {
  const t = classCopy[locale];
  return error ? (
    <div role="alert">
      <p>{classError(error, locale)}</p>
      <button onClick={retry}>{t.retry}</button>
      <p>
        <Link to="/login">{t.signIn}</Link>
      </p>
      <Link to="/classes">{t.back}</Link>
    </div>
  ) : (
    <p role="status">{t.loading}</p>
  );
}
export function Pagination({
  value,
  change,
  locale,
}: {
  value: Pick<Page<unknown>, 'page' | 'hasMore'>;
  change: (page: number) => void;
  locale: Locale;
}) {
  const t = classCopy[locale];
  if (value.page === 1 && !value.hasMore) return null;
  return (
    <nav className="class-actions" aria-label={t.page}>
      <button
        className="secondary-button"
        disabled={value.page <= 1}
        onClick={() => change(value.page - 1)}
      >
        {t.previous}
      </button>
      <span>
        {t.page} {value.page}
      </span>
      <button
        className="secondary-button"
        disabled={!value.hasMore}
        onClick={() => change(value.page + 1)}
      >
        {t.next}
      </button>
    </nav>
  );
}
export function RoleOptions({
  locale,
  invite = false,
}: {
  locale: Locale;
  invite?: boolean;
}) {
  return (
    <>
      {(
        [
          'MEMBER',
          'STAFF',
          'GUEST',
          ...(invite ? [] : ['CLASS_ADMIN']),
        ] as Role[]
      ).map((role) => (
        <option key={role} value={role}>
          {roleLabel(role, locale)}
        </option>
      ))}
    </>
  );
}
export function roleLabel(role: Role, locale: Locale) {
  const t = classCopy[locale];
  return {
    MEMBER: t.member,
    CLASS_ADMIN: t.admin,
    STAFF: t.staff,
    GUEST: t.guest,
  }[role];
}
export function ResourceForm({
  path,
  method = 'POST',
  body,
  done,
  children,
  label,
  locale,
}: {
  path: string;
  method?: string;
  body: (data: FormData) => object;
  done?: (result: unknown) => void;
  children: ReactNode;
  label: string;
  locale: Locale;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      const result = await classRequest(path, body(data), method);
      done?.(result);
      setSaved(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="account-form"
      onSubmit={(event) => void submit(event)}
      aria-busy={busy}
    >
      {children}
      {error !== undefined && <p role="alert">{classError(error, locale)}</p>}
      {saved && <p role="status">{classCopy[locale].saved}</p>}
      <button disabled={busy}>{busy ? classCopy[locale].busy : label}</button>
    </form>
  );
}
export function TextField({
  label,
  name,
  value,
  max = 120,
  optional = false,
}: {
  label: string;
  name: string;
  value?: string | null;
  max?: number;
  optional?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value ?? ''}
        required={!optional}
        maxLength={max}
      />
    </label>
  );
}
