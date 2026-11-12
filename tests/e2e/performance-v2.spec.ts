import { expect, test } from '@playwright/test';

test('Overview becomes interactive within one second without section request waterfalls', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'Local desktop performance budget');
  await page.addInitScript(() => {
    localStorage.setItem('og_workspace', 'demo');
    localStorage.setItem('og_theme', 'light');
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'About Sleep' })).toBeVisible();
  const samples: number[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const requests: string[] = [];
    const record = (request: { url(): string }) => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/demo/')) requests.push(url.pathname);
    };
    page.on('request', record);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'About Sleep' })).toBeVisible();
    samples.push(Math.round(await page.evaluate(() => performance.now())));
    await page.waitForTimeout(100);
    page.off('request', record);
    const sectionRequests = requests.filter(
      (path) => !['/api/demo/preferences', '/api/demo/status'].includes(path),
    );
    expect(sectionRequests, 'Overview sections should share one response').toEqual([
      '/api/demo/overview',
    ]);
  }
  const median = [...samples].sort((a, b) => a - b)[1];
  console.log(`Overview interactive: ${samples.join(', ')} ms; median ${median} ms`);
  expect(median).toBeLessThan(1000);
  await page.getByRole('button', { name: 'About Sleep' }).click();
  await expect(page.getByRole('dialog', { name: 'Sleep' })).toBeVisible();
});
