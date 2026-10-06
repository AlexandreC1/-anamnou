import { expect, it, vi } from 'vitest';
import {
  allowPreload,
  preloadRoute,
  routeModule,
  routeModules,
} from './route-preload';

it('selects the intended page, including nested profiles and editor routes', () => {
  expect(routeModule('/classes/c/yearbook/edit')).toBe('editor');
  expect(routeModule('/classes/c/yearbook')).toBe('reader');
  expect(routeModule('/classes/c/members/me/profile')).toBe('profile');
  expect(routeModule('/classes/c/manage')).toBe('manage');
  expect(routeModule('/classes/new')).toBe('classes');
  expect(routeModule('/login')).toBe('identity');
  expect(routeModule('/settings/security')).toBe('security');
  expect(routeModule('/')).toBeUndefined();
});

it('respects data saving and slow connections', () => {
  expect(allowPreload({ saveData: true })).toBe(false);
  expect(allowPreload({ effectiveType: '2g' })).toBe(false);
  expect(allowPreload({ effectiveType: 'slow-2g' })).toBe(false);
  expect(allowPreload({ effectiveType: '4g' })).toBe(true);
  expect(allowPreload()).toBe(true);
});

it('deduplicates intent and retries failed preloads without fetching private data', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const loader = vi
    .spyOn(routeModules, 'security')
    .mockRejectedValueOnce(new Error('offline'));
  const fetch = vi.spyOn(globalThis, 'fetch');
  const first = preloadRoute('/settings/security');
  expect(preloadRoute('/settings/security')).toBe(first);
  await first;
  expect(loader).toHaveBeenCalledTimes(1);
  loader.mockResolvedValueOnce(
    {} as Awaited<ReturnType<typeof routeModules.security>>,
  );
  await preloadRoute('/settings/security');
  expect(loader).toHaveBeenCalledTimes(2);
  expect(fetch).not.toHaveBeenCalled();
  loader.mockRestore();
  fetch.mockRestore();
  warning.mockRestore();
});
