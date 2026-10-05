import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { apiFetch, nativeApiOrigin } from './api-transport';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn() },
  CapacitorHttp: { request: vi.fn() },
}));

describe('shared web/native API transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.stubEnv('VITE_NATIVE_API_ORIGIN', 'https://yearbook.example');
    vi.mocked(CapacitorHttp.request).mockResolvedValue({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      data: { ok: true },
      url: '',
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('keeps browser requests same-origin', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}'));
    await apiFetch('/me', { credentials: 'same-origin' });
    expect(fetch).toHaveBeenCalledWith('/api/me', {
      credentials: 'same-origin',
    });
    expect(CapacitorHttp.request).not.toHaveBeenCalled();
  });
  it('uses the configured origin and native cookie store without JavaScript session tokens', async () => {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.test', password: 'test' }),
    });
    expect(CapacitorHttp.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://yearbook.example/api/auth/login',
        headers: {
          'content-type': 'application/json',
          Origin: 'https://yearbook.example',
        },
        disableRedirects: true,
      }),
    );
    expect(await response.json()).toEqual({ ok: true });
  });
  it('encodes raw photo bytes for native upload and decodes private photos', async () => {
    await apiFetch('/media/id/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Blob(['photo']),
    });
    expect(CapacitorHttp.request).toHaveBeenCalledWith(
      expect.objectContaining({ data: 'cGhvdG8=', dataType: 'file' }),
    );
    vi.mocked(CapacitorHttp.request).mockResolvedValueOnce({
      status: 200,
      headers: { 'Content-Type': 'image/png' },
      data: 'cGhvdG8=',
      url: '',
    });
    const response = await apiFetch('/media/id/content', {}, true);
    expect(await response.text()).toBe('photo');
  });
  it('preserves HTTP errors for existing auth and recovery flows', async () => {
    vi.mocked(CapacitorHttp.request).mockResolvedValueOnce({
      status: 401,
      headers: {},
      data: { message: 'Unauthorized' },
      url: '',
    });
    expect((await apiFetch('/me')).status).toBe(401);
  });
  it('does not dispatch an already aborted request', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      apiFetch('/me', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(CapacitorHttp.request).not.toHaveBeenCalled();
  });
  it('rejects remote HTTP, credentials, paths, and protocol-relative API targets', async () => {
    for (const origin of [
      'http://example.com',
      'https://user:password@example.com',
      'https://example.com/path',
      'https://example.com?query=1',
    ])
      expect(() => nativeApiOrigin(origin)).toThrow();
    expect(nativeApiOrigin('http://127.0.0.1:3010')).toBe(
      'http://127.0.0.1:3010',
    );
    await expect(apiFetch('//other.example/me')).rejects.toThrow();
  });
});
