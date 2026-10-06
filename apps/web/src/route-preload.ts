// Only public application code is warmed; account and class data remain uncached.
export const routeModules = {
  identity: () => import('./Identity'),
  classes: () => import('./Classes'),
  manage: () => import('./ClassManage'),
  profile: () => import('./MemberProfile'),
  editor: () => import('./YearbookEditor'),
  reader: () => import('./YearbookReader'),
  security: () => import('./SecuritySettings'),
};

export function routeModule(
  path: string,
): keyof typeof routeModules | undefined {
  if (path === '/settings/security') return 'security';
  if (
    /^\/(profile|register|login|forgot-password|reset-password|verify-email|resend-verification)$/.test(
      path,
    )
  )
    return 'identity';
  if (/^\/classes\/[^/]+\/yearbook\/edit$/.test(path)) return 'editor';
  if (/^\/classes\/[^/]+\/yearbook$/.test(path)) return 'reader';
  if (/^\/classes\/[^/]+\/members\/[^/]+\/profile$/.test(path))
    return 'profile';
  if (/^\/classes\/[^/]+\/(manage|members)$/.test(path)) return 'manage';
  if (/^\/(classes|schools)(\/|$)/.test(path) || path === '/join')
    return 'classes';
}

export function allowPreload(connection?: {
  saveData?: boolean;
  effectiveType?: string;
}) {
  return (
    !connection?.saveData &&
    !['slow-2g', '2g'].includes(connection?.effectiveType ?? '')
  );
}

const pending = new Map<string, Promise<unknown>>();
export function preloadRoute(path: string): Promise<unknown> | undefined {
  const connection = (
    navigator as Navigator & { connection?: Parameters<typeof allowPreload>[0] }
  ).connection;
  const key = routeModule(path);
  if (!key || !allowPreload(connection)) return;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = routeModules[key]().catch((error: unknown) => {
    pending.delete(key);
    console.warn('Page preload failed; navigation will retry.', error);
  });
  pending.set(key, request);
  return request;
}
