import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { classRequest, classError, useResource } from './class-api';
import { LoadState } from './ClassCommon';
import { ApiError } from './identity-api';
import type { Locale } from './identity-copy';
import { yearbookCopy } from './yearbook-copy';
import {
  sectionTypes,
  type Section,
  type SectionType,
  type Yearbook,
} from './yearbook-api';
import { Photo, PhotoUpload } from './PhotoUpload';
import { EditionCover } from './EditionCover';

type EditableSection = Omit<Section, 'id'> & { id?: string; key: string };
export function YearbookEditor({ locale }: { locale: Locale }) {
  const { id = '' } = useParams();
  const t = yearbookCopy[locale];
  const result = useResource<Yearbook>(`/classes/${id}/yearbook`);
  return (
    <section className="class-page">
      <Link to={'/classes/' + id}>{t.back}</Link>
      <p className="eyebrow">{t.draft}</p>
      <h1>{t.edit}</h1>
      <p>{t.editorNote}</p>
      {!result.data ? (
        <LoadState error={result.error} retry={result.reload} locale={locale} />
      ) : !result.data.editable ? (
        <p role="alert">{t.unavailable}</p>
      ) : (
        <Editor
          key={id + ':' + result.data.version}
          initial={result.data}
          classId={id}
          locale={locale}
          reload={result.reload}
        />
      )}
    </section>
  );
}
function Editor({
  initial,
  classId,
  locale,
  reload,
}: {
  initial: Yearbook;
  classId: string;
  locale: Locale;
  reload: () => void;
}) {
  const t = yearbookCopy[locale];
  const navigate = useNavigate();
  const [version, setVersion] = useState(initial.version);
  const [title, setTitle] = useState(initial.title);
  const [theme, setTheme] = useState(initial.theme);
  const [sections, setSections] = useState<EditableSection[]>(() =>
    initial.sections.length
      ? initial.sections.map((section) => ({ ...section, key: section.id }))
      : (
          [
            'COVER',
            'MESSAGE',
            'CLASS_PHOTO',
            'MEMBERS',
            'STAFF',
            'QUOTES',
          ] as const
        ).map((type) => ({
          key: crypto.randomUUID(),
          type,
          title: t[type],
          body: '',
          media: [],
        })),
  );
  const [type, setType] = useState<SectionType>('GALLERY');
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  function update(key: string, patch: Partial<EditableSection>) {
    setSections((current) =>
      current.map((section) =>
        section.key === key ? { ...section, ...patch } : section,
      ),
    );
    setSaved(false);
  }
  function move(index: number, direction: number) {
    setSections((current) => {
      const next = [...current];
      const item = next.splice(index, 1)[0];
      if (item) next.splice(index + direction, 0, item);
      return next;
    });
    setSaved(false);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || uploads) return;
    const preview =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') ===
      'preview';
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      const result = await classRequest<{
        version: number;
        sectionIds: string[];
      }>(
        `/classes/${classId}/yearbook`,
        {
          version,
          title: fields.get('title'),
          theme: fields.get('theme'),
          sections: sections.map((section) => ({
            ...(section.id ? { id: section.id } : {}),
            type: section.type,
            title: section.title,
            body: section.body,
            assetIds: section.media.map((media) => media.asset.id),
          })),
        },
        'PATCH',
      );
      setSections((current) =>
        current.map((section, index) => ({
          ...section,
          id: result.sectionIds[index],
        })),
      );
      setVersion(result.version);
      setSaved(true);
      if (preview) void navigate(`/classes/${classId}/yearbook`);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="account-form yearbook-editor"
      onSubmit={(event) => void save(event)}
      onChange={() => setSaved(false)}
      onInvalidCapture={(event) => {
        // Native validation must be able to focus fields inside closed sections.
        const section = (event.target as HTMLElement).closest('details');
        if (section) section.open = true;
      }}
      aria-busy={busy || uploads > 0}
    >
      <div className="edition-settings">
        <div className="edition-settings-fields">
          <label>
            {t.title}
            <input
              name="title"
              disabled={busy}
              maxLength={120}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            {t.theme}
            <select
              name="theme"
              value={theme}
              disabled={busy}
              onChange={(event) =>
                setTheme(event.target.value as Yearbook['theme'])
              }
            >
              {(['PAPER', 'INK', 'GARDEN'] as const).map((theme) => (
                <option key={theme} value={theme}>
                  {t[theme]}
                </option>
              ))}
            </select>
          </label>
          <nav className="editor-outline" aria-label={t.contents}>
            <p className="eyebrow">{t.sections}</p>
            <ol>
              {sections.map((section, index) => (
                <li key={section.key}>
                  <button
                    type="button"
                    onClick={() => {
                      const target = document.getElementById(
                        'edit-section-' + section.key,
                      ) as HTMLDetailsElement | null;
                      if (target) {
                        target.open = true;
                        target.querySelector('summary')?.focus();
                        target.scrollIntoView({ block: 'start' });
                      }
                    }}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {section.title}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
        <div className="edition-swatch" aria-hidden="true">
          <EditionCover
            title={title || t.title}
            theme={theme}
            year={initial.class?.graduationYear}
            school={initial.class?.school.name}
            photo={
              sections.find(
                (section) =>
                  ['COVER', 'CLASS_PHOTO'].includes(section.type) &&
                  section.media.length,
              )?.media[0]?.asset
            }
            locale={locale}
          />
        </div>
      </div>
      <h2>{t.sections}</h2>
      {sections.map((section, index) => (
        <details
          key={section.key}
          id={'edit-section-' + section.key}
          className="section-disclosure"
        >
          <summary>
            <span className="section-number">
              {String(index + 1).padStart(2, '0')}
            </span>{' '}
            {section.title}
          </summary>
          <fieldset className="section-editor" disabled={busy}>
            <legend>
              {String(index + 1).padStart(2, '0')} · {t[section.type]}
            </legend>
            <div className="section-controls">
              <button
                type="button"
                className="secondary-button"
                disabled={index === 0 || uploads > 0}
                onClick={() => move(index, -1)}
                aria-label={t.up + ': ' + section.title}
              >
                {t.up}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={index === sections.length - 1 || uploads > 0}
                onClick={() => move(index, 1)}
                aria-label={t.down + ': ' + section.title}
              >
                {t.down}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={sections.length === 1 || uploads > 0}
                onClick={() => {
                  setSections((current) =>
                    current.filter((item) => item.key !== section.key),
                  );
                  setSaved(false);
                }}
              >
                {t.remove}
              </button>
            </div>
            <label>
              {t.sectionTitle}
              <input
                value={section.title}
                required
                maxLength={120}
                onChange={(event) =>
                  update(section.key, { title: event.target.value })
                }
              />
            </label>
            <label>
              {t.body}
              <textarea
                rows={4}
                value={section.body}
                maxLength={4000}
                onChange={(event) =>
                  update(section.key, { body: event.target.value })
                }
              />
            </label>
            {['MEMBERS', 'STAFF', 'QUOTES'].includes(section.type) && (
              <p className="field-hint">{t.memberNote}</p>
            )}
            <div className="editor-photos">
              {section.media.map(({ asset }) => (
                <figure key={asset.id}>
                  <Photo asset={asset} locale={locale} />
                  <figcaption>{asset.alt}</figcaption>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={uploads > 0}
                    onClick={() =>
                      update(section.key, {
                        media: section.media.filter(
                          (item) => item.asset.id !== asset.id,
                        ),
                      })
                    }
                  >
                    {t.removeImage}
                  </button>
                </figure>
              ))}
            </div>
            {section.media.length < 12 && (
              <PhotoUpload
                disabled={busy}
                classId={classId}
                purpose="YEARBOOK"
                locale={locale}
                busyChanged={(value) =>
                  setUploads((count) => count + (value ? 1 : -1))
                }
                done={(asset) => {
                  setSaved(false);
                  setSections((current) =>
                    current.map((item) =>
                      item.key === section.key
                        ? { ...item, media: [...item.media, { asset }] }
                        : item,
                    ),
                  );
                }}
              />
            )}
          </fieldset>
        </details>
      ))}
      <div className="add-section">
        <label>
          {t.sectionType}
          <select
            value={type}
            disabled={busy}
            onChange={(event) => setType(event.target.value as SectionType)}
          >
            {sectionTypes.map((option) => (
              <option key={option} value={option}>
                {t[option]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="secondary-button"
          disabled={sections.length >= 20 || busy || uploads > 0}
          onClick={() => {
            setSections((current) => [
              ...current,
              {
                key: crypto.randomUUID(),
                type,
                title: t[type],
                body: '',
                media: [],
              },
            ]);
            setSaved(false);
          }}
        >
          {t.addSection}
        </button>
      </div>
      <div className="save-bar">
        {error !== undefined && (
          <div role="alert">
            <p>
              {error instanceof ApiError && error.status === 409
                ? t.conflict
                : classError(error, locale)}
            </p>
            {error instanceof ApiError && error.status === 409 && (
              <button type="button" onClick={reload}>
                {t.reload}
              </button>
            )}
          </div>
        )}
        {saved && <p role="status">{t.saved}</p>}
        <button disabled={busy || uploads > 0}>
          {busy ? t.saving : t.save}
        </button>{' '}
        <button
          type="submit"
          name="intent"
          value="preview"
          className="secondary-button"
          disabled={busy || uploads > 0}
        >
          {t.savePreview}
        </button>
      </div>
    </form>
  );
}
