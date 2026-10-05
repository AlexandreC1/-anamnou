import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useResource, type Page } from './class-api';
import { LoadState, Pagination } from './ClassCommon';
import type { Locale } from './identity-copy';
import { yearbookCopy } from './yearbook-copy';
import type { ReaderMember, SectionType, Yearbook } from './yearbook-api';
import { Photo } from './PhotoUpload';
import { EditionCover } from './EditionCover';

export function YearbookReader({ locale }: { locale: Locale }) {
  const { id = '' } = useParams();
  const t = yearbookCopy[locale];
  const result = useResource<Yearbook>(`/classes/${id}/yearbook`);
  const { hash } = useLocation();
  useEffect(() => {
    if (result.data && hash)
      document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [result.data, hash]);
  if (!result.data)
    return (
      <section className="class-page">
        <h1>{t.yearbook}</h1>
        <LoadState error={result.error} retry={result.reload} locale={locale} />
      </section>
    );
  const book = result.data;
  return (
    <article className={'yearbook-reader theme-' + book.theme.toLowerCase()}>
      <div className="reader-toolbar">
        <Link to={'/classes/' + id}>{t.back}</Link>
        <span>{t.draft}</span>
        {book.editable && (
          <Link to={'/classes/' + id + '/yearbook/edit'}>{t.edit}</Link>
        )}
      </div>
      <header className="reader-opening">
        <EditionCover
          title={book.title}
          year={book.class.graduationYear}
          school={book.class.school.name}
          theme={book.theme}
          photo={
            book.sections.find(
              (section) =>
                ['COVER', 'CLASS_PHOTO'].includes(section.type) &&
                section.media.length,
            )?.media[0]?.asset
          }
          locale={locale}
          heading
        />
        <p className="reader-draft-note">{t.draftNote}</p>
      </header>
      {book.sections.length === 0 ? (
        <div className="reader-empty">
          <p>{t.empty}</p>
          <Link
            to={
              book.editable
                ? `/classes/${id}/yearbook/edit`
                : `/classes/${id}/members/me/profile`
            }
          >
            {book.editable ? t.edit : t.start}
          </Link>
        </div>
      ) : (
        <>
          <nav className="edition-contents" aria-label={t.contents}>
            <p className="eyebrow">{t.contents}</p>
            <ol>
              {book.sections.map((section) => (
                <li key={section.id}>
                  <a href={'#section-' + section.id}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
          {book.sections.map((section, index) => (
            <section
              key={section.id}
              id={'section-' + section.id}
              className={'reader-section section-' + section.type.toLowerCase()}
            >
              <header className="reader-section-heading">
                <p className="section-folio" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <div>
                  <p className="eyebrow">
                    {String(index + 1).padStart(2, '0')} / {t[section.type]}
                  </p>
                  <h2>{section.title}</h2>
                </div>
              </header>
              {section.body && (
                <p className="preserve-lines section-prose">{section.body}</p>
              )}
              {section.media.length > 0 && (
                <div
                  className={'reader-gallery gallery-' + section.media.length}
                >
                  {section.media.map(({ asset }) => (
                    <figure key={asset.id}>
                      <Photo asset={asset} locale={locale} />
                      <figcaption>{asset.alt}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              {(['MEMBERS', 'STAFF', 'QUOTES'] as SectionType[]).includes(
                section.type,
              ) && (
                <MemberPages classId={id} kind={section.type} locale={locale} />
              )}
            </section>
          ))}
        </>
      )}
    </article>
  );
}
function MemberPages({
  classId,
  kind,
  locale,
}: {
  classId: string;
  kind: SectionType;
  locale: Locale;
}) {
  const t = yearbookCopy[locale];
  const [page, setPage] = useState(1);
  const result = useResource<Page<ReaderMember>>(
    `/classes/${classId}/yearbook/members?page=${page}&kind=${kind}`,
  );
  if (!result.data)
    return (
      <LoadState error={result.error} retry={result.reload} locale={locale} />
    );
  return (
    <>
      <div className={kind === 'QUOTES' ? 'quote-pages' : 'member-pages'}>
        {result.data.items.map((member) => (
          <article key={member.membershipId} className="member-page">
            {kind !== 'QUOTES' &&
              (member.photo ? (
                <Photo
                  asset={member.photo}
                  locale={locale}
                  className="portrait"
                />
              ) : (
                <div className="empty-portrait">
                  <span aria-hidden="true">
                    {member.displayName.slice(0, 1)}
                  </span>
                  <p>{t.noPhoto}</p>
                </div>
              ))}
            <div>
              <h3>
                <Link
                  to={`/classes/${classId}/members/${member.membershipId}/profile`}
                >
                  {member.displayName}
                </Link>
              </h3>
              {member.nickname && <p>{member.nickname}</p>}
              {member.quote && <blockquote>{member.quote}</blockquote>}
              {kind !== 'QUOTES' && (
                <>
                  {member.bio && <p className="preserve-lines">{member.bio}</p>}
                  {member.activities && (
                    <p>
                      <strong>{t.activities}</strong>
                      <br />
                      {member.activities}
                    </p>
                  )}
                  {member.aspiration && (
                    <p>
                      <strong>{t.aspiration}</strong>
                      <br />
                      {member.aspiration}
                    </p>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {result.data.items.length === 0 && <p>{t.emptyMembers}</p>}
      <Pagination
        value={result.data}
        change={(next) => {
          setPage(next);
        }}
        locale={locale}
      />
    </>
  );
}
