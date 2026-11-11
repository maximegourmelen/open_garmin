import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript(
    (theme) => {
      localStorage.setItem('og_workspace', 'demo');
      localStorage.setItem('og_theme', theme);
    },
    testInfo.project.name.includes('light') ? 'light' : 'dark',
  );
});

test('tour navigates, saves completion or skip, and can be replayed', async ({ page }) => {
  await page.goto('/?tour=1');
  await expect(page.getByRole('dialog', { name: 'Four places' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('dialog', { name: 'This week' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('dialog', { name: 'Four places' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'See a Sleep explanation' }).click();
  await expect(page.getByRole('dialog', { name: 'Sleep' })).toBeVisible();
  await page.getByRole('button', { name: 'Close drawer' }).click();
  await expect(page.getByRole('dialog', { name: 'Your readings' })).toBeVisible();
  const save = page.waitForRequest(
    (request) => request.url().endsWith('/demo/preferences') && request.method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Skip tour' }).click();
  expect((await save).postDataJSON().tour_completed).toContain('overview');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/?tour=1');
  await expect(page.getByRole('dialog', { name: 'Four places' })).toBeVisible();
});

test('tour remeasures its target on resize with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?tour=1');
  await expect(page.getByRole('dialog', { name: 'Four places' })).toBeVisible();
  const spotlight = page.locator('#tour-spotlight rect').last();
  const before = await spotlight.getAttribute('width');
  await page.setViewportSize({ width: 800, height: 900 });
  await expect.poll(() => spotlight.getAttribute('width')).not.toBe(before);
  await expect(page.getByRole('dialog', { name: 'Four places' })).toBeVisible();
});
