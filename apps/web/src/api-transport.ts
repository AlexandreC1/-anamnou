import { Capacitor, CapacitorHttp } from '@capacitor/core';

export const isNativeApp = () => Capacitor.isNativePlatform();

export function nativeApiOrigin(value: string | undefined): string {
  if (!value) throw new Error('The native API origin is not configured.');
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'Use an HTTPS web origin, or loopback HTTP for USB development.',
    );
  return url.origin;
}

async function fileData(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error('Cannot read photo.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(blob);
  });
}

// The native HTTP implementation keeps HttpOnly session cookies in the platform
// cookie store. Tokens never enter localStorage or JavaScript-owned persistence.
// Browser requests retain the existing same-origin fetch/CSRF behavior.
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  binary = false,
  timeout = 12000,
): Promise<Response> {
  if (!path.startsWith('/') || path.startsWith('//'))
    throw new Error('Invalid API path.');
  if (!isNativeApp()) return fetch('/api' + path, init);
  const origin = nativeApiOrigin(import.meta.env.VITE_NATIVE_API_ORIGIN);
  const signal = init.signal;
  signal?.throwIfAborted();
  const headers = Object.fromEntries(new Headers(init.headers).entries());
  // Native network clients do not automatically send a browser Origin header.
  // Use only this build's configured web origin; server auth and roles still apply.
  headers.Origin = origin;
  let data: string | undefined;
  let dataType: 'file' | undefined;
  if (init.body instanceof Blob) {
    data = await fileData(init.body);
    dataType = 'file';
  } else if (typeof init.body === 'string') {
    data = init.body;
  } else if (init.body != null) {
    throw new Error('Unsupported native request body.');
  }
  signal?.throwIfAborted();
  const request = CapacitorHttp.request({
    url: origin + '/api' + path,
    method: init.method ?? 'GET',
    headers,
    data,
    dataType,
    responseType: binary ? 'arraybuffer' : 'json',
    connectTimeout: timeout,
    readTimeout: timeout,
    disableRedirects: true,
  });
  // The bridge has bounded network timeouts but no cancellation method. Stop
  // delivery to an unmounted view immediately and remove the abort listener.
  const result = await new Promise<Awaited<typeof request>>(
    (resolve, reject) => {
      const abort = () =>
        reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      request
        .then(resolve, reject)
        .finally(() => signal?.removeEventListener('abort', abort));
    },
  );
  signal?.throwIfAborted();
  let body: BodyInit | null = null;
  if (![204, 205, 304].includes(result.status)) {
    body =
      binary && typeof result.data === 'string'
        ? Uint8Array.from(atob(result.data), (character) =>
            character.charCodeAt(0),
          )
        : typeof result.data === 'string'
          ? result.data
          : JSON.stringify(result.data);
  }
  return new Response(body, { status: result.status, headers: result.headers });
}
