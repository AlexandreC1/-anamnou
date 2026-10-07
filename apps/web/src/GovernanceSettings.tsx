import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router';
import { classRequest, classError, useResource } from './class-api';
import { LoadState } from './ClassCommon';
import { ApiError } from './identity-api';
import { classCopy } from './class-copy';
import { governanceCopy } from './governance-copy';
import type { Locale } from './identity-copy';

export type GovernanceRole =
  | 'QUEUE_MANAGER'
  | 'CONSENT_REVIEWER'
  | 'SAFEGUARDING_REVIEWER'
  | 'PRIVACY_REVIEWER'
  | 'AUDITOR';
export type Grant = {
  id: string;
  schoolId: string;
  userId: string;
  role: GovernanceRole;
  status: 'REQUESTED' | 'ACTIVE' | 'REVOKED';
  expiresAt: string;
  requestedById: string;
};
type Queue = {
  id: string;
  schoolId: string;
  name: string;
  role: GovernanceRole;
  primaryGrantId: string;
  backupGrantId: string;
  version: number;
  primaryAvailable: boolean;
  backupAvailable: boolean;
  covered: boolean;
};
type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  permissions?: { manageQueues: boolean };
};
const roles: GovernanceRole[] = [
  'QUEUE_MANAGER',
  'CONSENT_REVIEWER',
  'SAFEGUARDING_REVIEWER',
  'PRIVACY_REVIEWER',
  'AUDITOR',
];
const uuidPattern =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
function roleName(role: GovernanceRole, locale: Locale) {
  const t = governanceCopy[locale];
  return {
    QUEUE_MANAGER: t.queueManager,
    CONSENT_REVIEWER: t.consent,
    SAFEGUARDING_REVIEWER: t.safeguarding,
    PRIVACY_REVIEWER: t.privacy,
    AUDITOR: t.auditor,
  }[role];
}
function statusName(grant: Grant, locale: Locale, now: number) {
  const t = governanceCopy[locale];
  return grant.status === 'REVOKED'
    ? t.revoked
    : Date.parse(grant.expiresAt) <= now
      ? t.expired
      : grant.status === 'REQUESTED'
        ? t.requested
        : t.active;
}
function Identifier({
  label,
  name,
  value,
  list,
}: {
  label: string;
  name: string;
  value?: string;
  list?: string;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value ?? ''}
        pattern={uuidPattern}
        required
        maxLength={36}
        list={list}
        autoComplete="off"
      />
    </label>
  );
}
function RoleSelect({
  locale,
  reviewOnly = false,
  value,
}: {
  locale: Locale;
  reviewOnly?: boolean;
  value?: GovernanceRole;
}) {
  return (
    <label>
      {governanceCopy[locale].role}
      <select
        name="role"
        defaultValue={
          value ?? (reviewOnly ? 'CONSENT_REVIEWER' : 'QUEUE_MANAGER')
        }
      >
        {roles
          .filter((role) => !reviewOnly || role.endsWith('_REVIEWER'))
          .map((role) => (
            <option key={role} value={role}>
              {roleName(role, locale)}
            </option>
          ))}
      </select>
    </label>
  );
}

export function GovernanceAction({
  locale,
  path,
  method = 'POST',
  label,
  body,
  done,
  children,
}: {
  locale: Locale;
  path: string;
  method?: string;
  label: string;
  body: (data: FormData) => object;
  done: () => void;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const proof = {
      password: String(data.get('password') ?? ''),
      code: String(data.get('code') ?? '').trim(),
    };
    // Credentials never enter React state or persistent storage and are cleared
    // even after rejection. Keep the non-secret draft available for correction.
    for (const name of ['password', 'code']) {
      const input = form.elements.namedItem(name);
      if (input instanceof HTMLInputElement) input.value = '';
    }
    const current = new AbortController();
    controller.current = current;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      await classRequest(
        path,
        { ...body(data), ...proof },
        method,
        current.signal,
      );
      if (!current.signal.aborted) {
        setSaved(true);
        done();
      }
    } catch (caught) {
      if (!current.signal.aborted) setError(caught);
    } finally {
      lock.current = false;
      if (!current.signal.aborted) setBusy(false);
    }
  }
  const t = governanceCopy[locale];
  return (
    <form
      className="account-form governance-action"
      aria-busy={busy}
      onChange={() => setSaved(false)}
      onSubmit={(event) => void submit(event)}
    >
      <fieldset className="resource-fields" disabled={busy}>
        {children}
        <p className="governance-help">{t.proof}</p>
        <label>
          {t.password}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        <label>
          {t.code}
          <input
            name="code"
            autoComplete="one-time-code"
            required
            maxLength={64}
          />
        </label>
      </fieldset>
      {error !== undefined && (
        <div role="alert">
          <p>
            {error instanceof ApiError && error.status === 409
              ? t.conflict
              : error instanceof ApiError && [401, 403].includes(error.status)
                ? t.denied
                : classError(error, locale)}
          </p>
          {error instanceof ApiError && error.status === 409 && (
            <button type="button" onClick={done}>
              {t.refresh}
            </button>
          )}
        </div>
      )}
      {(busy || saved) && (
        <p role="status">
          {busy ? classCopy[locale].busy : classCopy[locale].saved}
        </p>
      )}
      <button disabled={busy}>{busy ? classCopy[locale].busy : label}</button>
    </form>
  );
}

