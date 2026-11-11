import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('Guide renders across themes and sizes, and method links find their section', async ({
  browser,
}) => {
  const variants = [
    { name: 'desktop-light', width: 1440, height: 900, theme: 'light' },
    { name: 'desktop-dark', width: 1440, height: 900, theme: 'dark' },
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
    await page.goto('/guide');
    await expect(page.getByRole('heading', { name: 'Getting started', level: 2 })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Guide topics' }).getByRole('link'),
    ).toHaveCount(8);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: join('docs', 'screenshots', 'v2', `guide-${variant.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.goto('/guide/methods#effort_points@1');
    await expect(page.locator('[id="effort_points@1"]')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const target = document.getElementById('effort_points@1');
          return target ? Math.abs(target.getBoundingClientRect().top) < 100 : false;
        }),
      )
      .toBe(true);
    expect(errors).toEqual([]);
    await context.close();
  }
});
