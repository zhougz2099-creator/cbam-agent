import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 40_000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        channel: 'chrome',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'desktop',
      use: {
        viewport: { width: 1280, height: 800 },
        channel: 'chrome',
      },
    },
  ],
});
