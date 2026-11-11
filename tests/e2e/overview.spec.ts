import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('Overview has a clear hierarchy in both themes and at both sizes', async ({ browser }) => {
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
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Last night' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'About Sleep' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: join('docs', 'screenshots', 'v2', `overview-${variant.name}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'About Sleep' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
  }
});
