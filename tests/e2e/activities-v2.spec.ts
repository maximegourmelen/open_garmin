import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('Activities list, calendar, and comparison work across sizes and themes', async ({
  browser,
}) => {
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
    await page.goto('/activities');
    await expect(page.getByRole('heading', { name: 'Activities', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'About Effort' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compare', exact: true })).toBeVisible();
    await page.screenshot({
      path: join('docs', 'screenshots', 'v2', `activities-${variant.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('radio', { name: 'Calendar' }).click();
    await expect(page.getByRole('region', { name: 'Activity calendar' })).toBeVisible();
    await page.screenshot({
      path: join('docs', 'screenshots', 'v2', `activity-calendar-${variant.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    const response = await context.request.get('/api/demo/activities?limit=2');
    expect(response.ok()).toBe(true);
    const data = await response.json();
    const ids = data.items.map((item: { id: string }) => item.id).slice(0, 2);
    expect(ids).toHaveLength(2);
    await page.goto(`/activities/compare?ids=${ids.join(',')}`);
    await expect(page.getByRole('heading', { name: 'Compare activities' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Activity metrics side by side' })).toBeVisible();
    await page.screenshot({
      path: join('docs', 'screenshots', 'v2', `activity-compare-${variant.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
    await context.close();
  }
});
