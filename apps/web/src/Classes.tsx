import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { classCopy } from './class-copy';
import {
  useResource,
  type ClassDetail,
  type ClassSummary,
  type Page,
  type School,
} from './class-api';
import { LoadState, Pagination, ResourceForm, TextField } from './ClassCommon';
import type { Locale } from './identity-copy';

export function ClassesHome({ locale }: { locale: Locale }) {
  const t = classCopy[locale];
  const [page, setPage] = useState(1);
  const result = useResource<Page<ClassSummary>>('/me/classes?page=' + page);
  return (
    <section className="class-page">
      <p className="eyebrow">Anamnou</p>
      <h1>{t.myClasses}</h1>
      <p className="intro">{t.intro}</p>
      <nav className="class-actions" aria-label={t.myClasses}>
        <Link to="/schools/new">{t.createSchool}</Link>
        <Link to="/classes/new">{t.createClass}</Link>
        <Link to="/join">{t.join}</Link>
      </nav>
      {!result.data ? (
        <LoadState error={result.error} retry={result.reload} locale={locale} />
      ) : (
        <>
          {result.data.items.length === 0 ? (
            <p className="class-empty">{t.empty}</p>
          ) : (
            <ul className="class-list">
              {result.data.items.map((klass) => (
                <li key={klass.id}>
                  <div>
                    <p className="eyebrow">
                      {klass.school.name} · {klass.graduationYear}
                    </p>
                    <h2>
                      <Link to={'/classes/' + klass.id}>{klass.name}</Link>
                    </h2>
                    {klass.motto && <p>{klass.motto}</p>}
                  </div>
                  <span aria-hidden="true">↗</span>
                </li>
              ))}
            </ul>
          )}
          <Pagination value={result.data} change={setPage} locale={locale} />
        </>
      )}
    </section>
  );
}
export function SchoolForm({ locale }: { locale: Locale }) {
  const t = classCopy[locale];
  const navigate = useNavigate();
  return (
    <section className="class-page class-form">
      <p className="eyebrow">Anamnou</p>
      <h1>{t.createSchool}</h1>
      <p>{t.schoolNotice}</p>
      <ResourceForm
        path="/schools"
        locale={locale}
        label={t.create}
        body={(data) => ({
          name: data.get('name'),
          location: data.get('location') || null,
        })}
        done={() => navigate('/classes/new')}
      >
        <SchoolFields locale={locale} />
      </ResourceForm>
      <p>
        <Link to="/classes">{t.back}</Link>
      </p>
    </section>
  );
}
function SchoolFields({ locale, school }: { locale: Locale; school?: School }) {
  const t = classCopy[locale];
  return (
    <>
      <TextField name="name" label={t.schoolName} value={school?.name} />
      <TextField
        name="location"
        label={t.location}
        value={school?.location}
        optional
      />
    </>
  );
}
export function SchoolManage({ locale }: { locale: Locale }) {
  const { id = '' } = useParams();
  const t = classCopy[locale];
  const result = useResource<School>('/schools/' + id);
  return (
    <section className="class-page class-form">
      <h1>{t.schoolManage}</h1>
      {!result.data ? (
        <LoadState error={result.error} retry={result.reload} locale={locale} />
      ) : (
        <ResourceForm
          key={id}
          path={'/schools/' + id}
          method="PATCH"
          locale={locale}
          label={t.save}
          body={(data) => ({
            name: data.get('name'),
            location: data.get('location') || null,
          })}
        >
          <SchoolFields locale={locale} school={result.data} />
        </ResourceForm>
      )}
      <p>
        <Link to="/classes">{t.back}</Link>
      </p>
    </section>
  );
}
export function ClassFields({
  locale,
  klass,
}: {
  locale: Locale;
  klass?: ClassSummary;
}) {
  const t = classCopy[locale];
  return (
    <>
      <TextField name="name" label={t.name} value={klass?.name} />
      <label>
        {t.year}
        <input
          name="graduationYear"
          type="number"
          required
          min={1900}
          max={2200}
          defaultValue={klass?.graduationYear ?? new Date().getFullYear()}
        />
      </label>
      <TextField
        name="motto"
        label={t.motto}
        value={klass?.motto}
        max={240}
        optional
      />
    </>
  );
}
export const classFieldsBody = (data: FormData) => ({
  name: data.get('name'),
  graduationYear: Number(data.get('graduationYear')),
  motto: data.get('motto') || null,
});
export function CreateClass({ locale }: { locale: Locale }) {
  const t = classCopy[locale];
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const schools = useResource<Page<School>>('/me/schools?page=' + page);
  return (
    <section className="class-page class-form">
      <p className="eyebrow">Anamnou</p>
      <h1>{t.createClass}</h1>
      {!schools.data ? (
        <LoadState
          error={schools.error}
          retry={schools.reload}
          locale={locale}
        />
      ) : schools.data.items.length === 0 ? (
        <>
          <p>{t.noSchools}</p>
          <Link to="/schools/new">{t.createSchool}</Link>
        </>
      ) : (
        <>
          <ResourceForm
            key={page}
            path="/classes"
            locale={locale}
            label={t.createClass}
            body={(data) => ({
              ...classFieldsBody(data),
              schoolId: data.get('schoolId'),
            })}
            done={(result) =>
              navigate('/classes/' + (result as { id: string }).id)
            }
          >
            <label>
              {t.school}
              <select name="schoolId" required>
                {schools.data.items.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
            <ClassFields locale={locale} />
          </ResourceForm>
          <Pagination value={schools.data} change={setPage} locale={locale} />
          <ul>
            {schools.data.items.map((school) => (
              <li key={school.id}>
                <Link to={'/schools/' + school.id + '/manage'}>
                  {t.schoolManage}: {school.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <p>
        <Link to="/classes">{t.back}</Link>
      </p>
    </section>
  );
}
export function ClassHome({ locale }: { locale: Locale }) {
  const { id = '' } = useParams();
  const t = classCopy[locale];
  const result = useResource<ClassDetail>('/classes/' + id);
  useEffect(() => {
    if (result.data) document.title = result.data.name + ' — Anamnou';
  }, [result.data]);
  return (
    <section className="class-page">
      {!result.data ? (
        <>
          <h1>{t.myClasses}</h1>
          <LoadState
            error={result.error}
            retry={result.reload}
            locale={locale}
          />
        </>
      ) : (
        <>
          <p className="eyebrow">
            {result.data.school.name} · {result.data.graduationYear}
          </p>
          <h1>{result.data.name}</h1>
          {result.data.motto && <p className="intro">{result.data.motto}</p>}
          <p>{t.private}</p>
          <nav className="class-actions" aria-label={t.myClasses}>
            {result.data.permissions.directory && (
              <Link to={'/classes/' + id + '/members'}>
                {t.members} ({result.data.memberCount})
              </Link>
            )}
            {result.data.permissions.manage && (
              <Link to={'/classes/' + id + '/manage'}>{t.manage}</Link>
            )}
          </nav>
        </>
      )}
      <p>
        <Link to="/classes">{t.back}</Link>
      </p>
    </section>
  );
}
export function JoinClass({ locale }: { locale: Locale }) {
  const t = classCopy[locale];
  const navigate = useNavigate();
  const [code] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('code') ?? '',
  );
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname);
  }, []);
  return (
    <section className="class-page class-form">
      <p className="eyebrow">Anamnou</p>
      <h1>{t.join}</h1>
      <p>{t.joinIntro}</p>
      <ResourceForm
        path="/invitations/accept"
        locale={locale}
        label={t.accept}
        body={(data) => ({ code: data.get('code') })}
        done={(result) =>
          navigate('/classes/' + (result as { classId: string }).classId)
        }
      >
        <label>
          {t.code}
          <input
            name="code"
            required
            minLength={32}
            maxLength={32}
            pattern="[a-fA-F0-9]{32}"
            defaultValue={code}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </ResourceForm>
      <p>{t.returnJoin}</p>
      <nav className="class-actions" aria-label={t.join}>
        <Link to="/login" target="_blank" rel="noreferrer">
          {t.signIn}
        </Link>
        <Link to="/register" target="_blank" rel="noreferrer">
          {t.register}
        </Link>
      </nav>
      <p>
        <Link to="/classes">{t.back}</Link>
      </p>
    </section>
  );
}
