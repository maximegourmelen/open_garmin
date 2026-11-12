import { expect, test } from '@playwright/test';

function number(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  expect(match, `Expected a number in: ${text}`).not.toBeNull();
  return Number(match![1].replaceAll(',', ''));
}

function minutes(text: string): number {
  const match = text.match(/(?:(\d+)\s*h\s*)?(\d+)\s*min/);
  expect(match, `Expected a duration in: ${text}`).not.toBeNull();
  return Number(match![1] ?? 0) * 60 + Number(match![2]);
}

test('weekly totals and last-night readings agree across the demo workspace', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('og_workspace', 'demo');
    localStorage.setItem('og_theme', 'light');
  });
  const response = await page.request.get('/api/demo/overview');
  expect(response.ok()).toBe(true);
  const weekStart = ((await response.json()) as { week: { start: string } }).week.start;

  await page.goto('/');
  const lastNight = page.getByRole('region', { name: 'Last night' });
  const overviewSleep = minutes(
    await lastNight.getByRole('button', { name: 'About Sleep' }).locator('..').innerText(),
  );
  const overviewHeart = number(
    await lastNight.getByRole('button', { name: 'About Resting HR' }).locator('..').innerText(),
    /Resting HR\s+([\d,]+)\s*bpm/,
  );
  const overviewWeek = await page.getByRole('region', { name: 'This week' }).innerText();
  const overviewMinutes = number(overviewWeek, /([\d,]+)\s*\/\s*[\d,]+ active minutes/);
  const overviewActivities = number(overviewWeek, /([\d,]+) of [\d,]+ activities/);

  await page.goto('/health/sleep');
  const healthSleep = minutes(
    await page.getByRole('button', { name: 'About Duration' }).locator('..').innerText(),
  );
  expect(healthSleep, 'Overview and Health show the same latest sleep').toBe(overviewSleep);

  await page.goto('/health/heart');
  const healthHeart = number(
    await page.getByRole('button', { name: 'About Resting HR' }).locator('..').innerText(),
    /Resting HR\s+([\d,]+)\s*bpm/,
  );
  expect(healthHeart, 'Overview and Health show the same resting HR').toBe(overviewHeart);

  await page.goto('/activities?range=30D');
  const activityWeek = await page.getByRole('region', { name: 'This week' }).innerText();
  const activityCount = number(activityWeek, /This week\s*·\s*([\d,]+) activities?/);
  expect(activityCount, 'Overview and Activities count the same current-week activities').toBe(
    overviewActivities,
  );

  await page.goto('/trends');
  const weeklyRow = await page
    .getByRole('region', { name: 'Weekly reports' })
    .locator(`a[href="/trends/week/${weekStart}"]`)
    .innerText();
  const trendMinutes = minutes(weeklyRow);
  const trendActivities = number(weeklyRow, /([\d,]+) activities?/);
  expect(trendMinutes, 'Overview and Trends show the same current-week active minutes').toBe(
    overviewMinutes,
  );
  expect(trendActivities).toBe(overviewActivities);

  await page.goto(`/trends/week/${weekStart}`);
  const reportMinutes = number(
    await page.getByRole('button', { name: 'About Active minutes' }).locator('..').innerText(),
    /Active minutes\s+([\d,]+)\s*min/,
  );
  const reportActivities = number(
    await page.getByRole('button', { name: 'About Activities' }).locator('..').innerText(),
    /Activities\s+([\d,]+)/,
  );
  expect(reportMinutes, 'Overview and the weekly report show the same active minutes').toBe(
    overviewMinutes,
  );
  expect(reportActivities).toBe(overviewActivities);
});
