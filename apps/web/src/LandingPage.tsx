import { useState } from 'react';
import { Link } from 'react-router';
import type { Locale } from './identity-copy';
import { classCopy } from './class-copy';
import { publicCopy } from './public-copy';

const en = {
  label: 'Your people. Your story.',
  miniTitle: 'Our story.',
  start: 'Start your class story',
  invite: 'Have an invite?',
  private: 'Private by default. Made together.',
  sample: 'An illustrated edition',
  open: 'Take a peek inside',
  close: 'Back to the cover',
  photo: 'Graduation friends in an illustrative yearbook',
  note: 'The little moments. The whole story.',
  inside: 'A place for every one of us.',
  insideNote: 'Your photos, your words, your class. All in one shared edition.',
  ribbon: [
    'Made for your class',
    'Built around your people',
    'Yours to create',
  ],
  chapter: 'More than a last day.',
  chapterAccent: 'A whole chapter.',
  chapterNote:
    'Bring everyone into the story. Create a class, collect your pages, and watch your yearbook take shape.',
  steps: [
    [
      'Find your people.',
      'Create your class space and invite classmates with a link, a code, or a QR.',
    ],
    [
      'Make your mark.',
      'A portrait. A favorite quote. A little about you. Give your class a page that feels like you.',
    ],
    [
      'Bring it all together.',
      'Choose your cover, arrange your sections, and preview the edition as it grows.',
    ],
  ] as [[string, string], [string, string], [string, string]],
  end: 'This chapter belongs to all of you.',
  endNote: 'Give it a place to live.',
};
const content: Record<Locale, typeof en> = {
  en,
  ht: {
    miniTitle: 'Istwa nou.',
    label: 'Moun pa w yo. Istwa pa w la.',
    start: 'Kòmanse istwa klas ou',
    invite: 'Ou gen yon envitasyon?',
    private: 'Prive depi nan kòmansman. Kreye ansanm.',
    sample: 'Yon egzanp edisyon',
    open: 'Gade anndan',
    close: 'Retounen sou kouvèti a',
    photo: 'Zanmi nan gradyasyon nan yon egzanp liv klas',
    note: 'Ti moman yo. Tout istwa a.',
    inside: 'Yon plas pou nou chak.',
    insideNote: 'Foto nou, pawòl nou, klas nou. Tout nan yon edisyon ansanm.',
    ribbon: [
      'Fèt pou klas ou',
      'Moun pa w yo nan mitan l',
      'Pou nou kreye ansanm',
    ],
    chapter: 'Plis pase dènye jou a.',
    chapterAccent: 'Yon chapit antye.',
    chapterNote:
      'Mete tout moun nan istwa a. Kreye yon klas, rasanble paj nou yo, epi wè liv klas la pran fòm.',
    steps: [
      [
        'Jwenn moun pa w yo.',
        'Kreye espas klas ou epi envite kamarad yo ak yon lyen, yon kòd, oswa yon kòd QR.',
      ],
      [
        'Kite mak ou.',
        'Yon pòtrè. Yon sitasyon ou renmen. Kèk mo sou ou. Fè yon paj ki sanble avè w.',
      ],
      [
        'Mete tout ansanm.',
        'Chwazi kouvèti a, òganize seksyon yo, epi gade edisyon an pandan l ap grandi.',
      ],
    ],
    end: 'Chapit sa a se pou nou tout.',
    endNote: 'Ba li yon plas pou l rete.',
  },
  fr: {
    miniTitle: 'Notre histoire.',
    label: 'Vos proches. Votre histoire.',
    start: 'Commencer votre histoire',
    invite: 'Vous avez une invitation ?',
    private: 'Privé par défaut. Créé ensemble.',
    sample: 'Un exemple d’édition',
    open: 'Jeter un œil à l’intérieur',
    close: 'Revenir à la couverture',
    photo: 'Amies diplômées dans un exemple d’album',
    note: 'Les petits moments. Toute une histoire.',
    inside: 'Une place pour chacun de nous.',
    insideNote:
      'Vos photos, vos mots, votre classe. Réunis dans une même édition.',
    ribbon: [
      'Pensé pour votre classe',
      'Vos proches au cœur du récit',
      'À créer ensemble',
    ],
    chapter: 'Plus qu’un dernier jour.',
    chapterAccent: 'Un chapitre entier.',
    chapterNote:
      'Faites une place à chacun. Créez votre classe, rassemblez vos pages et regardez votre album prendre forme.',
    steps: [
      [
        'Retrouvez les vôtres.',
        'Créez votre espace de classe et invitez vos camarades par lien, code ou QR.',
      ],
      [
        'Laissez votre empreinte.',
        'Un portrait. Une citation. Quelques mots sur vous. Une page qui vous ressemble.',
      ],
      [
        'Rassemblez vos histoires.',
        'Choisissez la couverture, organisez les sections et prévisualisez votre édition.',
      ],
    ],
    end: 'Ce chapitre vous appartient à tous.',
    endNote: 'Donnez-lui un endroit où vivre.',
  },
  es: {
    miniTitle: 'Nuestra historia.',
    label: 'Tu gente. Tu historia.',
    start: 'Empieza la historia de tu clase',
    invite: '¿Tienes una invitación?',
    private: 'Privado por defecto. Creado juntos.',
    sample: 'Una edición ilustrativa',
    open: 'Echa un vistazo dentro',
    close: 'Volver a la portada',
    photo: 'Amigas graduadas en un anuario ilustrativo',
    note: 'Los pequeños momentos. Toda la historia.',
    inside: 'Un lugar para cada uno.',
    insideNote:
      'Tus fotos, tus palabras, tu clase. Todo en una edición compartida.',
    ribbon: [
      'Hecho para tu clase',
      'Tu gente en el centro',
      'Para crear juntos',
    ],
    chapter: 'Más que un último día.',
    chapterAccent: 'Un capítulo entero.',
    chapterNote:
      'Haz sitio para todos. Crea tu clase, reúne las páginas y mira cómo toma forma tu anuario.',
    steps: [
      [
        'Encuentra a tu gente.',
        'Crea el espacio de tu clase e invita a tus compañeros con un enlace, código o QR.',
      ],
      [
        'Deja tu huella.',
        'Un retrato. Una cita favorita. Unas palabras sobre ti. Una página que te represente.',
      ],
      [
        'Une las historias.',
        'Elige tu portada, organiza las secciones y previsualiza la edición mientras crece.',
      ],
    ],
    end: 'Este capítulo es de todos ustedes.',
    endNote: 'Dale un lugar donde vivir.',
  },
};

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
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
      <path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} />
    </svg>
  );
}

