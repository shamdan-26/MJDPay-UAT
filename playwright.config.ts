import { defineConfig } from '@playwright/test';

import dotenv from 'dotenv';
import path from 'path';

const env = process.env['ENV'] ?? 'dev';
dotenv.config({ path: path.resolve(__dirname, `.env.${env}`) });

export default defineConfig({
  globalSetup: './support/global-setup.ts',
  globalTeardown: './support/global-teardown.ts',
  testDir: './BusinessTestCases',
  timeout: 60000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 5,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    permissions: ['geolocation'],
    geolocation: { latitude: 24.7136, longitude: 46.6753 },
  },

  projects: [
    {
      name: 'Microsoft Edge',
      use: {
        headless: false,
        channel: 'msedge',
        launchOptions: { args: ['--start-maximized'] },
        viewport: null,
      },
    },
  ],
});
