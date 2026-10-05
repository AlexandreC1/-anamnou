import { useEffect, useId, useState } from 'react';
import { apiFetch, isNativeApp } from './api-transport';
import { classRequest, classError } from './class-api';
import { ApiError } from './identity-api';
import { yearbookCopy } from './yearbook-copy';
import type { Locale } from './identity-copy';
import type { Asset } from './yearbook-api';

export function Photo({
  asset,
  locale,
  className = '',
}: {
  asset: Asset;
  locale: Locale;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [nativePhoto, setNativePhoto] = useState<{ id: string; url: string }>();
  const native = isNativeApp();
  useEffect(() => {
    if (!native) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void apiFetch(
      '/media/' + asset.id + '/content',
      { signal: controller.signal },
      true,
    )
      .then(async (response) => {
        if (!response.ok) throw new ApiError(response.status);
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setNativePhoto({ id: asset.id, url: objectUrl });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.id, native]);
  return failed ? (
    <p className="photo-fallback">{yearbookCopy[locale].imageUnavailable}</p>
  ) : native && nativePhoto?.id !== asset.id ? (
    <div
      className={className}
      aria-busy="true"
      style={{ aspectRatio: `${asset.width || 480} / ${asset.height || 600}` }}
    />
  ) : (
    <img
      className={className}
      src={native ? nativePhoto?.url : '/api/media/' + asset.id + '/content'}
      width={asset.width || 480}
      height={asset.height || 600}
      alt={asset.alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
export function PhotoUpload({
  classId,
  purpose,
  locale,
  done,
  busyChanged,
  disabled = false,
}: {
  classId: string;
  purpose: 'PROFILE' | 'YEARBOOK';
  locale: Locale;
  done: (asset: Asset) => void;
  busyChanged?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const t = yearbookCopy[locale];
  const id = useId();
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  async function upload(file: File | undefined) {
    if (!file || busy || disabled) return;
    setError('');
    setStatus('');
    if (
      !alt.trim() ||
      file.size > 8 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      setError(t.badImage + ' ' + t.alt + '.');
      return;
    }
    setBusy(true);
    busyChanged?.(true);
    try {
      const intent = await classRequest<{ id: string }>(
        '/media/upload-intent',
        {
          classId,
          purpose,
          contentType: file.type,
          size: file.size,
          alt: alt.trim(),
        },
      );
      const response = await apiFetch(
        '/media/' + intent.id + '/content',
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: file,
          signal: AbortSignal.timeout(60000),
        },
        false,
        60000,
      );
      if (!response.ok) throw new ApiError(response.status);
      const asset = await classRequest<Asset>(
        '/media/' + intent.id + '/complete',
        {},
      );
      done(asset);
      setStatus(t.uploaded);
    } catch (caught) {
      setError(
        caught instanceof ApiError && [400, 413, 415].includes(caught.status)
          ? t.badImage
          : classError(caught, locale),
      );
    } finally {
      setBusy(false);
      busyChanged?.(false);
    }
  }
  return (
    <fieldset className="photo-upload" disabled={busy || disabled}>
      <legend>{purpose === 'PROFILE' ? t.photo : t.gallery}</legend>
      <p className="field-hint" id={id}>
        {purpose === 'PROFILE' ? t.imageHelp : t.imageHelp.split('. ')[0]}
      </p>
      <label>
        {t.alt}
        <input
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          maxLength={240}
        />
      </label>
      <label className="file-choice">
        {t.upload}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={id}
          disabled={!alt.trim() || busy}
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </label>
      {busy && <p role="status">{t.uploading}</p>}
      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