function YearbookScene({ locale, theme }: { locale: Locale; theme: string }) {
  const t = content[locale];
  const [open, setOpen] = useState(false);
  return (
    <div className="memory-stage" data-theme={theme}>
      <div className="stage-orbit" aria-hidden="true" />
      <div className="glass-pebble pebble-one" aria-hidden="true" />
      <div className="glass-pebble pebble-two" aria-hidden="true" />
      <div className="stage-caption">
        <span className="status-dot" />
        {t.sample}
      </div>
      <div
        className={'sculpture-book' + (open ? ' is-open' : '')}
        aria-hidden="true"
      >
        <div className="sculpture-pages">
          <span className="page-kicker">Anamnou / 01</span>
          <img
            src="/images/graduation-friends.jpg"
            alt=""
            width="1200"
            height="1800"
          />
          <strong>{t.inside}</strong>
          <p>{t.insideNote}</p>
        </div>
        <div className="sculpture-cover">
          <div className="cover-masthead">
            <span>Anamnou.</span>
            <span>VOL. 01</span>
          </div>
          <p className="sculpture-title">{publicCopy[locale].cover}</p>
          <div className="cover-window">
            <img
              src="/images/graduation-friends.jpg"
              alt=""
              width="1200"
              height="1800"
            />
          </div>
          <div className="cover-bottom">
            <span>{publicCopy[locale].archive}</span>
            <span>2026</span>
          </div>
        </div>
      </div>
      <div className="floating-memory" aria-hidden="true">
        <span>01 / Anamnou</span>
        <p>{t.note}</p>
        <div className="memory-line" />
      </div>
      <div className="stage-controls">
        <button
          className="peek-button"
          type="button"
          aria-expanded={open}
          aria-controls="edition-preview-description"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? t.close : t.open}
          <Arrow />
        </button>
      </div>
      <p
        id="edition-preview-description"
        className="preview-description"
        hidden={!open}
      >
        {t.inside} {t.insideNote}
      </p>
    </div>
  );
}

