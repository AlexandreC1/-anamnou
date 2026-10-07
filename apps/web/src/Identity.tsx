import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { identityCopy, type Locale } from './identity-copy';
import { classCopy } from './class-copy';
import { deliveryCopy } from './delivery-copy';
import { securityLabels } from './SecuritySettings';
import { governanceCopy } from './governance-copy';
import {
  ApiError,
  identityRequest,
  readAccount,
  type Account,
} from './identity-api';

type Mode =
  | 'register'
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'verify-email'
  | 'resend-verification';
function errorCopy(error: unknown, locale: Locale) {
  const t = identityCopy[locale];
  return error instanceof ApiError
    ? error.status === 429
      ? t.limited
      : error.status === 400
        ? t.invalid
        : error.status === 401
          ? t.denied
          : t.error
    : t.error;
}
export function IdentityForm({ mode, locale }: { mode: Mode; locale: Locale }) {
  const t = identityCopy[locale];
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [mfaStep, setMfaStep] = useState(false);
  const delivery = deliveryCopy[locale];
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '',
  );
  const message = useRef<HTMLParagraphElement>(null);
  const tokenMode = mode === 'verify-email' || mode === 'reset-password';
  useEffect(() => {
    if (tokenMode)
      window.history.replaceState(null, '', window.location.pathname);
  }, [tokenMode]);
  useEffect(() => {
    if (error || success) message.current?.focus();
  }, [error, success]);
  const title = {
    register: t.register,
    login: t.login,
    'forgot-password': t.recover,
    'reset-password': t.reset,
    'verify-email': t.verify,
    'resend-verification': t.resend,
  }[mode];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    if (mfaStep) {
      setBusy(true);
      setError('');
      try {
        readAccount(
          await identityRequest('/auth/mfa', {
            code: String(data.get('code') ?? '').trim(),
          }),
        );
        navigate('/profile');
      } catch (caught) {
        setError(
          caught instanceof ApiError && caught.status === 401
            ? t.mfaDenied
            : errorCopy(caught, locale),
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');
    const body =
      mode === 'register'
        ? {
            email,
            password,
            displayName: String(data.get('displayName')),
            locale,
          }
        : mode === 'login'
          ? { email, password }
          : mode === 'verify-email'
            ? { token }
            : mode === 'reset-password'
              ? { token, password }
              : { email };
    setBusy(true);
    setSubmittedEmail(email);
    setError('');
    try {
      const result = await identityRequest('/auth/' + mode, body);
      if (mode === 'login') {
        if (
          result &&
          typeof result === 'object' &&
          'mfaRequired' in result &&
          result.mfaRequired === true
        ) {
          setMfaStep(true);
          return;
        }
        readAccount(result);
        navigate('/profile');
      } else setSuccess(true);
    } catch (caught) {
      setError(errorCopy(caught, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="identity-layout">
      <div className="identity-intro">
        <p className="eyebrow">Anamnou</p>
        <h1>
          {mfaStep
            ? t.mfaTitle
            : success && !tokenMode
              ? delivery.title
              : title}
        </h1>
        <p className="intro">{mfaStep ? t.mfaIntro : t.introduction}</p>
        <p>{t.privacy}</p>
      </div>
      <div className="identity-panel">
        {success ? (
          <div className="delivery-next">
            <p ref={message} tabIndex={-1} role="status">
              {mode === 'verify-email'
                ? t.verified
                : mode === 'reset-password'
                  ? t.resetDone
                  : delivery.received}
            </p>
            {!tokenMode && (
              <>
                <p>
                  <strong>{submittedEmail}</strong>
                </p>
                <p>
                  {mode === 'forgot-password'
                    ? delivery.recovery
                    : delivery.verify}
                </p>
                {import.meta.env.LOCAL_MAIL_INBOX ? (
                  <>
                    <p>{delivery.local}</p>
                    <a
                      className="primary-link"
                      href="http://localhost:8025"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {delivery.inbox}
                    </a>
                  </>
                ) : (
                  <p>{delivery.missing}</p>
                )}
                <button
                  className="secondary-button"
                  onClick={() => setSuccess(false)}
                >
                  {delivery.change}
                </button>
              </>
            )}
          </div>
        ) : mfaStep ? (
          <form
            onSubmit={(event) => void submit(event)}
            className="account-form"
            aria-busy={busy}
          >
            <label>
              {t.mfaCode}
              <input
                name="code"
                autoComplete="one-time-code"
                required
                minLength={6}
                maxLength={19}
                spellCheck={false}
                autoCapitalize="characters"
              />
            </label>
            {error && (
              <p ref={message} tabIndex={-1} role="alert">
                {error}
              </p>
            )}
            <button disabled={busy}>{busy ? t.busy : t.mfaVerify}</button>
          </form>
        ) : tokenMode && !/^[a-f0-9]{64}$/.test(token) ? (
          <p role="alert">{t.missing}</p>
        ) : (
          <form
            onSubmit={(event) => void submit(event)}
            className="account-form"
            aria-busy={busy}
          >
            {mode === 'register' && (
              <label>
                {t.name}
                <input
                  name="displayName"
                  autoComplete="nickname"
                  required
                  maxLength={80}
                />
              </label>
            )}
            {!tokenMode && (
              <label>
                {t.email}
                <input
                  name="email"
                  defaultValue={submittedEmail}
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
            )}
            {['login', 'register', 'reset-password'].includes(mode) && (
              <div>
                <label htmlFor="account-password">{t.password}</label>
                <input
                  id="account-password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  minLength={mode === 'login' ? 1 : 15}
                  maxLength={128}
                  required
                  aria-describedby={
                    mode === 'login' ? undefined : 'password-hint'
                  }
                />
                {mode !== 'login' && (
                  <span id="password-hint" className="field-hint">
                    {t.passwordHint}
                  </span>
                )}
              </div>
            )}
            {error && (
              <p ref={message} tabIndex={-1} role="alert">
                {error}
              </p>
            )}
            <button disabled={busy}>
              {busy ? t.busy : mode === 'forgot-password' ? t.send : title}
            </button>
          </form>
        )}
        <nav className="account-links" aria-label={t.account}>
          {mode !== 'login' && <Link to="/login">{t.login}</Link>}
          {mode === 'login' && (
            <>
              <Link to="/register">{t.register}</Link>
              <Link to="/forgot-password">{t.forgot}</Link>
            </>
          )}
          {['login', 'register', 'verify-email'].includes(mode) && (
            <Link to="/resend-verification">{t.resend}</Link>
          )}
          {mode === 'reset-password' && (
            <Link to="/forgot-password">{t.recover}</Link>
          )}
        </nav>
      </div>
    </section>
  );
}

export function AccountPage({ locale }: { locale: Locale }) {
  const t = identityCopy[locale];
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void identityRequest('/me', undefined, 'GET', controller.signal)
      .then((value) => {
        setAccount(readAccount(value));
        setError('');
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        if (caught instanceof ApiError && caught.status === 401)
          navigate('/login', { replace: true });
        else setError(errorCopy(caught, locale));
      });
    return () => controller.abort();
  }, [attempt, navigate, locale]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      setAccount(
        readAccount(
          await identityRequest(
            '/me',
            {
              displayName: String(data.get('displayName')),
              locale: String(data.get('locale')),
            },
            'PATCH',
          ),
        ),
      );
      setSaved(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 401
          ? t.expired
          : errorCopy(caught, locale),
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await identityRequest('/auth/logout', {});
      navigate('/login');
    } catch (caught) {
      setError(errorCopy(caught, locale));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="identity-layout">
      <div className="identity-intro">
        <p className="eyebrow">Anamnou</p>
        <h1>{t.account}</h1>
        <p className="intro">{t.profileIntro}</p>
      </div>
      <div className="identity-panel">
        {error && <p role="alert">{error}</p>}
        {!account ? (
          error ? (
            <button onClick={() => setAttempt(attempt + 1)}>{t.retry}</button>
          ) : (
            <p role="status">{t.loading}</p>
          )
        ) : (
          <>
            <p>{account.email}</p>
            <form
              className="account-form"
              onSubmit={(event) => void save(event)}
            >
              <label>
                {t.name}
                <input
                  key={account.id}
                  name="displayName"
                  defaultValue={account.displayName}
                  autoComplete="nickname"
                  required
                  maxLength={80}
                />
              </label>
              <label>
                {t.language}
                <select name="locale" defaultValue={account.locale}>
                  <option value="ht">Kreyòl ayisyen</option>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
              <button disabled={busy}>{busy ? t.busy : t.save}</button>
            </form>
            {saved && <p role="status">{t.saved}</p>}
            <div className="account-links">
              <Link to="/settings/security">
                {securityLabels[locale].title}
              </Link>
              <Link to="/classes">{classCopy[locale].myClasses}</Link>
              <Link to="/settings/governance">
                {governanceCopy[locale].title}
              </Link>
              <Link to="/forgot-password">{t.reset}</Link>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => void logout()}
              >
                {t.logout}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
