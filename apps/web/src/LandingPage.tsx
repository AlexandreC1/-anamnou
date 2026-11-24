import { useState } from 'react';
import { Link } from 'react-router';
import type { Locale } from './identity-copy';
import { classCopy } from './class-copy';
import { publicCopy } from './public-copy';

const content = {
  en: {
    tapOpen: 'Tap the book to open',
    tapClose: 'Tap the book to close',
    heading: 'A yearbook for your class.',
    description: 'Collect profiles, photos and class memories in one place.',
    sample: 'Sample yearbook',
    cover: 'Class of 2026',
    open: 'Preview the yearbook',
    close: 'Close preview',
    inside: 'Class profiles',
    insideNote: 'Photos, personal quotes and class memories.',
    preview:
      'Public preview. Explore a fictional yearbook while accounts are closed.',
    quote: 'One day we’ll open this book and laugh like we’re still in class.',
  },
  fr: {
    tapOpen: 'Touchez le livre pour ouvrir',
    tapClose: 'Touchez le livre pour fermer',
    heading: 'Un album pour votre classe.',
    description:
      'Rassemblez les profils, les photos et les souvenirs de classe au même endroit.',
    sample: 'Exemple d’album',
    cover: 'Promotion 2026',
    open: 'Prévisualiser l’album',
    close: 'Fermer l’aperçu',
    inside: 'Profils de classe',
    insideNote: 'Photos, citations personnelles et souvenirs de classe.',
    preview:
      'Aperçu public. Explorez un album fictif en attendant l’ouverture des comptes.',
    quote:
      'Un jour, on ouvrira cet album et on rira comme si on était encore en classe.',
  },
  ht: {
    tapOpen: 'Peze liv la pou louvri l',
    tapClose: 'Peze liv la pou fèmen l',
    heading: 'Yon liv pou klas ou.',
    description: 'Rasanble pwofil, foto ak souvni klas la nan yon sèl kote.',
    sample: 'Egzanp liv klas',
    cover: 'Pwomosyon 2026',
    open: 'Gade egzanp liv la',
    close: 'Fèmen egzanp lan',
    inside: 'Pwofil klas la',
    insideNote: 'Foto, sitasyon pèsonèl ak souvni klas la.',
    preview:
      'Vèsyon tès piblik. Gade yon egzanp liv klas pandan enskripsyon yo fèmen.',
    quote:
      'Yon jou, n ap louvri liv sa a epi n ap ri tankou nou te toujou nan klas la.',
  },
  es: {
    tapOpen: 'Toca el libro para abrirlo',
    tapClose: 'Toca el libro para cerrarlo',
    heading: 'Un anuario para tu clase.',
    description: 'Reúne perfiles, fotos y recuerdos de clase en un solo lugar.',
    sample: 'Anuario de ejemplo',
    cover: 'Promoción 2026',
    open: 'Ver el anuario',
    close: 'Cerrar vista previa',
    inside: 'Perfiles de clase',
    insideNote: 'Fotos, citas personales y recuerdos de clase.',
    preview:
      'Vista pública. Explora un anuario ficticio mientras las cuentas están cerradas.',
    quote:
      'Un día abriremos este anuario y nos reiremos como si aún estuviéramos en clase.',
  },
} satisfies Record<Locale, Record<string, string>>;

const samplePhoto = import.meta.env.BASE_URL + 'images/sample-promotion.webp';

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}

function YearbookScene({ locale, theme }: { locale: Locale; theme: string }) {
  const t = content[locale];
  const [open, setOpen] = useState(false);
  return (
    <div className="demo-edition">
      <p className="sample-yearbook-label">{t.sample}</p>
      <div className="memory-stage" data-theme={theme}>
        <button
          type="button"
          className={'sculpture-book' + (open ? ' is-open' : '')}
          aria-label={open ? t.close : t.open}
          aria-expanded={open}
          aria-controls="edition-preview-description"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="book-visual" aria-hidden="true">
            <span className="sculpture-pages">
              <span className="page-kicker">Anamnou / 01</span>
              <img
                src={samplePhoto}
                alt=""
                width="1200"
                height="800"
                decoding="async"
              />
              <strong>{t.inside}</strong>
              <span className="inside-page-description">“{t.quote}”</span>
            </span>
            <span className="book-leaf">
              <span className="sculpture-cover">
                <span className="cover-masthead">
                  <span>Anamnou.</span>
                  <span>VOL. 01</span>
                </span>
                <span className="sculpture-title">{t.cover}</span>
                <span className="cover-window">
                  <img
                    src={samplePhoto}
                    alt=""
                    width="1200"
                    height="800"
                    fetchPriority="high"
                    decoding="async"
                  />
                </span>
                <span className="cover-bottom">
                  <span>{publicCopy[locale].archive}</span>
                  <span>2026</span>
                </span>
              </span>
              <span className="book-cover-back">
                <span className="page-kicker">Anamnou / 2026</span>
                <strong>{t.cover}</strong>
                <img
                  src={samplePhoto}
                  alt=""
                  width="1200"
                  height="800"
                  decoding="async"
                />
                <span className="inside-page-number">01</span>
              </span>
            </span>
          </span>
          <span className="book-hit-area" aria-hidden="true" />
        </button>
        <div className="stage-controls">
          <span className="book-tap-hint">{open ? t.tapClose : t.tapOpen}</span>
        </div>
        <p
          id="edition-preview-description"
          className="preview-description"
          hidden={!open}
        >
          {t.inside} {t.insideNote} “{t.quote}”
        </p>
      </div>
    </div>
  );
}

export function LandingPage({
  locale,
  theme,
  publicPreview,
}: {
  locale: Locale;
  theme: string;
  publicPreview: boolean;
}) {
  const t = content[locale];
  return (
    <div className="landing collection-landing">
      <section className="collection-hero" aria-labelledby="opening-title">
        <div className="hero-copy">
          <h1 id="opening-title">{t.heading}</h1>
          <p className="intro">{t.description}</p>
          {publicPreview ? (
            <p className="preview-availability">{t.preview}</p>
          ) : (
            <div className="hero-actions">
              <Link className="primary-link" to="/classes/new">
                {classCopy[locale].createClass}
                <Arrow />
              </Link>
              <Link className="hero-discover" to="/join">
                {classCopy[locale].join}
              </Link>
            </div>
          )}
        </div>
        <YearbookScene locale={locale} theme={theme} />
      </section>
    </div>
  );
}
