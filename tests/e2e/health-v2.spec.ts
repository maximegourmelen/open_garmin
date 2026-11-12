import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('Health tabs render complete trends across sizes and themes', async ({ browser }) => {
  test.setTimeout(240_000);
  const variants = [
    { name: 'desktop-light', width: 1440, height: 900, theme: 'light' },
    { name: 'desktop-dark', width: 1440, height: 900, theme: 'dark' },
    { name: 'tablet-light', width: 1024, height: 900, theme: 'light' },
    { name: 'tablet-dark', width: 1024, height: 900, theme: 'dark' },
    { name: 'mobile-light', width: 390, height: 844, theme: 'light' },
    { name: 'mobile-dark', width: 390, height: 844, theme: 'dark' },
  ] as const;
  const tabs = [
    { id: 'sleep', heading: 'Sleep duration', metric: 'Duration' },
    { id: 'heart', heading: 'Resting heart rate', metric: 'Resting HR' },
    { id: 'body-battery', heading: 'Daily range', metric: 'At wake' },
    { id: 'stress', heading: 'Time by stress level', metric: 'Average' },
    { id: 'steps', heading: 'Steps over time', metric: 'Today' },
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
    for (const tab of tabs) {
      await page.goto(`/health/${tab.id}?range=30D`);
      await expect(page.getByRole('heading', { name: tab.heading })).toBeVisible();
      await expect(page.getByRole('group', { name: 'Key metrics' })).toBeVisible();
      await expect(page.getByRole('button', { name: `About ${tab.metric}` })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'What this means' })).toBeVisible();
      if (tab.id === 'steps') {
        const height = await page
          .locator('.recharts-bar-rectangle path')
          .first()
          .getAttribute('height');
        expect(Number(height)).toBeGreaterThan(100);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: join('docs', 'screenshots', 'v2', `health-${tab.id}-${variant.name}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await page.getByRole('button', { name: `About ${tab.metric}` }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    }
    expect(errors).toEqual([]);
    await context.close();
  }
});
