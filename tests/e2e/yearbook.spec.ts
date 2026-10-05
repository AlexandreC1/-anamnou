import { type Page, type APIRequestContext } from '@playwright/test';
import { test, expect } from './fixtures';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { emailLink } from './mail-helper';
test.use({ trace: 'off' });
async function account(page: Page, request: APIRequestContext, name: string) {
  const email = randomUUID() + '@example.test';
  const password = randomUUID() + ' secure';
  await page.goto('/register');
  await page.getByLabel('Display name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create your account' }).click();
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible();
  await page.goto(await emailLink(request, email, 'verify-email'));
  await page.getByRole('button', { name: 'Verify your email' }).click();
  await expect(page.getByRole('status')).toContainText('email is verified');
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
}
test('class dashboard, student profile/photo, draft editing and responsive reader', async ({
  page,
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(180000);
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  const suffix = randomUUID().slice(0, 8);
  await account(page, request, 'President ' + suffix);
  await page.goto('/schools/new');
  await page
    .getByLabel('School name', { exact: true })
    .fill('Yearbook School ' + suffix);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Create a class' }),
  ).toBeVisible();
  await page.getByLabel('Class name').fill('Yearbook Class ' + suffix);
  await page.getByLabel('Graduation year').fill('2026');
  await page.getByRole('button', { name: 'Create a class' }).click();
  await expect(
    page.getByRole('heading', { name: 'The edition is taking shape' }),
  ).toBeVisible();
  const classUrl = page.url();
  const classNavigation = page.getByRole('navigation', {
    name: 'Class navigation',
  });
  await expect(
    classNavigation.getByRole('link', { name: 'Overview', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: /Members & invitations/ }).click();
  await page.getByRole('button', { name: 'Create invitation' }).click();
  const invitation = await page
    .getByLabel('Invitation link', { exact: true })
    .inputValue();
  const student = await browser.newPage({
    baseURL,
    viewport: page.viewportSize(),
  });
  student.on('pageerror', (error) => errors.push(error));
  try {
    await account(student, request, 'Student ' + suffix);
    await student.goto(invitation);
    await student.getByRole('button', { name: 'Accept invitation' }).click();
    await expect(
      student.getByRole('heading', { name: 'Yearbook Class ' + suffix }),
    ).toBeVisible();
    await expect(
      student.getByRole('link', { name: /Edit the yearbook/ }),
    ).toHaveCount(0);
    await student.getByRole('link', { name: /Edit your page/ }).click();
    await student
      .getByLabel('Short biography')
      .fill('An unforgettable chapter.');
    await student
      .getByLabel('Your quote')
      .fill('<img src=x onerror=alert(1)> Keep the story.');
    await student
      .getByLabel('Contact or social details')
      .fill('private@example.test');
    await student
      .getByRole('combobox', { name: 'Who can see your page?', exact: true })
      .selectOption('CLASS');
    const image = await sharp({
      create: { width: 320, height: 400, channels: 3, background: '#bd9178' },
    })
      .png()
      .toBuffer();
    await student
      .getByLabel('Describe this photo')
      .fill('A fictional graduation portrait');
    await student.getByLabel('Choose a photo').setInputFiles({
      name: 'portrait.png',
      mimeType: 'image/png',
      buffer: image,
    });
    await expect(student.getByRole('status')).toContainText('Photo uploaded');
    await student
      .getByRole('button', { name: 'Save changes', exact: true })
      .click();
    await expect(
      student.getByRole('status').filter({ hasText: 'Changes saved.' }),
    ).toBeVisible();
    await student.reload();
    await expect(student.getByLabel('Short biography')).toHaveValue(
      'An unforgettable chapter.',
    );
    await expect(student.locator('img.portrait')).toBeVisible();
    await expect
      .poll(() =>
        student
          .locator('img.portrait')
          .evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(
      student.getByRole('img', { name: 'A fictional graduation portrait' }),
    ).toBeVisible();
    await student.screenshot({
      path: 'test-results/profile-' + test.info().project.name + '.png',
      fullPage: true,
    });
    await page.goto(classUrl + '/members');
    await page
      .getByRole('link', { name: 'Student ' + suffix, exact: true })
      .click();
    await expect(
      page.getByText('An unforgettable chapter.', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'A fictional graduation portrait' }),
    ).toBeVisible();
    await expect(page.getByText('private@example.test')).toHaveCount(0);
    await page.goto(classUrl);
    await expect(
      page.getByRole('progressbar', { name: 'Graduation photos' }),
    ).toHaveAttribute('value', '1');
    await page.screenshot({
      path: 'test-results/dashboard-' + test.info().project.name + '.png',
      fullPage: true,
    });
    await page
      .getByRole('link', { name: 'Edit the yearbook', exact: true })
      .click();
    await page.getByLabel('Edition title').fill('The story stays ' + suffix);
    await expect(
      classNavigation.getByRole('link', { name: 'Yearbook', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await page.getByLabel('Paper & color').selectOption('GARDEN');
    const outline = page.getByRole('navigation', { name: 'In this edition' });
    await outline
      .getByRole('button', { name: '02 Class message', exact: true })
      .click();
    const message = page.locator('fieldset.section-editor').filter({
      has: page.locator('legend').filter({ hasText: '02 · Class message' }),
    });
    await message
      .getByLabel('Words for this page')
      .fill(
        'For the early mornings, the friendships, and everything we learned together. This fictional edition belongs to every one of us.',
      );
    await outline
      .getByRole('button', { name: '03 Class photo', exact: true })
      .click();
    const classPhoto = page.locator('fieldset.section-editor').filter({
      has: page.locator('legend').filter({ hasText: '03 · Class photo' }),
    });
    await classPhoto
      .getByLabel('Describe this photo')
      .fill('Our fictional class photograph');
    await classPhoto.getByLabel('Choose a photo').setInputFiles({
      name: 'class.png',
      mimeType: 'image/png',
      buffer: image,
    });
    await expect(classPhoto.getByRole('status')).toContainText(
      'Photo uploaded',
    );
    const sectionTitle = classPhoto.getByLabel('Section title');
    await sectionTitle.fill('');
    const disclosure = page.locator('details').filter({ has: sectionTitle });
    await disclosure.locator('summary').click();
    await page.getByRole('button', { name: 'Save & preview' }).click();
    await expect(page).toHaveURL(/\/yearbook\/edit$/);
    await expect(disclosure).toHaveAttribute('open', '');
    await expect(sectionTitle).toBeFocused();
    await sectionTitle.fill('Our class photograph');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: 'test-results/editor-' + test.info().project.name + '.png',
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Save & preview' }).click();
    await expect(
      page.getByRole('heading', { name: 'The story stays ' + suffix }),
    ).toBeVisible();
    await expect(page.locator('.member-page').first()).toContainText(
      'Keep the story.',
    );
    await expect(page.getByText('private@example.test')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Publish/ })).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: 'test-results/yearbook-' + test.info().project.name + '.png',
      fullPage: true,
    });
    const chapterHref = await page
      .getByRole('navigation', { name: 'In this edition' })
      .getByRole('link', { name: 'Our class photograph' })
      .getAttribute('href');
    await page.goto(classUrl + '/yearbook' + chapterHref);
    await expect(page.locator('.section-class_photo h2')).toBeInViewport();
    await page.goto(classUrl);
    await expect(page.locator('.book-opening-page')).toContainText(
      'This fictional edition belongs to every one of us.',
    );
    await expect(page.locator('.class-voices')).toContainText(
      'Keep the story.',
    );
    await expect(page.getByText('private@example.test')).toHaveCount(0);
    await page.screenshot({
      path: 'test-results/spread-' + test.info().project.name + '.png',
      fullPage: true,
    });
    await page.locator('.book-cover-link').click();
    await student.goto(classUrl + '/yearbook');
    await expect(
      student.getByRole('heading', { name: 'The story stays ' + suffix }),
    ).toBeVisible();
    await expect(
      student.getByRole('link', { name: 'Edit the yearbook' }),
    ).toHaveCount(0);
    for (const [locale, label] of [
      ['fr', 'Édition en préparation'],
      ['ht', 'Edisyon an preparasyon'],
      ['es', 'Edición en preparación'],
    ] as const) {
      await student
        .getByRole('combobox', { name: 'Language / Lang / Langue / Idioma' })
        .selectOption(locale);
      await expect(student.locator('.reader-toolbar')).toContainText(label);
    }
    await page.setViewportSize({ width: 320, height: 780 });
    for (const [locale, navigationLabel] of [
      ['en', 'Class navigation'],
      ['fr', 'Navigation de la classe'],
      ['ht', 'Navigasyon klas la'],
      ['es', 'Navegación de la clase'],
    ] as const) {
      await page
        .getByRole('combobox', { name: 'Language / Lang / Langue / Idioma' })
        .selectOption(locale);
      const navigation = page.getByRole('navigation', {
        name: navigationLabel,
      });
      const links = navigation.getByRole('link');
      await expect(links).toHaveCount(5);
      await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
      for (const link of await links.all()) {
        const bounds = await link.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.locator('.workspace-header').screenshot({
        path: `test-results/workspace-${test.info().project.name}-${locale}.png`,
      });
    }
    expect(errors).toHaveLength(0);
  } finally {
    await student.close();
  }
});
