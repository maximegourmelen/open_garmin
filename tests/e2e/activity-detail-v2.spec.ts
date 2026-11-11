import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('Activity detail explains a recorded session across sizes and themes', async ({ browser }) => {
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
    const response = await context.request.get('/api/demo/activities?limit=50');
    expect(response.ok()).toBe(true);
    const data = await response.json();
    const item = data.items.find(
      (entry: { sport: string; has_route: boolean; detail_state: string }) =>
        entry.sport === 'running' && entry.has_route && entry.detail_state === 'ready',
    );
    expect(item).toBeTruthy();
    await page.goto(`/activities/${item.id}`);
    await expect(page.getByRole('heading', { name: item.name, exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Activity route' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Charts' })).toBeVisible();
    await expect(page.locator('.recharts-surface').first()).toBeVisible();
    expect(
      await page
        .locator('.recharts-surface')
        .first()
        .evaluate((node) => node.getBoundingClientRect().width),
    ).toBeGreaterThan(variant.width === 390 ? 250 : 500);
    expect(
      await page
        .locator('.recharts-area path')
        .first()
        .evaluate((node) => (node as SVGPathElement).getBBox().width),
    ).toBeGreaterThan(variant.width === 390 ? 150 : 350);
    await expect(page.getByRole('button', { name: 'About Avg HR' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: join('docs', 'screenshots', 'v2', `activity-detail-${variant.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'About Avg HR' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
  }
});
