import { defineConfig, devices } from '@playwright/test';

const webPort = process.env.E2E_WEB_PORT || '5182';
const apiUrl = process.env.E2E_API_URL || 'http://127.0.0.1:4000';
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: './apps/web/e2e',
  outputDir: './test-results/e2e',
  fullyParallel: false,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      name: 'mock-api',
      command: 'pnpm dev:mock',
      url: `${apiUrl}/api/system/health`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      name: 'web-demo',
      command: 'node scripts/start-web-e2e.mjs',
      url: baseURL,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium-desktop',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: 'playwright/.auth/demo-user.json',
      },
    },
    {
      name: 'chromium-mobile',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        storageState: 'playwright/.auth/demo-user.json',
      },
    },
  ],
});
