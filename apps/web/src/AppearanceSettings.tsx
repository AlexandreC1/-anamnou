import type { Locale } from './identity-copy';
import { Link } from 'react-router';

export type AnamnouTheme = 'coral' | 'lilac' | 'sage';

const copy = {
  en: {
    eyebrow: 'SETTINGS',
    title: 'Your appearance',
    intro:
      'Choose a color mood for your Anamnou experience. Your choice is saved on this device.',
    heading: 'Color theme',
    selected: 'Selected',
    options: {
      coral: ['Coral', 'Warm, bright, and unmistakably yours.'],
      lilac: ['Lilac', 'A softer shade with a little daydream in it.'],
      sage: ['Sage', 'Grounded green with a fresh, open feel.'],
    },
    back: 'Back to Anamnou',
  },
  fr: {
    eyebrow: 'PARAMÈTRES',
    title: 'Votre apparence',
    intro:
      'Choisissez les couleurs de votre expérience Anamnou. Votre choix est enregistré sur cet appareil.',
    heading: 'Thème de couleur',
    selected: 'Sélectionné',
    options: {
      coral: ['Corail', 'Chaleureux, lumineux et bien à vous.'],
      lilac: ['Lilas', 'Une teinte douce, comme un petit rêve éveillé.'],
      sage: ['Sauge', 'Un vert apaisant, frais et ouvert.'],
    },
    back: 'Retour à Anamnou',
  },
  ht: {
    eyebrow: 'PARAMÈT',
    title: 'Aparans ou',
    intro:
      'Chwazi koulè eksperyans Anamnou ou. Chwa w la ap rete sou aparèy sa a.',
    heading: 'Tèm koulè',
    selected: 'Chwazi',
    options: {
      coral: ['Koray', 'Cho, klere, epi pa w nèt.'],
      lilac: ['Lila', 'Yon koulè dous ak yon ti rèv ladan l.'],
      sage: ['Vèt saj', 'Vèt ki poze, fre, epi bay espas.'],
    },
    back: 'Retounen sou Anamnou',
  },
  es: {
    eyebrow: 'AJUSTES',
    title: 'Tu apariencia',
    intro:
      'Elige los colores de tu experiencia Anamnou. Tu elección se guarda en este dispositivo.',
    heading: 'Tema de color',
    selected: 'Seleccionado',
    options: {
      coral: ['Coral', 'Cálido, luminoso y muy tuyo.'],
      lilac: ['Lila', 'Un tono suave con un toque de ensueño.'],
      sage: ['Salvia', 'Verde sereno, fresco y abierto.'],
    },
    back: 'Volver a Anamnou',
  },
} satisfies Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    intro: string;
    heading: string;
    selected: string;
    options: Record<AnamnouTheme, [string, string]>;
    back: string;
  }
>;

const themes: AnamnouTheme[] = ['coral', 'lilac', 'sage'];

export function AppearanceSettings({
  locale,
  theme,
  onChange,
}: {
  locale: Locale;
  theme: AnamnouTheme;
  onChange: (theme: AnamnouTheme) => void;
}) {
  const t = copy[locale];
  return (
    <section className="appearance-settings" aria-labelledby="appearance-title">
      <div className="appearance-heading">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 id="appearance-title">{t.title}</h1>
        <p className="intro">{t.intro}</p>
      </div>
      <div className="theme-panel">
        <h2>{t.heading}</h2>
        <div className="theme-options" role="group" aria-label={t.heading}>
          {themes.map((option) => {
            const [name, description] = t.options[option];
            const isSelected = theme === option;
            return (
              <button
                type="button"
                key={option}
                className="theme-option"
                data-theme={option}
                aria-pressed={isSelected}
                onClick={() => onChange(option)}
              >
                <span className="theme-sample" aria-hidden="true">
                  <span className="theme-sample-book" />
                  <span className="theme-sample-orb" />
                </span>
                <span className="theme-option-copy">
                  <strong>{name}</strong>
                  <span>{description}</span>
                </span>
                <span className="theme-selected" aria-hidden="true">
                  {isSelected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
        <p className="theme-confirmation" role="status">
          {t.options[theme][0]} · {t.selected}
        </p>
      </div>
      <Link className="appearance-back" to="/">
        {t.back}
      </Link>
    </section>
  );
}
