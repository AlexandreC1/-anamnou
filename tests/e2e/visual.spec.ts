import { test, expect } from './fixtures';
test('opening page remains readable across viewport sizes', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const label = page.getByText('Sample yearbook', { exact: true });
  async function expectLabelAbove(face: string) {
    const caption = await label.boundingBox();
    const bookFace = await page.locator(face).boundingBox();
    expect(caption).not.toBeNull();
    expect(bookFace).not.toBeNull();
    expect(caption!.y + caption!.height).toBeLessThan(bookFace!.y);
  }
  await expectLabelAbove('.sculpture-cover');
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
  await expect(page.getByRole('link', { name: 'Join a class' })).toBeVisible();
  await expectLabelAbove('.sculpture-cover');
  await page.getByRole('button', { name: 'Preview the yearbook' }).click();
  await expect(
    page.getByRole('button', { name: 'Close preview' }),
  ).toBeVisible();
  await expectLabelAbove('.book-cover-back');
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
