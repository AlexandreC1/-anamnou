import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { identityRequest } from './identity-api';
import type { Locale } from './identity-copy';
import { MfaSettings } from './MfaSettings';

export const securityLabels = {
  en: {
    title: 'Account security',
    intro: 'Review active sessions and sign out of devices you no longer use.',
    current: 'This session',
    other: 'Another session',
    revoke: 'Sign out',
    all: 'Sign out everywhere',
    loading: 'Loading sessions…',
    error: 'Sessions could not be loaded. Try again.',
    retry: 'Try again',
    saved: 'Session signed out.',
    created: 'Signed in',
    seen: 'Last active',
  },
  fr: {
    title: 'Sécurité du compte',
    intro:
      'Consultez vos sessions actives et déconnectez les appareils que vous ne reconnaissez pas.',
    current: 'Cette session',
    other: 'Autre session',
    revoke: 'Déconnecter',
    all: 'Déconnecter partout',
    loading: 'Chargement des sessions…',
    error: 'Impossible de charger les sessions. Réessayez.',
    retry: 'Réessayer',
    saved: 'Session déconnectée.',
    created: 'Connexion',
    seen: 'Dernière activité',
  },
  ht: {
    title: 'Sekirite kont',
    intro: 'Gade sesyon aktif yo epi dekonekte aparèy ou pa itilize ankò.',
    current: 'Sesyon sa a',
    other: 'Yon lòt sesyon',
    revoke: 'Dekonekte',
    all: 'Dekonekte tout kote',
    loading: 'N ap chaje sesyon yo…',
    error: 'Sesyon yo pa chaje. Eseye ankò.',
    retry: 'Eseye ankò',
    saved: 'Sesyon dekonekte.',
    created: 'Konekte',
    seen: 'Dènye aktivite',
  },
  es: {
    title: 'Seguridad de la cuenta',
    intro: 'Revisa tus sesiones activas y cierra las que ya no utilizas.',
    current: 'Esta sesión',
    other: 'Otra sesión',
    revoke: 'Cerrar sesión',
    all: 'Cerrar todas las sesiones',
    loading: 'Cargando sesiones…',
    error: 'No se pudieron cargar las sesiones. Inténtalo de nuevo.',
    retry: 'Reintentar',
    saved: 'Sesión cerrada.',
    created: 'Inicio de sesión',
    seen: 'Última actividad',
  },
};
type Session = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};
function readSessions(value: unknown): Session[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (item) =>
        !item ||
        typeof item.id !== 'string' ||
        typeof item.createdAt !== 'string' ||
        typeof item.lastSeenAt !== 'string' ||
        typeof item.current !== 'boolean' ||
        !Number.isFinite(Date.parse(item.createdAt)) ||
        !Number.isFinite(Date.parse(item.lastSeenAt)),
    )
  )
    throw new Error('Invalid sessions');
  return value as Session[];
}
export function SecuritySettings({ locale }: { locale: Locale }) {
  const t = securityLabels[locale];
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void identityRequest('/me/sessions', undefined, 'GET', controller.signal)
      .then((value) => {
        setSessions(readSessions(value));
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt]);
  async function revoke(session?: Session) {
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      await identityRequest(
        '/me/sessions/revoke',
        session ? { id: session.id } : {},
      );
      if (!session || session.current) navigate('/login');
      else {
        setSessions(
          (current) =>
            current?.filter((item) => item.id !== session.id) ?? null,
        );
        setSaved(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="appearance-settings">
      <div className="appearance-heading">
        <p className="eyebrow">Anamnou</p>
        <h1>{t.title}</h1>
        <p className="intro">{t.intro}</p>
      </div>
      <div className="theme-panel">
        {error && (
          <p role="alert">
            {t.error}{' '}
            <button onClick={() => setAttempt((value) => value + 1)}>
              {t.retry}
            </button>
          </p>
        )}
        {!sessions && !error && <p role="status">{t.loading}</p>}
        {sessions?.map((session) => (
          <div className="session-row" key={session.id}>
            <div>
              <strong>{session.current ? t.current : t.other}</strong>
              <p>
                {t.created}:{' '}
                {new Date(session.createdAt).toLocaleString(locale)}
                <br />
                {t.seen}: {new Date(session.lastSeenAt).toLocaleString(locale)}
              </p>
            </div>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => void revoke(session)}
            >
              {t.revoke}
            </button>
          </div>
        ))}
        {saved && <p role="status">{t.saved}</p>}
        {sessions && (
          <button disabled={busy} onClick={() => void revoke()}>
            {t.all}
          </button>
        )}
      </div>
      <MfaSettings locale={locale} />
    </section>
  );
}
