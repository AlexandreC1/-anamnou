import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, identityRequest } from './identity-api';
import type { Locale } from './identity-copy';

const en = {
  title: 'Two-step verification',
  intro:
    'Protect your account with a six-digit code from an authenticator app each time you sign in.',
  on: 'Two-step verification is on.',
  off: 'Two-step verification is off.',
  remaining: 'Unused recovery codes',
  password: 'Current password',
  code: 'Authenticator or recovery code',
  start: 'Set up two-step verification',
  scan: 'Scan this code with your authenticator app, or enter the setup key manually. Then enter the six-digit code it shows.',
  key: 'Setup key',
  qr: 'QR code for your authenticator app',
  confirm: 'Turn on',
  disable: 'Turn off',
  regenerate: 'Create new recovery codes',
  codesTitle: 'Save your recovery codes',
  codesIntro:
    'Each code works once if you lose your authenticator. Store them somewhere private. They will not be shown again.',
  done: 'I saved these codes',
  loading: 'Loading…',
  error:
    'This request could not be completed. Check the details and try again.',
  denied: 'The password is incorrect.',
  limited: 'Too many attempts. Wait 15 minutes before trying again.',
  busy: 'Please wait…',
  retry: 'Try again',
};
type MfaCopy = typeof en;
const mfaCopy: Record<Locale, MfaCopy> = {
  en,
  fr: {
    title: 'Validation en deux étapes',
    intro:
      'Protégez votre compte avec un code à six chiffres généré par une application d’authentification à chaque connexion.',
    on: 'La validation en deux étapes est activée.',
    off: 'La validation en deux étapes est désactivée.',
    remaining: 'Codes de récupération inutilisés',
    password: 'Mot de passe actuel',
    code: 'Code d’authentification ou de récupération',
    start: 'Configurer la validation en deux étapes',
    scan: 'Scannez ce code avec votre application d’authentification ou saisissez la clé manuellement, puis entrez le code à six chiffres affiché.',
    key: 'Clé de configuration',
    qr: 'Code QR pour votre application d’authentification',
    confirm: 'Activer',
    disable: 'Désactiver',
    regenerate: 'Créer de nouveaux codes de récupération',
    codesTitle: 'Conservez vos codes de récupération',
    codesIntro:
      'Chaque code fonctionne une seule fois si vous perdez votre application. Gardez-les en lieu sûr. Ils ne seront plus affichés.',
    done: 'J’ai conservé ces codes',
    loading: 'Chargement…',
    error:
      'Impossible de terminer cette demande. Vérifiez les informations et réessayez.',
    denied: 'Le mot de passe est incorrect.',
    limited: 'Trop de tentatives. Attendez 15 minutes avant de réessayer.',
    busy: 'Veuillez patienter…',
    retry: 'Réessayer',
  },
  ht: {
    title: 'Verifikasyon an de etap',
    intro:
      'Pwoteje kont ou ak yon kòd sis chif ki soti nan yon aplikasyon otantifikasyon chak fwa ou konekte.',
    on: 'Verifikasyon an de etap aktive.',
    off: 'Verifikasyon an de etap pa aktive.',
    remaining: 'Kòd rekiperasyon ki poko sèvi',
    password: 'Modpas ou kounye a',
    code: 'Kòd otantifikasyon oswa kòd rekiperasyon',
    start: 'Mete verifikasyon an de etap',
    scan: 'Eskane kòd sa a ak aplikasyon otantifikasyon ou, oswa tape kle a. Apre sa, antre kòd sis chif li montre a.',
    key: 'Kle konfigirasyon',
    qr: 'Kòd QR pou aplikasyon otantifikasyon ou',
    confirm: 'Aktive',
    disable: 'Dezaktive',
    regenerate: 'Kreye nouvo kòd rekiperasyon',
    codesTitle: 'Sere kòd rekiperasyon ou yo',
    codesIntro:
      'Chak kòd mache yon sèl fwa si ou pèdi aplikasyon an. Sere yo yon kote prive. Yo p ap parèt ankò.',
    done: 'Mwen sere kòd yo',
    loading: 'N ap chaje…',
    error: 'Demann sa a pa t ka fèt. Verifye enfòmasyon yo epi eseye ankò.',
    denied: 'Modpas la pa kòrèk.',
    limited: 'Twòp tantativ. Tann 15 minit anvan ou eseye ankò.',
    busy: 'Tanpri tann…',
    retry: 'Eseye ankò',
  },
  es: {
    title: 'Verificación en dos pasos',
    intro:
      'Protege tu cuenta con un código de seis dígitos de una aplicación de autenticación cada vez que inicies sesión.',
    on: 'La verificación en dos pasos está activada.',
    off: 'La verificación en dos pasos está desactivada.',
    remaining: 'Códigos de recuperación sin usar',
    password: 'Contraseña actual',
    code: 'Código de autenticación o de recuperación',
    start: 'Configurar la verificación en dos pasos',
    scan: 'Escanea este código con tu aplicación de autenticación o introduce la clave manualmente. Después escribe el código de seis dígitos que muestra.',
    key: 'Clave de configuración',
    qr: 'Código QR para tu aplicación de autenticación',
    confirm: 'Activar',
    disable: 'Desactivar',
    regenerate: 'Crear nuevos códigos de recuperación',
    codesTitle: 'Guarda tus códigos de recuperación',
    codesIntro:
      'Cada código funciona una vez si pierdes tu aplicación. Guárdalos en un lugar privado. No se volverán a mostrar.',
    done: 'Ya guardé estos códigos',
    loading: 'Cargando…',
    error:
      'No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo.',
    denied: 'La contraseña es incorrecta.',
    limited:
      'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.',
    busy: 'Espera…',
    retry: 'Reintentar',
  },
};

