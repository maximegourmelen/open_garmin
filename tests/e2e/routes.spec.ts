import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  ['today', '/'],
  ['activities', '/activities'],
  ['journey', '/journey'],
  ['health', '/health'],
  ['sleep', '/health/sleep'],
  ['heart', '/health/heart'],
  ['energy', '/health/energy'],
  ['stress', '/health/stress'],
  ['steps', '/health/steps'],
  ['progress', '/progress'],
  ['methods', '/methods'],
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
    const todayRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/api/demo/today') && request.method() === 'GET')
        todayRequests.push(request.url());
    });
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
    if (slug === 'today') expect(todayRequests).toHaveLength(1);
    const celebration = page.getByRole('dialog');
    if (slug === 'today' && (await celebration.isVisible())) {
      const celebrationPath = join(
        'docs',
        'screenshots',
        'after',
        testInfo.project.name,
        'today-celebration.png',
      );
      mkdirSync(dirname(celebrationPath), { recursive: true });
      await page.screenshot({ path: celebrationPath, fullPage: true, animations: 'disabled' });
      const milestones = await page.request.get('/api/demo/journey');
      expect(milestones.ok()).toBe(true);
      const ids = (
        (await milestones.json()) as { milestones: { id: string; earned: boolean }[] }
      ).milestones
        .filter((item) => item.earned)
        .map((item) => item.id);
      const seen = await page.request.post('/api/demo/milestones/seen', { data: { ids } });
      expect(seen.ok()).toBe(true);
      await page.reload();
      await expect(main.locator('h2').first()).toBeVisible();
      await expect(celebration).toHaveCount(0);
    }
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(
      accessibility.violations
        .filter((item) => item.impact === 'serious' || item.impact === 'critical')
        .map((item) => `${item.id}: ${item.nodes.map((node) => node.target.join(' ')).join(', ')}`),
      `${slug} serious accessibility violations`,
    ).toEqual([]);
    if (testInfo.project.name === 'mobile-dark') {
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${slug} overflows on mobile`,
      ).toBe(true);
    }
    const path = join('docs', 'screenshots', 'after', testInfo.project.name, `${slug}.png`);
    mkdirSync(dirname(path), { recursive: true });
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
    expect(errors, `${slug} browser errors`).toEqual([]);
  });
}

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

test('check-in, recap, theme and command palette respond', async ({ page }) => {
  const milestones = await page.request.get('/api/demo/journey');
  const ids = (
    (await milestones.json()) as { milestones: { id: string; earned: boolean }[] }
  ).milestones
    .filter((item) => item.earned)
    .map((item) => item.id);
  const seen = await page.request.post('/api/demo/milestones/seen', { data: { ids } });
  expect(seen.ok()).toBe(true);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Save check-in' })).toBeVisible();
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  const saved = page.waitForResponse(
    (response) => response.url().includes('/checkins/') && response.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Save check-in' }).click();
  expect((await saved).status()).toBe(200);
  await page.goto('/journey');
  await page
    .getByRole('button', { name: /Week of/ })
    .first()
    .click();
  await expect(page.getByRole('dialog', { name: 'Your week in stories' })).toBeVisible();
  await page.getByRole('button', { name: /^Next$/ }).click();
  await expect(
    page.getByRole('dialog', { name: 'Your week in stories' }).getByText(/2 \/ /),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Your week in stories' })).toHaveCount(0);
  const before = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Switch theme' }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    before === 'dark' ? 'light' : 'dark',
  );
  await page.keyboard.press('ControlOrMeta+K');
  await expect(page.getByRole('dialog', { name: 'Search and jump' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search activities or pages' }).fill('Progress');
  await page
    .getByRole('dialog', { name: 'Search and jump' })
    .getByRole('button', { name: 'Progress' })
    .click();
  await expect(page).toHaveURL(/\/progress$/);
});

test('keyboard focus stays visible and inside stories', async ({ page }) => {
  await page.goto('/journey');
  await expect(page.getByRole('heading', { name: 'Your Journey', exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveCSS('outline-width', '2px');
  await expect(skip).toHaveCSS('outline-offset', '2px');
  await page
    .getByRole('button', { name: /Week of/ })
    .first()
    .click();
  const story = page.getByRole('dialog', { name: 'Your week in stories' });
  await expect(story).toBeVisible();
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab');
    expect(await story.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(story).toHaveCount(0);
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
