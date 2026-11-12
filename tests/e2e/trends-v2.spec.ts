import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('Trends and weekly report are readable across sizes and themes', async ({ browser }) => {
  test.setTimeout(180_000);
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
    const response = await context.request.get('/api/demo/trends?range=30D');
    expect(response.ok()).toBe(true);
    const data = await response.json();
    const week = data.volume.at(-1);
    await page.goto('/trends?range=30D');
    await expect(page.getByRole('heading', { name: 'Fitness signals' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Volume' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Records' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Weekly reports' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'About Resting heart rate' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: join('docs', 'screenshots', 'v2', `trends-${variant.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'About Resting heart rate' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.goto(`/trends/week/${week.start}`);
    await expect(page.getByRole('heading', { name: 'Day by day' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Health readings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: join('docs', 'screenshots', 'v2', `weekly-report-${variant.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    expect(errors).toEqual([]);
    if (variant.name === 'desktop-light') {
      await page.emulateMedia({ media: 'print' });
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Print' })).toBeHidden();
    }
    await context.close();
  }
});
