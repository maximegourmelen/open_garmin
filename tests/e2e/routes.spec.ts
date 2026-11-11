import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  ['overview', '/'],
  ['activities', '/activities'],
  ['sleep', '/health/sleep'],
  ['heart', '/health/heart'],
  ['body-battery', '/health/body-battery'],
  ['stress', '/health/stress'],
  ['steps', '/health/steps'],
  ['trends', '/trends'],
  ['guide', '/guide'],
  ['settings', '/settings'],
  ['welcome', '/welcome'],
] as const;

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript(
    (theme) => {
      localStorage.setItem('og_theme', theme);
      localStorage.setItem('og_workspace', 'demo');
    },
    testInfo.project.name.includes('light') ? 'light' : 'dark',
  );
});

for (const [slug, route] of routes) {
  test(`${slug} renders synthetic demo data`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(route);
    const main = page.locator('main');
    await expect(main).toBeVisible();
    await expect(main.locator('h1, h2').first()).toBeVisible();
    await expect(main.locator('[aria-label^="Loading"]')).toHaveCount(0);
    await expect(main).not.toContainText('view is being prepared');
    await expect(main).not.toContainText('Something went wrong loading this');
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(
      accessibility.violations
        .filter((item) => item.impact === 'serious' || item.impact === 'critical')
        .map((item) => `${item.id}: ${item.nodes.map((node) => node.target.join(' ')).join(', ')}`),
      `${slug} serious accessibility violations`,
    ).toEqual([]);
    if (testInfo.project.name.startsWith('mobile')) {
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${slug} overflows on mobile`,
      ).toBe(true);
    }
    const path = join('docs', 'screenshots', 'v2', testInfo.project.name, `${slug}.png`);
    mkdirSync(dirname(path), { recursive: true });
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
    expect(errors, `${slug} browser errors`).toEqual([]);
  });
}

test('legacy destinations redirect to the new route', async ({ page }) => {
  for (const [oldPath, next] of [
    ['/today', '/'],
    ['/journey', '/trends'],
    ['/progress', '/trends'],
    ['/health/energy', '/health/body-battery'],
    ['/methods', '/guide/methods'],
  ]) {
    await page.goto(oldPath);
    await expect(page).toHaveURL(new RegExp(`${next.replaceAll('/', '\\/')}$`));
  }
});

test('activity detail opens from the list and charts track the route', async ({ page }) => {
  const response = await page.request.get('/api/demo/activities?limit=50');
  expect(response.ok()).toBe(true);
  const data = (await response.json()) as {
    items: { id: string; has_route: boolean; detail_state: string }[];
  };
  const activity = data.items.find((item) => item.has_route && item.detail_state === 'ready');
  expect(activity).toBeTruthy();
  await page.goto(`/activities/${activity!.id}`);
  await expect(page.getByRole('img', { name: 'Activity route' })).toBeVisible();
  const chart = page.getByRole('img', { name: /over activity/ }).first();
  await expect(chart).toBeVisible();
  await chart.hover({ position: { x: 100, y: 90 } });
  await expect(
    page.getByRole('img', { name: 'Activity route' }).locator('circle[fill="var(--celebrate)"]'),
  ).toHaveCount(1);
});

test('check-in and command palette respond', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Save check-in' })).toBeVisible();
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  const saved = page.waitForResponse(
    (response) => response.url().includes('/checkins/') && response.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Save check-in' }).click();
  expect((await saved).status()).toBe(200);
  await page.keyboard.press('ControlOrMeta+K');
  await expect(page.getByRole('dialog', { name: 'Search and jump' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search activities, pages or metrics' }).fill('Trends');
  await page
    .getByRole('dialog', { name: 'Search and jump' })
    .getByRole('button', { name: 'Trends' })
    .click();
  await expect(page).toHaveURL(/\/trends$/);
});

test('metric search opens a personal explanation and returns focus', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('ControlOrMeta+K');
  await page.getByRole('textbox', { name: 'Search activities, pages or metrics' }).fill('Resting');
  await page.getByRole('button', { name: 'About Resting heart rate' }).click();
  const drawer = page.getByRole('dialog', { name: 'Resting heart rate' });
  await expect(drawer.getByText('Your number')).toBeVisible();
  await expect(drawer.getByText('Your usual range')).toBeVisible();
  await expect(drawer.getByRole('img', { name: /30 days/ })).toBeVisible();
  await drawer.getByRole('button', { name: 'View as table' }).click();
  await expect(drawer.getByRole('table')).toBeVisible();
  await drawer.getByRole('button', { name: 'Close drawer' }).click();
  await expect(drawer).toHaveCount(0);
});

test('health charts offer a data table', async ({ page }) => {
  await page.goto('/health/sleep');
  const toggle = page.getByRole('button', { name: 'Show as table' }).first();
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.getByRole('table').first()).toBeVisible();
  await page.getByRole('button', { name: 'Hide table' }).first().click();
  await expect(page.getByRole('table')).toHaveCount(0);
});
