import { Link } from 'react-router';
import { useId } from 'react';
import { localeLabels, type Locale } from './identity-copy';
import { settingsCopy } from './settings-copy';
import { securityLabels } from './SecuritySettings';
import { participationCopy } from './participation-copy';
import { governanceCopy } from './governance-copy';

export function SettingsPage({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  const t = settingsCopy[locale];
  const accountLinks: [string, string, string][] = [
    ['/profile', t.profile, t.profileHint],
    ['/settings/security', securityLabels[locale].title, t.securityHint],
    [
      '/settings/participation',
      participationCopy[locale].title,
      t.participationHint,
    ],
    ['/settings/governance', governanceCopy[locale].title, t.reviewHint],
  ];
  return (
    <div className="account-area">
      <h1>{t.title}</h1>
      <section className="account-group" aria-labelledby="device-preferences">
        <h2 id="device-preferences">{t.preferences}</h2>
        <div className="account-card">
          <label className="settings-language">
            <span>{t.interfaceLanguage}</span>
            <select
              value={locale}
              onChange={(event) => onLocaleChange(event.target.value as Locale)}
            >
              {(Object.keys(localeLabels) as Locale[]).map((option) => (
                <option key={option} value={option}>
                  {localeLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <SettingsLink
            to="/settings/appearance"
            label={t.appearance}
            hint={t.appearanceHint}
          />
        </div>
      </section>
      <section className="account-group" aria-labelledby="account-controls">
        <h2 id="account-controls">{t.account}</h2>
        <div className="account-card">
          {accountLinks.map(([to, label, hint]) => (
            <SettingsLink key={to} to={to} label={label} hint={hint} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingsLink({
  to,
  label,
  hint,
}: {
  to: string;
  label: string;
  hint: string;
}) {
  const description = useId();
  return (
    <div className="settings-row">
      <Link to={to} aria-describedby={description}>
        {label}
      </Link>
      <p id={description}>{hint}</p>
    </div>
  );
}
