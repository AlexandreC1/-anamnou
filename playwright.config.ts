import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const testDatabaseUrl = parseEnv(
  readFileSync('.env.test', 'utf8'),
).DATABASE_URL;
if (!testDatabaseUrl)
  throw new Error('Run npm run test:setup before Playwright.');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'npm run start --workspace @yearbook/api',
      url: 'http://127.0.0.1:4100/ready',
      env: {
        API_PORT: '4100',
        PUBLIC_WEB_URL: 'http://127.0.0.1:3100',
        APP_ENV: 'test',
        DATABASE_URL: testDatabaseUrl,
      },
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'npm run preview --workspace @yearbook/web',
      url: 'http://127.0.0.1:3100',
      env: { WEB_PORT: '3100', API_BASE_URL: 'http://127.0.0.1:4100' },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
