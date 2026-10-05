import { type Page, type APIRequestContext } from '@playwright/test';
import { test, expect } from './fixtures';
import { randomUUID } from 'node:crypto';
import { emailLink } from './mail-helper';

test.use({ trace: 'off' });
async function register(page: Page, request: APIRequestContext, name: string) {
  const email = 'classes-' + randomUUID() + '@example.test';
  const password = randomUUID() + ' secure';
  await page.goto('/register');
  await page.getByLabel('Display name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create your account' }).click();
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open test inbox' }),
  ).toHaveAttribute('href', 'http://localhost:8025');
  await page.goto(await emailLink(request, email, 'verify-email'));
  await page.getByRole('button', { name: 'Verify your email' }).click();
  await expect(page.getByRole('status')).toContainText('email is verified');
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
}
test('president creates school/class, shares invitation QR, student joins and admin manages membership', async ({
  page,
  browser,
  request,
  baseURL,
}) => {
  const suffix = randomUUID().slice(0, 8);
  await register(page, request, 'President ' + suffix);
  await page.goto('/classes');
  await expect(
    page.getByText('Your class story starts here.', { exact: false }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Create a school workspace', exact: true })
    .click();
  await page
    .getByLabel('School name', { exact: true })
    .fill('Fictional School ' + suffix);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Create a class' }),
  ).toBeVisible();
  await page.getByLabel('Class name').fill('Class ' + suffix);
  await page.getByLabel('Graduation year').fill('2026');
  await page.getByLabel('Motto').fill('Our next chapter');
  await page.getByRole('button', { name: 'Create a class' }).click();
  await expect(
    page.getByRole('heading', { name: 'Class ' + suffix }),
  ).toBeVisible();
  const classUrl = page.url();
  await page.getByRole('link', { name: /Members & invitations/ }).click();
  await page.getByLabel('Maximum uses').fill('1');
  await page.getByRole('button', { name: 'Create invitation' }).click();
  await expect(
    page.getByRole('img', { name: 'QR code for this invitation link' }),
  ).toBeVisible();
  const url = await page
    .getByLabel('Invitation link', { exact: true })
    .inputValue();
  const code = await page
    .getByLabel('Invitation code', { exact: true })
    .inputValue();
  expect(new URL(url).hash).toBe('#code=' + code);
  const student = await browser.newPage({ baseURL });
  try {
    await register(student, request, 'Student ' + suffix);
    await student.goto(url);
    await expect(student.getByLabel('Invitation code')).toHaveValue(code);
    await expect(student).not.toHaveURL(/code=/);
    await student.getByRole('button', { name: 'Accept invitation' }).click();
    await expect(
      student.getByRole('heading', { name: 'Class ' + suffix }),
    ).toBeVisible();
    await expect(
      student.getByRole('link', { name: /Members & invitations/ }),
    ).toHaveCount(0);
    await student
      .getByRole('navigation', { name: 'Class navigation' })
      .getByRole('link', { name: 'Class members', exact: true })
      .click();
    await expect(
      student.getByRole('heading', { name: 'President ' + suffix }),
    ).toBeVisible();
    await expect(student.locator('select[name="role"]')).toHaveCount(0);
    await page.goto(classUrl + '/members');
    const row = page.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: 'Student ' + suffix }),
    });
    await expect(row).toBeVisible();
    await row
      .getByRole('combobox', { name: 'Role', exact: true })
      .selectOption('STAFF');
    await row.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      row.getByText('Teacher / staff · Active', { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: 'test-results/classes-' + test.info().project.name + '.png',
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await row
      .getByRole('combobox', { name: 'Status', exact: true })
      .selectOption('REMOVED');
    await row.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      row.getByText('Teacher / staff · Removed', { exact: true }),
    ).toBeVisible();
    await student.goto(classUrl);
    await expect(student.getByRole('alert')).toContainText(
      'do not have access',
    );
  } finally {
    await student.close();
  }
});
