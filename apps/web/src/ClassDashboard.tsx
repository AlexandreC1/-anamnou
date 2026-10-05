import { Link } from 'react-router';
import { useResource, type ClassDetail, type Page } from './class-api';
import { LoadState } from './ClassCommon';
import type { Locale } from './identity-copy';
import { yearbookCopy } from './yearbook-copy';
import type { Yearbook, ReaderMember } from './yearbook-api';
import { EditionCover } from './EditionCover';
import { Photo } from './PhotoUpload';

export function ClassDashboard({
  klass,
  locale,
}: {
  klass: ClassDetail;
  locale: Locale;
}) {
  const t = yearbookCopy[locale];
  const base = '/classes/' + klass.id;
  return (
    <>
      <div className="dashboard-opening">
        <div>
          <h1>{klass.name}</h1>
          <p className="intro">{klass.motto || t.contribute}</p>
          {klass.permissions.directory && (
            <div className="dashboard-primary">
              {klass.permissions.manage ? (
                <>
                  <Link className="primary-link" to={base + '/yearbook/edit'}>
                    {t.edit}
                  </Link>
                  <Link to={base + '/manage'}>{t.invitation}</Link>
                </>
              ) : (
                klass.permissions.contribute && (
                  <Link
                    className="primary-link"
                    to={base + '/members/me/profile'}
                  >
                    {t.yourProfile}
                  </Link>
                )
              )}
              <Link to={base + '/members'}>
                {t.members} ({klass.memberCount})
              </Link>
            </div>
          )}
          {klass.permissions.manage && klass.permissions.contribute && (
            <p>
              <Link to={base + '/members/me/profile'}>{t.yourProfile}</Link>
            </p>
          )}
        </div>
      </div>
      {klass.permissions.directory && (
        <DashboardCover klass={klass} locale={locale} />
      )}
      {klass.permissions.directory && (
        <ClassVoices classId={klass.id} locale={locale} />
      )}
      {klass.permissions.manage && (
        <>
          <ContributionProgress classId={klass.id} locale={locale} />
          <div className="dashboard-tools">
            <Link to={base + '/manage'}>
              <span className="eyebrow">01</span>
              <h2>{t.manage}</h2>
              <p>{t.manageNote}</p>
            </Link>
            <Link to={base + '/yearbook/edit'}>
              <span className="eyebrow">02</span>
              <h2>{t.edit}</h2>
              <p>{t.editNote}</p>
            </Link>
          </div>
        </>
      )}
    </>
  );
}
function ClassVoices({ classId, locale }: { classId: string; locale: Locale }) {
  const t = yearbookCopy[locale];
  const people = useResource<Page<ReaderMember>>(
    `/classes/${classId}/yearbook/members?page=1&pageSize=3&kind=MEMBERS`,
  );
  const featured = people.data?.items.find((member) => member.quote);
  return (
    <section className="class-voices">
      <div className="class-voice-intro">
        <p className="eyebrow">{t.members}</p>
        {featured ? (
          <>
            <blockquote>{featured.quote}</blockquote>
            <Link
              to={`/classes/${classId}/members/${featured.membershipId}/profile`}
            >
              {featured.displayName}
            </Link>
          </>
        ) : (
          <>
            <h2>{t.MEMBERS}</h2>
            <p>{t.memberNote}</p>
          </>
        )}
      </div>
      <div>
        {!people.data ? (
          <LoadState
            error={people.error}
            retry={people.reload}
            locale={locale}
          />
        ) : people.data.items.length === 0 ? (
          <p>{t.emptyMembers}</p>
        ) : (
          <div className="class-contact-sheet">
            {people.data.items.slice(0, 3).map((member) => (
              <Link
                key={member.membershipId}
                to={`/classes/${classId}/members/${member.membershipId}/profile`}
              >
                {member.photo ? (
                  <Photo
                    asset={member.photo}
                    locale={locale}
                    className="portrait"
                  />
                ) : (
                  <span className="contact-initial" aria-hidden="true">
                    {member.displayName.slice(0, 1)}
                  </span>
                )}
                <span>{member.displayName}</span>
              </Link>
            ))}
          </div>
        )}
        <Link className="class-voices-link" to={`/classes/${classId}/members`}>
          {t.members}
        </Link>
      </div>
    </section>
  );
}
function DashboardCover({
  klass,
  locale,
}: {
  klass: ClassDetail;
  locale: Locale;
}) {
  const t = yearbookCopy[locale];
  const draft = useResource<Yearbook>(`/classes/${klass.id}/yearbook`);
  const coverPhoto = draft.data?.sections.find(
    (section) =>
      ['COVER', 'CLASS_PHOTO'].includes(section.type) &&
      section.media.length > 0,
  )?.media[0]?.asset;
  if (!draft.data)
    return (
      <LoadState error={draft.error} retry={draft.reload} locale={locale} />
    );
  const message = draft.data.sections.find(
    (section) => section.type === 'MESSAGE' && section.body,
  );
  return (
    <section className="edition-desk" aria-label={t.preview}>
      <div className="book-spread">
        <Link
          to={`/classes/${klass.id}/yearbook`}
          className="book-cover-link"
          aria-label={t.preview}
        >
          <EditionCover
            title={draft.data.title}
            year={klass.graduationYear}
            school={klass.school.name}
            theme={draft.data.theme}
            photo={coverPhoto}
            locale={locale}
          />
        </Link>
        <div className="book-opening-page">
          <p className="eyebrow">
            {t.draft} / {message ? t.MESSAGE : t.contents}
          </p>
          <h2>{message?.title ?? t.yearbook}</h2>
          {message ? (
            <p className="opening-message preserve-lines">{message.body}</p>
          ) : (
            <ol className="spread-contents">
              {draft.data.sections.map((section, index) => (
                <li key={section.id}>
                  <Link
                    to={`/classes/${klass.id}/yearbook#section-${section.id}`}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {section.title}
                  </Link>
                </li>
              ))}
            </ol>
          )}
          {!message && draft.data.sections.length === 0 && <p>{t.empty}</p>}
          <Link className="book-open-link" to={`/classes/${klass.id}/yearbook`}>
            {t.preview}
          </Link>
        </div>
      </div>
    </section>
  );
}
function ContributionProgress({
  classId,
  locale,
}: {
  classId: string;
  locale: Locale;
}) {
  const t = yearbookCopy[locale];
  const result = useResource<{
    members: number;
    profiles: number;
    photos: number;
    quotes: number;
  }>(`/classes/${classId}/profile-progress`);
  return (
    <section className="contribution-progress">
      <h2>{t.progress}</h2>
      {!result.data ? (
        <LoadState error={result.error} retry={result.reload} locale={locale} />
      ) : (
        <dl>
          {(['profiles', 'photos', 'quotes'] as const).map((key) => (
            <div key={key}>
              <dt>{t[key]}</dt>
              <dd>
                <span>{result.data?.[key]}</span> / {result.data?.members}
              </dd>
              <progress
                value={result.data?.[key]}
                max={result.data?.members || 1}
                aria-label={t[key]}
              />
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
