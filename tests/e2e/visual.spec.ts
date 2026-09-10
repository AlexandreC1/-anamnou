import { test, expect } from '@playwright/test';
test('opening page remains readable across viewport sizes', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('opening.png'),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 700 });
  await expect(
    page.getByRole('link', { name: 'Discover the idea' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('narrow.png'),
    fullPage: true,
  });
});
