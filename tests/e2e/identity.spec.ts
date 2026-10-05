import { emailLink } from './mail-helper';
import { test, expect } from './fixtures';
import { randomUUID } from 'node:crypto';
// Browser traces record form secrets and email links. Keep identity screenshots only.
test.use({ trace: 'off' });

test('real registration, inbox verification, login, profile, logout and password recovery', async ({
  page,
  request,
}) => {
  const email = `e2e-${randomUUID()}@example.test`;
  const password = randomUUID() + ' original';
  const replacement = randomUUID() + ' replacement';
  await page.goto('/register');
  await page.getByLabel('Display name').fill('Fictional Reader');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create your account' }).click();
  await expect(page.getByRole('status')).toContainText('Request received.');
  await page.goto(await emailLink(request, email, 'verify-email'));
  await page.getByRole('button', { name: 'Verify your email' }).click();
  await expect(page.getByRole('status')).toContainText('email is verified');
  await expect(page).not.toHaveURL(/token=/);
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page
    .getByLabel('Display name')
    .fill('<script>window.injected = true</script>');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toHaveText('Your changes are saved.');
  await page.reload();
  await expect(page.getByLabel('Display name')).toHaveValue(
    '<script>window.injected = true</script>',
  );
  expect(await page.evaluate(() => 'injected' in window)).toBe(false);
  expect(
    await page.evaluate(() => document.cookie.includes('yearbook_session')),
  ).toBe(false);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  await expect(
    page.getByRole('heading', { name: 'Recover your account', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send recovery link' }).click();
  await expect(page.getByRole('status')).toContainText('Request received.');
  await page.goto(await emailLink(request, email, 'reset-password'));
  await page.getByLabel('Password', { exact: true }).fill(replacement);
  await page.getByRole('button', { name: 'Choose a new password' }).click();
  await expect(page.getByRole('status')).toContainText('Password updated');
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(replacement);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.screenshot({
    path: 'test-results/identity-' + test.info().project.name + '.png',
    fullPage: true,
  });
});

test('identity language choices persist across reload and forms fit a narrow phone', async ({
  page,
}) => {
  await page.goto('/register');
  for (const [locale, title] of [
    ['ht', 'Kreye kont ou'],
    ['fr', 'Créez votre compte'],
    ['es', 'Crea tu cuenta'],
    ['en', 'Create your account'],
  ] as const) {
    await page
      .getByRole('combobox', { name: 'Language / Lang / Langue / Idioma' })
      .selectOption(locale);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
  }
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/register-' + test.info().project.name + '.png',
    fullPage: true,
  });
});
