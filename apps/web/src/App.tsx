import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { AccountPage, IdentityForm } from './Identity';
import { identityCopy } from './identity-copy';
import { publicCopy } from './public-copy';
import {
  ClassesHome,
  SchoolForm,
  SchoolManage,
  CreateClass,
  ClassHome,
  JoinClass,
} from './Classes';
import { ClassManage, MemberDirectory } from './ClassManage';
import { classCopy } from './class-copy';
import { MemberProfile } from './MemberProfile';
import { YearbookEditor } from './YearbookEditor';
import { YearbookReader } from './YearbookReader';
import { ClassWorkspace } from './ClassWorkspace';
import './yearbook.css';
import { LandingPage } from './LandingPage';
import './prism.css';
import { apiFetch } from './api-transport';
import { NativeNavigation } from './NativeNavigation';
import { AppearanceSettings, type AnamnouTheme } from './AppearanceSettings';

type Locale = 'ht' | 'fr' | 'en' | 'es';
const localeLabels: Record<Locale, string> = {
  ht: 'Kreyòl ayisyen',
  fr: 'Français',
  en: 'English',
  es: 'Español',
};
type Copy = {
  skip: string;
  nav: string;
  home: string;
  idea: string;
  connection: string;
  footer: string;
  status: string;
  eyebrow: string;
  titleA: string;
  titleB: string;
  intro: string;
  discover: string;
  note: string;
};
const copy: Record<Locale, Copy> = {
  ht: {
    skip: 'Ale nan kontni an',
    nav: 'Navigasyon prensipal',
    home: 'Akèy',
    idea: 'Lide a',
    connection: 'Koneksyon',
    footer: 'Yon chapit fini. Yon istwa rete.',
    status: 'Tcheke koneksyon',
    eyebrow: 'Yon plas pou pwochen chapit nou an',
    titleA: 'Gen chapit',
    titleB: 'ki rete avèk nou.',
    intro:
      'Moun yo. Ti moman yo. Bagay nou pa janm vle bliye. Yon kay pou istwa klas k ap gradye nou an.',
    discover: 'Dekouvri lide a',
    note: 'Premye edisyon an ap pran fòm. Kreye klas ou epi envite kamarad ou yo.',
  },
  fr: {
    skip: 'Aller au contenu',
    nav: 'Navigation principale',
    home: 'Accueil',
    idea: "L'idée",
    connection: 'Connexion',
    footer: 'Un chapitre se termine. Une histoire reste.',
    status: 'État de la connexion',
    eyebrow: 'Un lieu pour notre prochain chapitre',
    titleA: 'Certains chapitres',
    titleB: 'restent avec nous.',
    intro:
      'Les personnes. Les petits moments. Ce que nous ne voulons jamais oublier. Un lieu pour raconter la classe qui obtient son diplôme.',
    discover: "Découvrir l'idée",
    note: 'La première édition prend forme. Créez votre classe et invitez vos camarades.',
  },
  en: {
    skip: 'Skip to content',
    nav: 'Main navigation',
    home: 'Home',
    idea: 'The idea',
    connection: 'Connection',
    footer: 'A chapter ends. A story remains.',
    status: 'Connection status',
    eyebrow: 'A place for our next chapter',
    titleA: 'Some chapters',
    titleB: 'stay with us.',
    intro:
      'The people. The small moments. The things we never want to forget. A home for the story of your graduating class.',
    discover: 'Discover the idea',
    note: 'The first edition is taking shape. Create your class and invite your classmates.',
  },
  es: {
    skip: 'Ir al contenido',
    nav: 'Navegación principal',
    home: 'Inicio',
    idea: 'La idea',
    connection: 'Conexión',
    footer: 'Un capítulo termina. Una historia permanece.',
    status: 'Estado de conexión',
    eyebrow: 'Un lugar para nuestro próximo capítulo',
    titleA: 'Algunos capítulos',
    titleB: 'se quedan con nosotros.',
    intro:
      'Las personas. Los pequeños momentos. Lo que nunca queremos olvidar. Un hogar para la historia de tu clase graduada.',
    discover: 'Descubre la idea',
    note: 'La primera edición está tomando forma. Crea tu clase e invita a tus compañeros.',
  },
};
function RouteFocus({ locale }: { locale: Locale }) {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    document.title =
      (document.querySelector('h1')?.textContent ?? 'Anamnou') + ' | Anamnou';
    if (previous.current !== pathname) {
      document.getElementById('main')?.focus();
      previous.current = pathname;
    }
  }, [pathname, locale]);
  return null;
}
function useLocale(): [Locale, (locale: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = window.localStorage.getItem('anamnou-locale');
    return saved === 'ht' || saved === 'fr' || saved === 'es' ? saved : 'en';
  });
  function setLocale(next: Locale) {
    setLocaleState(next);
    window.localStorage.setItem('anamnou-locale', next);
    document.documentElement.lang = next;
  }
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return [locale, setLocale];
}
function useAppearance(): [AnamnouTheme, (theme: AnamnouTheme) => void] {
  const [theme, setTheme] = useState<AnamnouTheme>(() => {
    const saved = window.localStorage.getItem('anamnou-theme');
    return saved === 'lilac' || saved === 'sage' ? saved : 'coral';
  });
  useEffect(() => {
    document.documentElement.dataset.anamnouTheme = theme;
  }, [theme]);
  function updateTheme(next: AnamnouTheme) {
    setTheme(next);
    window.localStorage.setItem('anamnou-theme', next);
  }
  return [theme, updateTheme];
}
function LanguageChoice({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <label className="language-choice">
      <span>Language / Lang / Langue / Idioma</span>
      <select
        value={locale}
        onChange={(event) => onChange(event.target.value as Locale)}
        aria-label="Language / Lang / Langue / Idioma"
      >
        {(Object.keys(localeLabels) as Locale[]).map((option) => (
          <option key={option} value={option}>
            {localeLabels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
export function App() {
  const [locale, setLocale] = useLocale();
  const [theme, setTheme] = useAppearance();
  const selected = copy[locale];
  const { pathname } = useLocation();
  const inWorkspace = /^\/classes\/(?!new(?:\/|$))[^/]+/.test(pathname);
  return (
    <div className={'site' + (inWorkspace ? ' site-workspace' : '')}>
      <a className="skip-link" href="#main">
        {selected.skip}
      </a>
      <header className="site-header">
        <Link
          className="wordmark"
          to="/"
          aria-label={`Anamnou: ${selected.home}`}
        >
          Anamnou<span aria-hidden="true">.</span>
        </Link>
        <nav aria-label={selected.nav}>
          <NavLink to="/" end>
            {selected.home}
          </NavLink>
          <NavLink to="/about">{selected.idea}</NavLink>
          <NavLink to="/classes">{classCopy[locale].myClasses}</NavLink>
          <NavLink to="/profile">{identityCopy[locale].account}</NavLink>
          <NavLink to="/settings/appearance">
            {locale === 'fr'
              ? 'Apparence'
              : locale === 'ht'
                ? 'Aparans'
                : locale === 'es'
                  ? 'Apariencia'
                  : 'Appearance'}
          </NavLink>
        </nav>
        <LanguageChoice locale={locale} onChange={setLocale} />
      </header>
      <RouteFocus locale={locale} />
      <NativeNavigation />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route
            path="/classes/:id"
            element={<ClassWorkspace locale={locale} />}
          >
            <Route index element={<ClassHome locale={locale} />} />
            <Route
              path="members/:memberId/profile"
              element={<MemberProfile locale={locale} />}
            />
            <Route
              path="yearbook"
              element={<YearbookReader locale={locale} />}
            />
            <Route
              path="yearbook/edit"
              element={<YearbookEditor locale={locale} />}
            />
            <Route path="manage" element={<ClassManage locale={locale} />} />
            <Route
              path="members"
              element={<MemberDirectory locale={locale} />}
            />
          </Route>
          <Route path="/classes" element={<ClassesHome locale={locale} />} />
          <Route path="/schools/new" element={<SchoolForm locale={locale} />} />
          <Route
            path="/schools/:id/manage"
            element={<SchoolManage locale={locale} />}
          />
          <Route
            path="/classes/new"
            element={<CreateClass locale={locale} />}
          />
          <Route path="/join" element={<JoinClass locale={locale} />} />
          <Route
            path="/"
            element={<Home selected={selected} locale={locale} theme={theme} />}
          />
          <Route
            path="/settings/appearance"
            element={
              <AppearanceSettings
                locale={locale}
                theme={theme}
                onChange={setTheme}
              />
            }
          />
          <Route path="/about" element={<About locale={locale} />} />
          <Route path="/connection" element={<Connection locale={locale} />} />
          {(
            [
              'register',
              'login',
              'forgot-password',
              'reset-password',
              'verify-email',
              'resend-verification',
            ] as const
          ).map((mode) => (
            <Route
              key={mode}
              path={'/' + mode}
              element={<IdentityForm key={mode} mode={mode} locale={locale} />}
            />
          ))}
          <Route path="/profile" element={<AccountPage locale={locale} />} />
          <Route path="*" element={<NotFound locale={locale} />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <p>{selected.footer}</p>
        <Link to="/connection">{selected.status}</Link>
      </footer>
    </div>
  );
}
function Home({
  selected,
  locale,
  theme,
}: {
  selected: Copy;
  locale: Locale;
  theme: AnamnouTheme;
}) {
  return <LandingPage locale={locale} selected={selected} theme={theme} />;
}
function About({ locale }: { locale: Locale }) {
  const t = publicCopy[locale];
  return (
    <article className="reading">
      <p className="eyebrow">{t.aboutLabel}</p>
      <h1>{t.aboutTitle}</h1>
      <p className="intro">{t.aboutIntro}</p>
      <h2>{t.chapter}</h2>
      <p>{t.vision}</p>
      <h2>{t.beginning}</h2>
      <p>{t.available}</p>
      <Link className="text-link" to="/">
        {t.back}
      </Link>
    </article>
  );
}
type ConnectionState = 'idle' | 'loading' | 'ready' | 'error';
export function Connection({ locale = 'en' }: { locale?: Locale }) {
  const t = publicCopy[locale];
  const [state, setState] = useState<ConnectionState>('idle');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function check() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState('loading');
    try {
      const response = await apiFetch('/ready', {
        signal: AbortSignal.any([current.signal, AbortSignal.timeout(8000)]),
        cache: 'no-store',
      });
      const body: unknown = await response.json();
      if (
        !response.ok ||
        typeof body !== 'object' ||
        body === null ||
        !('status' in body) ||
        body.status !== 'ok'
      )
        throw new Error('Unavailable');
      if (!current.signal.aborted) setState('ready');
    } catch {
      if (!current.signal.aborted) setState('error');
    }
  }
  return (
    <section className="reading">
      <p className="eyebrow">{copy[locale].status}</p>
      <h1>{t.connectionTitle}</h1>
      <p>{t.connectionIntro}</p>
      <p role="status" aria-live="polite" className="connection-message">
        {state === 'idle'
          ? t.idle
          : state === 'loading'
            ? t.checking
            : state === 'ready'
              ? t.ready
              : t.failed}
      </p>
      <button
        type="button"
        onClick={() => void check()}
        disabled={state === 'loading'}
      >
        {state === 'loading'
          ? t.checking
          : state === 'error'
            ? t.retry
            : t.check}
      </button>
      <p>
        <Link to="/">{t.back}</Link>
      </p>
    </section>
  );
}
function NotFound({ locale }: { locale: Locale }) {
  const t = publicCopy[locale];
  return (
    <section className="reading">
      <p className="eyebrow">{t.missingLabel}</p>
      <h1>{t.missingTitle}</h1>
      <p>{t.missingIntro}</p>
      <Link className="text-link" to="/">
        {t.back}
      </Link>
    </section>
  );
}
