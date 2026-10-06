import type { Locale } from './identity-copy';
const labels = {
  en: {
    verified: 'School affiliation verified',
    unverified: 'School affiliation not yet verified',
  },
  fr: {
    verified: 'Affiliation scolaire vérifiée',
    unverified: 'Affiliation scolaire pas encore vérifiée',
  },
  ht: {
    verified: 'Afilyasyon lekòl verifye',
    unverified: 'Afilyasyon lekòl poko verifye',
  },
  es: {
    verified: 'Afiliación escolar verificada',
    unverified: 'Afiliación escolar aún no verificada',
  },
};
export function SchoolVerification({
  verifiedAt,
  locale,
}: {
  verifiedAt?: string | null;
  locale: Locale;
}) {
  return (
    <p className="school-verification">
      {verifiedAt ? labels[locale].verified : labels[locale].unverified}
    </p>
  );
}
