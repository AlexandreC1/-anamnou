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
    credits: 'Photo credits',
    photo:
      'Graduates pictured on the Campus Henry Christophe de Limonade website',
    ceremony: 'Graduation ceremony pictured on the UNAH website',
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
    credits: 'Crédits photo',
    photo:
      'Diplômés photographiés sur le site du Campus Henry Christophe de Limonade',
    ceremony: 'Cérémonie de graduation photographiée sur le site de l’UNAH',
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
    credits: 'Sous foto yo',
    photo: 'Diplome sou sit Campus Henry Christophe de Limonade la',
    ceremony: 'Seremoni gradyasyon sou sit UNAH la',
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
    credits: 'Créditos de fotos',
    photo:
      'Graduados fotografiados en el sitio del Campus Henry Christophe de Limonade',
    ceremony: 'Ceremonia de graduación fotografiada en el sitio de UNAH',
  },
} satisfies Record<Locale, Record<string, string>>;

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
                src="/images/haitian-graduation-unah.webp"
                alt=""
                width="1200"
                height="800"
                decoding="async"
              />
              <strong>{t.inside}</strong>
              <span className="inside-page-description">{t.insideNote}</span>
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
                    src="/images/haitian-graduates-chcl.webp"
                    alt=""
                    width="1600"
                    height="577"
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
                  src="/images/haitian-graduates-chcl.webp"
                  alt=""
                  width="1600"
                  height="577"
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
          {t.inside} {t.insideNote}
        </p>
      </div>
      <p className="demo-photo-credits">
        {t.credits}:{' '}
        <a
          href="https://chcl.ueh.edu.ht/"
          target="_blank"
          rel="noopener noreferrer"
          title={t.photo}
        >
          UEH · CHCL
        </a>
        {' / '}
        <a
          href="https://unah.edu.ht/"
          target="_blank"
          rel="noopener noreferrer"
          title={t.ceremony}
        >
          UNAH
        </a>
      </p>
    </div>
  );
}

export function LandingPage({
  locale,
  theme,
}: {
  locale: Locale;
  theme: string;
}) {
  const t = content[locale];
  return (
    <div className="landing collection-landing">
      <section className="collection-hero" aria-labelledby="opening-title">
        <div className="hero-copy">
          <h1 id="opening-title">{t.heading}</h1>
          <p className="intro">{t.description}</p>
          <div className="hero-actions">
            <Link className="primary-link" to="/classes/new">
              {classCopy[locale].createClass}
              <Arrow />
            </Link>
            <Link className="hero-discover" to="/join">
              {classCopy[locale].join}
            </Link>
          </div>
        </div>
        <YearbookScene locale={locale} theme={theme} />
      </section>
    </div>
  );
}
