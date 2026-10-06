import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { classRequest, useResource } from './class-api';
import { LoadState, SaveError } from './ClassCommon';
import { ApiError } from './identity-api';
import type { Locale } from './identity-copy';
import { yearbookCopy } from './yearbook-copy';
import type { Asset, Profile } from './yearbook-api';
import { Photo, PhotoUpload } from './PhotoUpload';

export function MemberProfile({ locale }: { locale: Locale }) {
  const { id = '', memberId = 'me' } = useParams();
  const t = yearbookCopy[locale];
  const result = useResource<Profile>(
    `/classes/${id}/members/${memberId}/profile`,
  );
  return (
    <section className="class-page">
      <Link to={'/classes/' + id}>{t.back}</Link>
      <p className="eyebrow">{t.yearbook}</p>
      <h1>
        {memberId === 'me'
          ? t.profileTitle
          : (result.data?.displayName ?? t.yourPage)}
      </h1>
      {!result.data ? (
        result.error instanceof ApiError && result.error.status === 404 ? (
          <p role="alert">{t.unavailable}</p>
        ) : (
          <LoadState
            error={result.error}
            retry={result.reload}
            locale={locale}
          />
        )
      ) : memberId === 'me' ? (
        <ProfileEditor
          key={id + ':' + result.data.version}
          initial={result.data}
          classId={id}
          locale={locale}
          reload={result.reload}
        />
      ) : (
        <article className="profile-view">
          {result.data.photoAssetId && (
            <Photo
              key={result.data.photoAssetId}
              asset={
                result.data.photo ?? {
                  id: result.data.photoAssetId,
                  alt: result.data.displayName,
                  width: 480,
                  height: 600,
                }
              }
              locale={locale}
              className="portrait"
            />
          )}
          {result.data.quote && <blockquote>{result.data.quote}</blockquote>}
          {(
            ['nickname', 'bio', 'activities', 'aspiration', 'contact'] as const
          ).map(
            (field) =>
              result.data?.[field] && (
                <div key={field}>
                  <h2>{t[field]}</h2>
                  <p className="preserve-lines">{result.data[field]}</p>
                </div>
              ),
          )}
        </article>
      )}
    </section>
  );
}
function ProfileEditor({
  initial,
  classId,
  locale,
  reload,
}: {
  initial: Profile;
  classId: string;
  locale: Locale;
  reload: () => void;
}) {
  const t = yearbookCopy[locale];
  const navigate = useNavigate();
  const [version, setVersion] = useState(initial.version);
  const [photo, setPhoto] = useState<Asset | null>(
    initial.photo ??
      (initial.photoAssetId
        ? {
            id: initial.photoAssetId,
            alt: initial.displayName,
            width: 480,
            height: 600,
          }
        : null),
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || uploading) return;
    const preview =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') ===
      'preview';
    const fields = new FormData(event.currentTarget);
    const optional = Object.fromEntries(
      ['nickname', 'bio', 'quote', 'activities', 'aspiration', 'contact'].map(
        (key) => [key, String(fields.get(key) ?? '').trim() || null],
      ),
    );
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      const result = await classRequest<Profile>(
        `/classes/${classId}/members/me/profile`,
        {
          ...optional,
          version,
          displayName: fields.get('displayName'),
          visibility: fields.get('visibility'),
          contactVisibility: fields.get('contactVisibility'),
          photoAssetId: photo?.id ?? null,
        },
        'PATCH',
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
  async function remove() {
    if (!photo) return;
    setBusy(true);
    setError(undefined);
    try {
      const deleted = await classRequest<{ profileVersion: number }>(
        '/media/' + photo.id,
        { profileVersion: version },
        'DELETE',
      );
      setPhoto(null);
      setVersion(deleted.profileVersion);
      setConfirmDelete(false);
      setSaved(false);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="profile-editor account-form"
      onSubmit={(event) => void save(event)}
      onChange={() => setSaved(false)}
      aria-busy={busy || uploading}
    >
      <aside className="profile-photo-column">
        {photo ? (
          <Photo
            key={photo.id}
            asset={photo}
            locale={locale}
            className="portrait"
          />
        ) : (
          <div className="empty-portrait">
            <span aria-hidden="true">{initial.displayName.slice(0, 1)}</span>
            <p>{t.noPhoto}</p>
          </div>
        )}
        <PhotoUpload
          disabled={busy}
          classId={classId}
          purpose="PROFILE"
          locale={locale}
          done={(asset) => {
            setPhoto(asset);
            setSaved(false);
          }}
          busyChanged={setUploading}
        />
        {photo &&
          (confirmDelete ? (
            <div>
              <p>{t.removeConfirm}</p>
              <button
                type="button"
                disabled={busy || uploading}
                onClick={() => void remove()}
              >
                {t.removePhoto}
              </button>{' '}
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirmDelete(false)}
              >
                {t.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="secondary-button"
              disabled={busy || uploading}
              onClick={() => setConfirmDelete(true)}
            >
              {t.removePhoto}
            </button>
          ))}
      </aside>
      <div className="profile-fields">
        <p className="intro">{t.profileIntro}</p>
        <label>
          {t.name}
          <input
            name="displayName"
            disabled={busy}
            required
            maxLength={80}
            defaultValue={initial.displayName}
          />
        </label>
        {(
          [
            ['nickname', 80],
            ['bio', 1000],
            ['quote', 280],
            ['activities', 500],
            ['aspiration', 280],
            ['contact', 300],
          ] as const
        ).map(([field, max]) => (
          <label key={field}>
            <span className="field-label">
              {t[field]} <span className="field-hint">{t.optional}</span>
            </span>
            {field === 'nickname' ? (
              <input
                name={field}
                disabled={busy}
                maxLength={max}
                defaultValue={initial[field] ?? ''}
              />
            ) : (
              <textarea
                name={field}
                disabled={busy}
                rows={field === 'bio' ? 4 : 2}
                maxLength={max}
                defaultValue={initial[field] ?? ''}
              />
            )}
          </label>
        ))}
        <fieldset className="privacy-fields" disabled={busy}>
          <legend>{t.privacy}</legend>
          <p>{t.privacyNote}</p>
          <label>
            {t.privacy}
            <select name="visibility" defaultValue={initial.visibility}>
              <option value="PRIVATE">{t.private}</option>
              <option value="CLASS">{t.shared}</option>
            </select>
          </label>
          <label>
            {t.contactPrivacy}
            <select
              name="contactVisibility"
              defaultValue={initial.contactVisibility ?? 'PRIVATE'}
            >
              <option value="PRIVATE">{t.private}</option>
              <option value="CLASS">{t.shared}</option>
            </select>
          </label>
          <p className="field-hint">{t.contactNote}</p>
        </fieldset>
        <div className="save-bar">
          <SaveError error={error} locale={locale} onReload={reload} />
          {saved && <p role="status">{t.saved}</p>}
          <button disabled={busy || uploading}>
            {busy ? t.saving : t.save}
          </button>{' '}
          <button
            type="submit"
            name="intent"
            value="preview"
            className="secondary-button"
            disabled={busy || uploading}
          >
            {t.savePreview}
          </button>
        </div>
      </div>
    </form>
  );
}
