import { Photo } from './PhotoUpload';
import type { Asset, Yearbook } from './yearbook-api';
import type { Locale } from './identity-copy';
import { yearbookCopy } from './yearbook-copy';

export function EditionCover({
  title,
  year,
  school,
  theme,
  photo,
  locale,
  heading = false,
}: {
  title: string;
  year?: number;
  school?: string;
  theme: Yearbook['theme'];
  photo?: Asset;
  locale: Locale;
  heading?: boolean;
}) {
  const Title = heading ? 'h1' : 'strong';
  return (
    <div
      className={
        'book-cover theme-' +
        theme.toLowerCase() +
        (photo ? ' book-cover-photo' : '')
      }
    >
      <div className="book-masthead">
        <span>Anamnou</span>
        <span>{yearbookCopy[locale].yearbook}</span>
      </div>
      <Title className="book-title">{title}</Title>
      {photo ? (
        <Photo
          key={photo.id}
          asset={photo}
          locale={locale}
          className="book-image"
        />
      ) : (
        <span className="book-year" aria-hidden="true">
          {year}
        </span>
      )}
      <div className="book-colophon">
        <span>{school}</span>
        <span>{year}</span>
      </div>
    </div>
  );
}
