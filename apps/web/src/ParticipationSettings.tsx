import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { classRequest, useResource } from './class-api';
import { LoadState } from './ClassCommon';
import type { Locale } from './identity-copy';
import { participationCopy } from './participation-copy';

type Authorization = {
  id: string;
  policyId: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'WITHDRAWN';
  version: number;
  expiresAt: string | null;
};
type Membership = {
  id: string;
  class: { id: string; name: string; schoolId: string };
  participation: Authorization | null;
};
type Policy = {
  id: string;
  version: number;
  notice: string;
  jurisdiction: string;
  expiresAt: string;
};

export function ParticipationSettings({ locale }: { locale: Locale }) {
  const t = participationCopy[locale];
  const result = useResource<Membership[]>('/me/participation');
  return (
    <section className="appearance-settings">
      <p className="eyebrow">Anamnou</p>
      <h1>{t.title}</h1>
      <p className="intro">{t.intro}</p>
      <Link to="/profile">{t.back}</Link>
      <button type="button" onClick={result.reload}>
        {t.refresh}
      </button>
      {!result.data ? (
        <LoadState locale={locale} error={result.error} retry={result.reload} />
      ) : result.data.length === 0 ? (
        <p>{t.empty}</p>
      ) : (
        result.data.map((member) => (
          <ParticipationCard
            key={member.id + ':' + (member.participation?.version ?? 0)}
            member={member}
            locale={locale}
            refresh={result.reload}
          />
        ))
      )}
    </section>
  );
}
function ParticipationCard({
  member,
  locale,
  refresh,
}: {
  member: Membership;
  locale: Locale;
  refresh: () => void;
}) {
  const t = participationCopy[locale];
  const policies = useResource<Policy[]>(
    '/me/participation/' + member.id + '/policies',
  );
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(Date.now);
  const controller = useRef<AbortController | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(timer);
      controller.current?.abort();
    };
  }, []);
  const current = member.participation;
  const policy = policies.data?.find((p) => p.id === selected);
  const expired =
    current?.status === 'APPROVED' &&
    (!current.expiresAt ||
      Date.parse(current.expiresAt) <= now ||
      (policies.data !== undefined &&
        !policies.data.some((p) => p.id === current.policyId)));
  const status = !current
    ? t.missing
    : expired
      ? t.expired
      : {
          PENDING: t.pending,
          APPROVED: t.approved,
          DENIED: t.denied,
          WITHDRAWN: t.withdrawn,
        }[current.status];
  async function submit(event: FormEvent<HTMLFormElement>, withdraw: boolean) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailed(false);
    const active = new AbortController();
    controller.current = active;
    try {
      await classRequest(
        '/me/participation/' +
          member.id +
          (withdraw ? '/withdraw' : '/request'),
        withdraw
          ? { version: current!.version }
          : { version: current?.version ?? 0, policyId: selected },
        'POST',
        active.signal,
      );
      if (!active.signal.aborted) refresh();
    } catch {
      if (!active.signal.aborted) setFailed(true);
    } finally {
      lock.current = false;
      if (!active.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="theme-panel">
      <h2>{member.class.name}</h2>
      <p role="status">{status}</p>
      {current?.expiresAt && (
        <p>
          {t.expires}: {new Date(current.expiresAt).toLocaleString(locale)}
        </p>
      )}
      {failed && <p role="alert">{t.failed}</p>}
      {!policies.data ? (
        <LoadState
          locale={locale}
          error={policies.error}
          retry={policies.reload}
        />
      ) : (
        <>
          {(!current ||
            expired ||
            ['DENIED', 'WITHDRAWN'].includes(current.status)) &&
            (policies.data.length === 0 ? (
              <p>{t.noPolicy}</p>
            ) : (
              <form
                className="account-form"
                onSubmit={(e) => void submit(e, false)}
              >
                <fieldset disabled={busy}>
                  <label>
                    {t.choose}
                    <select
                      value={selected}
                      required
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      <option value="">{t.choose}</option>
                      {policies.data.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.jurisdiction} · {p.version}
                        </option>
                      ))}
                    </select>
                  </label>
                  {policy && (
                    <article>
                      <h3>{t.notice}</h3>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{policy.notice}</p>
                    </article>
                  )}
                  <button disabled={!policy || busy}>{t.request}</button>
                </fieldset>
              </form>
            ))}
          {current && current.status !== 'WITHDRAWN' && (
            <form
              className="account-form"
              onSubmit={(e) => void submit(e, true)}
            >
              <fieldset disabled={busy}>
                <p>{t.warning}</p>
                <label>
                  <input type="checkbox" required />
                  {t.confirm}
                </label>
                <button>{t.withdraw}</button>
              </fieldset>
            </form>
          )}
        </>
      )}
    </section>
  );
}
