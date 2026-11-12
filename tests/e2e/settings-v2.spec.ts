import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('Settings is one readable page with inline autosave', async ({ browser }) => {
  test.setTimeout(150_000);
  const variants = [
    { name: 'desktop-light', width: 1440, height: 900, theme: 'light' },
    { name: 'desktop-dark', width: 1440, height: 900, theme: 'dark' },
    { name: 'tablet-light', width: 1024, height: 900, theme: 'light' },
    { name: 'tablet-dark', width: 1024, height: 900, theme: 'dark' },
    { name: 'mobile-light', width: 390, height: 844, theme: 'light' },
    { name: 'mobile-dark', width: 390, height: 844, theme: 'dark' },
  ] as const;
  mkdirSync(join('docs', 'screenshots', 'v2'), { recursive: true });
  for (const variant of variants) {
    const context = await browser.newContext({
      viewport: { width: variant.width, height: variant.height },
      colorScheme: variant.theme,
    });
    await context.addInitScript((theme) => {
      localStorage.setItem('og_theme', theme);
      localStorage.setItem('og_workspace', 'demo');
    }, variant.theme);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Goals' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Units and region' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Heart-rate zones' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Garmin connection' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your data' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Help' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: join('docs', 'screenshots', 'v2', `settings-${variant.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    if (variant.name === 'mobile-dark') {
      const saved = page.waitForResponse(
        (response) =>
          response.url().includes('/api/demo/preferences') && response.request().method() === 'PUT',
      );
      await page.getByRole('spinbutton', { name: 'Weekly active minutes' }).fill('160');
      expect((await saved).ok()).toBe(true);
      await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible();
    }
    expect(errors).toEqual([]);
    await context.close();
  }
});