export function LandingPage({
  locale,
  selected,
  theme,
}: {
  locale: Locale;
  theme: string;
  selected: { titleA: string; titleB: string; intro: string; discover: string };
}) {
  const t = content[locale];
  return (
    <div className="landing">
      <section className="prism-hero" aria-labelledby="opening-title">
        <div className="hero-copy">
          <p className="hero-label">
            <span className="tiny-book" aria-hidden="true" />
            {t.label}
          </p>
          <h1 id="opening-title">
            {selected.titleA}
            <br />
            <em>{selected.titleB}</em>
          </h1>
          <p className="intro">{selected.intro}</p>
          <div className="hero-actions">
            <Link className="primary-link" to="/classes/new">
              {t.start}
              <Arrow />
            </Link>
            <Link className="hero-discover" to="/about">
              {selected.discover}
              <Arrow diagonal />
            </Link>
          </div>
          <p className="hero-privacy">
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="5" y="10" width="14" height="11" rx="3" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v3" />
            </svg>
            {t.private}
          </p>
        </div>
        <YearbookScene locale={locale} theme={theme} />
      </section>
      <div className="story-ribbon">
        {t.ribbon.map((item, index) => (
          <span key={item}>
            <span className="ribbon-number">0{index + 1}</span>
            {item}
          </span>
        ))}
      </div>
      <section className="story-section" aria-labelledby="story-title">
        <div className="story-heading">
          <div>
            <p className="eyebrow">Anamnou / {publicCopy[locale].aboutLabel}</p>
            <h2 id="story-title">
              {t.chapter}
              <br />
              <span>{t.chapterAccent}</span>
            </h2>
          </div>
          <p>{t.chapterNote}</p>
        </div>
        <div className="story-features">
          <article className="story-feature feature-people">
            <div className="feature-art people-art" aria-hidden="true">
              <div className="portrait-tile portrait-a">A</div>
              <div className="portrait-tile portrait-b">N</div>
              <div className="portrait-tile portrait-c">M</div>
              <div className="people-thread" />
            </div>
            <span className="eyebrow">01</span>
            <h3>{t.steps[0][0]}</h3>
            <p>{t.steps[0][1]}</p>
            <Link to="/classes/new">
              {classCopy[locale].createClass}
              <Arrow diagonal />
            </Link>
          </article>
          <article className="story-feature feature-page">
            <div className="feature-art page-art" aria-hidden="true">
              <div className="mini-page">
                <div className="mini-photo" />
                <div className="mini-lines">
                  <i />
                  <i />
                  <i />
                </div>
                <span>Anamnou.</span>
              </div>
              <div className="glass-sticker">Aa</div>
            </div>
            <span className="eyebrow">02</span>
            <h3>{t.steps[1][0]}</h3>
            <p>{t.steps[1][1]}</p>
            <Link to="/classes">
              {classCopy[locale].myClasses}
              <Arrow diagonal />
            </Link>
          </article>
          <article className="story-feature feature-edition">
            <div className="feature-art edition-art" aria-hidden="true">
              <div className="mini-edition edition-back" />
              <div className="mini-edition edition-middle" />
              <div className="mini-edition edition-front">
                Anamnou.
                <span>{t.miniTitle}</span>
                <small>VOL. 01</small>
              </div>
            </div>
            <span className="eyebrow">03</span>
            <h3>{t.steps[2][0]}</h3>
            <p>{t.steps[2][1]}</p>
            <Link to="/classes">
              {classCopy[locale].myClasses}
              <Arrow diagonal />
            </Link>
          </article>
        </div>
      </section>
      <section className="story-invitation">
        <div>
          <p className="eyebrow">{t.endNote}</p>
          <h2>{t.end}</h2>
        </div>
        <div className="invitation-actions">
          <Link className="primary-link" to="/classes/new">
            {t.start}
            <Arrow />
          </Link>
          <p>
            {t.invite}{' '}
            <Link to="/join">
              {classCopy[locale].join}
              <Arrow diagonal />
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
