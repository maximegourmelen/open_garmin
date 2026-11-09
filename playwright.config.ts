import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalTeardown: './tests/e2e/global-teardown.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'desktop-light',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
      },
    },
    {
      name: 'mobile-dark',
      use: { ...devices['iPhone 13'], browserName: 'chromium', colorScheme: 'dark' },
    },
  ],
  webServer: [
    {
      command: 'bash scripts/run_e2e_server.sh',
      url: 'http://127.0.0.1:8001/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm run build && npm run dev -- --port 5174',
      url: 'http://127.0.0.1:5174',
      env: { OPEN_GARMIN_API_TARGET: 'http://127.0.0.1:8001' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