type Status = { enabled: boolean; recoveryCodesRemaining: number };
function readStatus(value: unknown): Status {
  if (
    !value ||
    typeof value !== 'object' ||
    !('enabled' in value) ||
    typeof value.enabled !== 'boolean' ||
    !('recoveryCodesRemaining' in value) ||
    typeof value.recoveryCodesRemaining !== 'number'
  )
    throw new Error('Invalid MFA status');
  return {
    enabled: value.enabled,
    recoveryCodesRemaining: value.recoveryCodesRemaining,
  };
}
function readCodes(value: unknown): string[] {
  if (
    !value ||
    typeof value !== 'object' ||
    !('recoveryCodes' in value) ||
    !Array.isArray(value.recoveryCodes) ||
    !value.recoveryCodes.every((code) => typeof code === 'string')
  )
    throw new Error('Invalid recovery codes');
  return value.recoveryCodes as string[];
}

export function MfaSettings({ locale }: { locale: Locale }) {
  const t = mfaCopy[locale];
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(
    null,
  );
  const [qr, setQr] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void identityRequest('/me/mfa', undefined, 'GET', controller.signal)
      .then((value) => {
        setStatus(readStatus(value));
        setError('');
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t.error);
      });
    return () => controller.abort();
  }, [attempt, t.error]);
  useEffect(() => {
    if (!setup) return;
    let active = true;
    void import('qrcode')
      .then((module) => module.toDataURL(setup.uri, { width: 224, margin: 1 }))
      .then((url) => {
        if (active) setQr(url);
      })
      .catch(() => {
        // The manual setup key below remains available without the image.
        if (active) setQr('');
      });
    return () => {
      active = false;
    };
  }, [setup]);
  function failure(caught: unknown) {
    setError(
      caught instanceof ApiError
        ? caught.status === 429
          ? t.limited
          : caught.status === 401
            ? t.denied
            : t.error
        : t.error,
    );
  }
  async function run(
    event: FormEvent<HTMLFormElement>,
    action: (data: FormData) => Promise<void>,
  ) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    try {
      await action(new FormData(form));
      form.reset();
    } catch (caught) {
      failure(caught);
    } finally {
      setBusy(false);
    }
  }
  const field = (data: FormData, name: string) => String(data.get(name) ?? '');
  const passwordInput = (
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
  );
  const codeInput = (
    <label>
      {t.code}
      <input
        name="code"
        autoComplete="one-time-code"
        inputMode="text"
        required
        maxLength={19}
        spellCheck={false}
      />
    </label>
  );
  return (
    <section className="theme-panel mfa-settings" aria-labelledby="mfa-title">
      <h2 id="mfa-title">{t.title}</h2>
      <p>{t.intro}</p>
      {error && (
        <p role="alert">
          {error}{' '}
          {!status && (
            <button onClick={() => setAttempt((value) => value + 1)}>
              {t.retry}
            </button>
          )}
        </p>
      )}
      {!status && !error && <p role="status">{t.loading}</p>}
      {codes ? (
        <div className="mfa-codes">
          <h3>{t.codesTitle}</h3>
          <p>{t.codesIntro}</p>
          <ul>
            {codes.map((code) => (
              <li key={code}>
                <code>{code}</code>
              </li>
            ))}
          </ul>
          <button onClick={() => setCodes(null)}>{t.done}</button>
        </div>
      ) : status?.enabled ? (
        <>
          <p role="status">
            {t.on} {t.remaining}: {status.recoveryCodesRemaining}
          </p>
          <form
            className="account-form"
            aria-label={t.regenerate}
            onSubmit={(event) =>
              void run(event, async (data) => {
                const next = readCodes(
                  await identityRequest('/me/mfa/recovery-codes', {
                    password: field(data, 'password'),
                    code: field(data, 'code'),
                  }),
                );
                setCodes(next);
                setStatus({
                  enabled: true,
                  recoveryCodesRemaining: next.length,
                });
              })
            }
          >
            {passwordInput}
            {codeInput}
            <button disabled={busy}>{busy ? t.busy : t.regenerate}</button>
          </form>
          <form
            className="account-form"
            aria-label={t.disable}
            onSubmit={(event) =>
              void run(event, async (data) => {
                await identityRequest('/me/mfa/disable', {
                  password: field(data, 'password'),
                  code: field(data, 'code'),
                });
                setStatus({ enabled: false, recoveryCodesRemaining: 0 });
              })
            }
          >
            {passwordInput}
            {codeInput}
            <button className="secondary-button" disabled={busy}>
              {busy ? t.busy : t.disable}
            </button>
          </form>
        </>
      ) : status && setup ? (
        <form
          className="account-form"
          aria-label={t.confirm}
          onSubmit={(event) =>
            void run(event, async (data) => {
              const next = readCodes(
                await identityRequest('/me/mfa/enable', {
                  code: field(data, 'code'),
                }),
              );
              setSetup(null);
              setCodes(next);
              setStatus({ enabled: true, recoveryCodesRemaining: next.length });
            })
          }
        >
          <p>{t.scan}</p>
          {qr && <img width={224} height={224} src={qr} alt={t.qr} />}
          <p>
            {t.key}: <code className="mfa-key">{setup.secret}</code>
          </p>
          <label>
            {t.code}
            <input
              name="code"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              maxLength={6}
            />
          </label>
          <button disabled={busy}>{busy ? t.busy : t.confirm}</button>
        </form>
      ) : status ? (
        <>
          <p role="status">{t.off}</p>
          <form
            className="account-form"
            aria-label={t.start}
            onSubmit={(event) =>
              void run(event, async (data) => {
                const value = await identityRequest('/me/mfa/setup', {
                  password: field(data, 'password'),
                });
                if (
                  !value ||
                  typeof value !== 'object' ||
                  !('secret' in value) ||
                  typeof value.secret !== 'string' ||
                  !('uri' in value) ||
                  typeof value.uri !== 'string' ||
                  !value.uri.startsWith('otpauth://totp/')
                )
                  throw new Error('Invalid setup response');
                setSetup({ secret: value.secret, uri: value.uri });
              })
            }
          >
            {passwordInput}
            <button disabled={busy}>{busy ? t.busy : t.start}</button>
          </form>
        </>
      ) : null}
    </section>
  );
}