function PageControls({
  next,
  cursors,
  change,
  locale,
}: {
  next: string | null;
  cursors: string[];
  change: (value: string[]) => void;
  locale: Locale;
}) {
  const t = governanceCopy[locale];
  return (
    <nav className="class-actions" aria-label={classCopy[locale].page}>
      <button
        type="button"
        disabled={cursors.length === 0}
        onClick={() => change(cursors.slice(0, -1))}
      >
        {t.previous}
      </button>
      <button
        type="button"
        disabled={!next}
        onClick={() => next && change([...cursors, next])}
      >
        {t.next}
      </button>
    </nav>
  );
}

export function GovernanceSettings({ locale }: { locale: Locale }) {
  const t = governanceCopy[locale];
  const account = useResource<{ id: string; role: string }>('/me');
  const own = useResource<Grant[]>('/me/governance/grants');
  const [school, setSchool] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  function refresh() {
    account.reload();
    own.reload();
  }
  return (
    <section className="appearance-settings governance-settings">
      <p className="eyebrow">Anamnou</p>
      <h1>{t.title}</h1>
      <p className="intro">{t.intro}</p>
      <p>{t.boundary}</p>
      <Link to="/settings/security">{t.security}</Link>
      {!account.data || !own.data ? (
        <LoadState
          locale={locale}
          error={account.error ?? own.error}
          retry={refresh}
        />
      ) : (
        <>
          <section className="theme-panel">
            <h2>{t.own}</h2>
            <p>
              {t.accountId}: <code>{account.data.id}</code>
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={refresh}
            >
              {t.refresh}
            </button>
            {own.data.length === 0 && <p>{t.empty}</p>}
            <ul className="governance-list">
              {own.data.map((grant) => (
                <li key={grant.id}>
                  <strong>{roleName(grant.role, locale)}</strong>
                  <p>
                    {statusName(grant, locale, now)} · {t.expires}:{' '}
                    {new Date(grant.expiresAt).toLocaleString(locale)}
                  </p>
                  <p>
                    {t.scope}: <code>{grant.schoolId}</code>
                  </p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSchool(grant.schoolId)}
                  >
                    {t.open}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <form
            className="account-form theme-panel"
            onSubmit={(event) => {
              event.preventDefault();
              setSchool(
                String(new FormData(event.currentTarget).get('schoolId')),
              );
            }}
          >
            <Identifier label={t.scope} name="schoolId" />
            <button>{t.open}</button>
          </form>
          {school && (
            <SchoolReviews
              key={school}
              schoolId={school}
              locale={locale}
              actor={account.data}
              now={now}
              refreshOwn={own.reload}
            />
          )}
        </>
      )}
    </section>
  );
}

function SchoolReviews({
  schoolId,
  locale,
  actor,
  now,
  refreshOwn,
}: {
  schoolId: string;
  locale: Locale;
  actor: { id: string; role: string };
  now: number;
  refreshOwn: () => void;
}) {
  const t = governanceCopy[locale];
  const [grantCursors, setGrantCursors] = useState<string[]>([]);
  const [queueCursors, setQueueCursors] = useState<string[]>([]);
  const query = '?schoolId=' + encodeURIComponent(schoolId);
  const grants = useResource<CursorPage<Grant>>(
    '/governance/grants' +
      query +
      (grantCursors.length ? '&cursor=' + grantCursors.at(-1) : ''),
  );
  const queues = useResource<CursorPage<Queue>>(
    '/governance/queues' +
      query +
      (queueCursors.length ? '&cursor=' + queueCursors.at(-1) : ''),
  );
  const platform = actor.role === 'PLATFORM_ADMIN';
  const manager = queues.data?.permissions?.manageQueues === true;
  function refresh() {
    grants.reload();
    queues.reload();
    refreshOwn();
  }
  if (!grants.data || !queues.data)
    return (
      <LoadState
        locale={locale}
        error={grants.error ?? queues.error}
        retry={refresh}
      />
    );
  return (
    <div className="governance-scope">
      <p>
        {t.scope}: <code>{schoolId}</code>
      </p>
      <button type="button" onClick={refresh}>
        {t.refresh}
      </button>
      {platform && (
        <section className="theme-panel">
          <h2>{t.proposal}</h2>
          <GovernanceAction
            locale={locale}
            path="/governance/grants"
            label={t.propose}
            done={refresh}
            body={(data) => ({
              schoolId,
              userId: data.get('userId'),
              role: data.get('role'),
              expiresInDays: Number(data.get('expiresInDays')),
            })}
          >
            <Identifier label={t.recipient} name="userId" />
            <RoleSelect locale={locale} />
            <label>
              {t.days}
              <input
                type="number"
                name="expiresInDays"
                defaultValue={30}
                required
                min={1}
                max={90}
              />
            </label>
          </GovernanceAction>
        </section>
      )}
      <section className="theme-panel">
        <h2>{t.grants}</h2>
        <ul className="governance-list">
          {grants.data.items.map((grant) => (
            <li key={grant.id}>
              <h3>{roleName(grant.role, locale)}</h3>
              <p>
                {statusName(grant, locale, now)} · {t.expires}:{' '}
                {new Date(grant.expiresAt).toLocaleString(locale)}
              </p>
              <p>
                {t.recipient}: <code>{grant.userId}</code>
              </p>
              <code>{grant.id}</code>
              {platform && grant.status !== 'REVOKED' && (
                <>
                  {grant.status === 'REQUESTED' &&
                    Date.parse(grant.expiresAt) > now &&
                    grant.requestedById !== actor.id &&
                    grant.userId !== actor.id && (
                      <Decision
                        grant={grant}
                        approve
                        locale={locale}
                        done={refresh}
                      />
                    )}
                  <Decision
                    grant={grant}
                    approve={false}
                    locale={locale}
                    done={refresh}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        <PageControls
          locale={locale}
          next={grants.data.nextCursor}
          cursors={grantCursors}
          change={setGrantCursors}
        />
      </section>
      <section className="theme-panel">
        <h2>{t.queues}</h2>
        <p>{t.coverage}</p>
        {queues.data.items.length === 0 && <p>{classCopy[locale].empty}</p>}
        <ul className="governance-list">
          {queues.data.items.map((queue) => (
            <li key={queue.id}>
              <h3>{queue.name}</h3>
              <p>{roleName(queue.role, locale)}</p>
              <p
                className={
                  queue.covered ? 'governance-covered' : 'governance-uncovered'
                }
              >
                {queue.covered ? t.covered : t.uncovered}
              </p>
              {!queue.primaryAvailable && <p>{t.primaryMissing}</p>}
              {!queue.backupAvailable && <p>{t.backupMissing}</p>}
              {manager && (
                <QueueForm
                  key={queue.id + ':' + queue.version}
                  schoolId={schoolId}
                  locale={locale}
                  grants={grants.data!.items}
                  now={now}
                  queue={queue}
                  done={refresh}
                />
              )}
            </li>
          ))}
        </ul>
        <PageControls
          locale={locale}
          next={queues.data.nextCursor}
          cursors={queueCursors}
          change={setQueueCursors}
        />
      </section>
      {manager && (
        <section className="theme-panel">
          <h2>{t.queue}</h2>
          <QueueForm
            schoolId={schoolId}
            locale={locale}
            grants={grants.data.items}
            now={now}
            done={refresh}
          />
        </section>
      )}
    </div>
  );
}
function Decision({
  grant,
  approve,
  locale,
  done,
}: {
  grant: Grant;
  approve: boolean;
  locale: Locale;
  done: () => void;
}) {
  const t = governanceCopy[locale];
  return (
    <details>
      <summary>{approve ? t.approve : t.revoke}</summary>
      <GovernanceAction
        locale={locale}
        path={
          '/governance/grants/' + grant.id + (approve ? '/approve' : '/revoke')
        }
        label={approve ? t.approve : t.revoke}
        done={done}
        body={(data) => ({ reason: data.get('reason') })}
      >
        <label>
          {t.reason}
          <textarea name="reason" required minLength={20} maxLength={500} />
        </label>
      </GovernanceAction>
    </details>
  );
}
function QueueForm({
  schoolId,
  locale,
  queue,
  grants,
  now,
  done,
}: {
  schoolId: string;
  locale: Locale;
  queue?: Queue;
  grants: Grant[];
  now: number;
  done: () => void;
}) {
  const t = governanceCopy[locale];
  const list = 'reviewer-grants-' + (queue?.id ?? 'new');
  return (
    <GovernanceAction
      locale={locale}
      path={queue ? '/governance/queues/' + queue.id : '/governance/queues'}
      method={queue ? 'PATCH' : 'POST'}
      label={queue ? t.update : t.create}
      done={done}
      body={(data) => ({
        ...(queue ? { version: queue.version } : { schoolId }),
        name: data.get('name'),
        role: data.get('role'),
        primaryGrantId: data.get('primaryGrantId'),
        backupGrantId: data.get('backupGrantId'),
      })}
    >
      <label>
        {t.name}
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={queue?.name ?? ''}
        />
      </label>
      <RoleSelect locale={locale} reviewOnly value={queue?.role} />
      <Identifier
        name="primaryGrantId"
        label={t.primary}
        value={queue?.primaryGrantId}
        list={list}
      />
      <Identifier
        name="backupGrantId"
        label={t.backup}
        value={queue?.backupGrantId}
        list={list}
      />
      <datalist id={list}>
        {grants
          .filter(
            (grant) =>
              grant.status === 'ACTIVE' &&
              Date.parse(grant.expiresAt) > now &&
              grant.role.endsWith('_REVIEWER'),
          )
          .map((grant) => (
            <option key={grant.id} value={grant.id}>
              {roleName(grant.role, locale)} · {grant.userId}
            </option>
          ))}
      </datalist>
    </GovernanceAction>
  );
}
