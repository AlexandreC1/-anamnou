import { test, expect } from './fixtures';

test('a slow page download keeps navigation available and announces loading', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/Identity-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  try {
    await expect(page.getByRole('status')).toHaveText('Loading…');
    await expect(
      page.getByRole('link', { name: 'Appearance', exact: true }),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle('Sign in | Anamnou');
});

test('link intent warms page code without fetching private account data', async ({
  page,
}) => {
  const accountRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/'))
      accountRequests.push(request.url());
  });
  await page.goto('/');
  const loaded = page.waitForResponse((response) =>
    /\/assets\/Identity-[^/]+\.js$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole('link', { name: 'My account', exact: true }).focus();
  expect((await loaded).ok()).toBe(true);
  expect(accountRequests).toEqual([]);
  await page.getByRole('link', { name: 'My account', exact: true }).click();
  // Anonymous visitors are redirected after the fresh account request returns 401.
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toBeFocused();
  await expect.poll(() => accountRequests.length).toBeGreaterThan(0);
});

test('reader navigates real routes, reloads, and checks the real API', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Some chapters',
  );
  await page.getByRole('link', { name: 'Discover the idea' }).click();
  await expect(page).toHaveURL(/\/about$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'A yearbook worth',
  );
  await page.getByRole('link', { name: 'Connection status' }).click();
  await page.getByRole('button', { name: 'Check connection' }).click();
  await expect(page.getByRole('status')).toHaveText('Connection available.');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('connection failure is visible and retry recovers', async ({ page }) => {
  await page.goto('/connection');
  await page.route('**/api/ready', (route) => route.abort());
  await page.getByRole('button', { name: 'Check connection' }).click();
  await expect(page.getByRole('status')).toContainText('couldn’t connect');
  await page.unroute('**/api/ready');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('status')).toHaveText('Connection available.');
});

test('keyboard skip link, unknown route and reduced motion work', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.goto('/missing');
  await expect(
    page.getByRole('heading', { name: 'A missing page.' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Return home' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Some chapters',
  );
});
