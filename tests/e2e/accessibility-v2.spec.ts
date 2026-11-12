import { expect, test, type Locator, type Page } from '@playwright/test';

async function tabTo(page: Page, target: Locator, limit = 80) {
  await expect(target).toBeVisible();
  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press('Tab');
    const visible = await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement) || element === document.body) return true;
      const style = getComputedStyle(element);
      return (
        element.matches(':focus-visible') &&
        ((style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2) ||
          style.boxShadow !== 'none')
      );
    });
    expect(visible, `Tab stop ${step + 1} needs a visible focus indicator`).toBe(true);
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Could not reach ${await target.getAttribute('aria-label')} by Tab`);
}

test('keyboard walkthrough from Welcome through tour, metric drawer and Settings', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    localStorage.setItem('og_workspace', 'demo');
    localStorage.setItem('og_theme', 'light');
  });
  await page.goto('/welcome');
  await tabTo(page, page.getByRole('button', { name: 'Explore with sample data' }));
  await page.keyboard.press('Enter');
  await tabTo(page, page.getByRole('button', { name: 'Go to Overview' }));
  await page.keyboard.press('Enter');
  await tabTo(page, page.getByRole('button', { name: 'Start tour' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Four places' })).toBeVisible();
  for (const title of ['Four places', 'This week']) {
    const dialog = page.getByRole('dialog', { name: title });
    await tabTo(page, dialog.getByRole('button', { name: 'Next' }));
    await page.keyboard.press('Enter');
  }
  const tour = page.getByRole('dialog', { name: 'Your readings' });
  await tabTo(page, tour.getByRole('button', { name: 'See a Sleep explanation' }));
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Sleep' });
  await expect(drawer).toBeVisible();
  await tabTo(page, drawer.getByRole('button', { name: 'View as table' }));
  await page.keyboard.press('Enter');
  await expect(drawer.getByRole('table')).toBeVisible();
  await tabTo(page, drawer.getByRole('button', { name: 'Close drawer' }));
  await page.keyboard.press('Enter');
  await expect(tour).toBeVisible();
  await tabTo(page, tour.getByRole('button', { name: 'Skip tour' }));
  await page.keyboard.press('Enter');
  await expect(tour).toHaveCount(0);

  if (testInfo.project.name.startsWith('mobile')) {
    await tabTo(page, page.getByRole('button', { name: 'More', exact: true }));
    await page.keyboard.press('Enter');
    const more = page.getByRole('dialog', { name: 'More' });
    await tabTo(page, more.getByRole('button', { name: 'Settings' }));
    await page.keyboard.press('Enter');
  } else {
    await tabTo(
      page,
      page
        .getByRole('navigation', { name: 'Secondary navigation' })
        .getByRole('link', { name: 'Settings' }),
    );
    await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('heading', { name: 'Goals' })).toBeVisible();
  await tabTo(page, page.getByRole('spinbutton', { name: 'Weekly active minutes' }));
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('170');
  await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible();
});

test('full charts expose data tables across Health, Trends and activity detail', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('og_workspace', 'demo'));
  const activityResponse = await page.request.get('/api/demo/activities?limit=20');
  expect(activityResponse.ok()).toBe(true);
  const activities = (await activityResponse.json()) as { items: { id: string }[] };
  const trendResponse = await page.request.get('/api/demo/trends?range=30D');
  expect(trendResponse.ok()).toBe(true);
  const trends = (await trendResponse.json()) as { reports: { start: string }[] };
  const routes = [
    ...['sleep', 'heart', 'body-battery', 'stress', 'steps'].map((tab) => `/health/${tab}`),
    '/trends',
    `/trends/week/${trends.reports[0].start}`,
    `/activities/${activities.items[0].id}`,
  ];
  for (const route of routes) {
    await page.goto(route);
    const charts = page.locator('main div[role="img"][style*="height"]');
    await expect.poll(() => charts.count()).toBeGreaterThan(0);
    for (let index = 0; index < (await charts.count()); index += 1) {
      await expect(
        charts.nth(index).locator('..').getByRole('button', { name: 'View as table' }),
        `${route} chart ${index + 1} needs a table alternative`,
      ).toBeVisible();
    }
  }
  await page.goto('/trends');
  const consistency = page.getByRole('region', { name: 'Consistency' });
  await consistency.getByRole('button', { name: 'View as table' }).click();
  await expect(consistency.getByRole('table')).toBeVisible();
  await expect(consistency.getByRole('table').getByRole('row')).toHaveCount(85);
});
