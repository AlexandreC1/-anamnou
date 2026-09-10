import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';

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
    footer: 'Sa nou te ye. Sa n ap vin ye.',
    status: 'Tcheke koneksyon',
    eyebrow: 'Yon plas pou pwochen chapit nou an',
    titleA: 'Gen chapit',
    titleB: 'ki rete avèk nou.',
    intro:
      'Moun yo. Ti moman yo. Bagay nou pa janm vle bliye. Yon kay pou istwa klas k ap gradye nou an.',
    discover: 'Dekouvri lide a',
    note: 'Premye edisyon an ap pran fòm. Espas klas yo ap louvri nan yon pwochen vèsyon.',
  },
  fr: {
    skip: 'Aller au contenu',
    nav: 'Navigation principale',
    home: 'Accueil',
    idea: "L'idée",
    connection: 'Connexion',
    footer: 'Qui nous étions. Qui nous devenons.',
    status: 'État de la connexion',
    eyebrow: 'Un lieu pour notre prochain chapitre',
    titleA: 'Certains chapitres',
    titleB: 'restent avec nous.',
    intro:
      'Les personnes. Les petits moments. Ce que nous ne voulons jamais oublier. Un lieu pour raconter la classe qui obtient son diplôme.',
    discover: "Découvrir l'idée",
    note: 'La première édition prend forme. Les espaces de classe ouvriront dans une prochaine version.',
  },
  en: {
    skip: 'Skip to content',
    nav: 'Main navigation',
    home: 'Home',
    idea: 'The idea',
    connection: 'Connection',
    footer: 'Who we were. Who we become.',
    status: 'Connection status',
    eyebrow: 'A place for our next chapter',
    titleA: 'Some chapters',
    titleB: 'stay with us.',
    intro:
      'The people. The small moments. The things we never want to forget. A home for the story of your graduating class.',
    discover: 'Discover the idea',
    note: 'The first edition is taking shape. Class spaces will open in a future release.',
  },
  es: {
    skip: 'Ir al contenido',
    nav: 'Navegación principal',
    home: 'Inicio',
    idea: 'La idea',
    connection: 'Conexión',
    footer: 'Quiénes fuimos. En quiénes nos convertimos.',
    status: 'Estado de conexión',
    eyebrow: 'Un lugar para nuestro próximo capítulo',
    titleA: 'Algunos capítulos',
    titleB: 'se quedan con nosotros.',
    intro:
      'Las personas. Los pequeños momentos. Lo que nunca queremos olvidar. Un hogar para la historia de tu clase graduada.',
    discover: 'Descubre la idea',
    note: 'La primera edición está tomando forma. Los espacios de clase llegarán en una versión futura.',
  },
};
function RouteFocus() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    const labels: Record<string, string> = {
      '/': 'Our next chapter',
      '/about': 'The idea',
      '/connection': 'Connection',
    };
    document.title = (labels[pathname] ?? 'Page not found') + ' — Anamnou';
    if (previous.current !== pathname) {
      document.getElementById('main')?.focus();
      previous.current = pathname;
    }
  }, [pathname]);
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
  return [locale, setLocale];
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
  const selected = copy[locale];
  return (
    <div className="site">
      <a className="skip-link" href="#main">
        {selected.skip}
      </a>
      <header className="site-header">
        <Link className="wordmark" to="/" aria-label="Anamnou home">
          anamnou<span aria-hidden="true">.</span>
        </Link>
        <nav aria-label={selected.nav}>
          <NavLink to="/" end>
            {selected.home}
          </NavLink>
          <NavLink to="/about">{selected.idea}</NavLink>
        </nav>
        <LanguageChoice locale={locale} onChange={setLocale} />
      </header>
      <RouteFocus />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home selected={selected} />} />
          <Route path="/about" element={<About />} />
          <Route path="/connection" element={<Connection />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <p>{selected.footer}</p>
        <Link to="/connection">{selected.status}</Link>
      </footer>
    </div>
  );
}
function Home({ selected }: { selected: Copy }) {
  return (
    <section className="opening" aria-labelledby="opening-title">
      <div className="opening-copy">
        <p className="eyebrow">{selected.eyebrow}</p>
        <h1 id="opening-title">
          {selected.titleA}
          <br />
          <em>{selected.titleB}</em>
        </h1>
        <p className="intro">{selected.intro}</p>
        <Link className="text-link" to="/about">
          {selected.discover} <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className="publication" aria-hidden="true">
        <div className="publication-top">
          <span>ANAMNOU</span>
          <span>A CLASS ARCHIVE</span>
        </div>
        <p className="publication-title">
          Our lives,
          <br />
          in good
          <br />
          <em>company.</em>
        </p>
        <div className="publication-bottom">
          <span>
            The end of a chapter.
            <br />
            The beginning of everything else.
          </span>
          <span>01</span>
        </div>
      </div>
      <p className="edition-note">{selected.note}</p>
    </section>
  );
}
function About() {
  return (
    <article className="reading">
      <p className="eyebrow">The idea behind Anamnou</p>
      <h1>
        A yearbook worth
        <br />
        <em>coming back to.</em>
      </h1>
      <p className="intro">
        Graduation is a moment. The people you share it with become part of your
        story.
      </p>
      <h2>Keep the chapter. Make room for the next.</h2>
      <p>
        Anamnou is being built for graduating classes, starting in Haiti. The
        vision is a shared yearbook that preserves the class as it was at
        graduation, alongside a separate alumni space that can grow with its
        members.
      </p>
      <h2>We’re at the beginning.</h2>
      <p>
        This release establishes the foundation. Accounts, class invitations,
        profiles, and yearbook creation are not available yet.
      </p>
      <Link className="text-link" to="/">
        Back to the opening page <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}
type ConnectionState = 'idle' | 'loading' | 'ready' | 'error';
export function Connection() {
  const [state, setState] = useState<ConnectionState>('idle');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function check() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState('loading');
    try {
      const response = await fetch('/api/ready', {
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
      <p className="eyebrow">Connection status</p>
      <h1>
        A quick
        <br />
        <em>connection check.</em>
      </h1>
      <p>
        This checks whether this installation’s required services are available.
      </p>
      <p role="status" aria-live="polite" className="connection-message">
        {state === 'idle'
          ? 'Ready when you are.'
          : state === 'loading'
            ? 'Checking the connection…'
            : state === 'ready'
              ? 'Connection available.'
              : 'We couldn’t connect. Please try again.'}
      </p>
      <button
        type="button"
        onClick={() => void check()}
        disabled={state === 'loading'}
      >
        {state === 'loading'
          ? 'Checking…'
          : state === 'error'
            ? 'Try again'
            : 'Check connection'}
      </button>
      <p>
        <Link to="/">Return home</Link>
      </p>
    </section>
  );
}
function NotFound() {
  return (
    <section className="reading">
      <p className="eyebrow">Page not found</p>
      <h1>A missing page.</h1>
      <p>This address doesn’t lead to a page in this edition.</p>
      <Link className="text-link" to="/">
        Return home
      </Link>
    </section>
  );
}
