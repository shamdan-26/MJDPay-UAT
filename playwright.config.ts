import { defineConfig } from '@playwright/test';

import dotenv from 'dotenv';
import os from 'os';
import path from 'path';

const env = process.env['ENV'] ?? 'dev';
dotenv.config({ path: path.resolve(__dirname, `.env.${env}`) });

export default defineConfig({
  globalSetup: './support/global-setup.ts',
  globalTeardown: './support/global-teardown.ts',
  testDir: './BusinessTestCases',
  // Locally the repo sits under a OneDrive-synced folder — its sync client holds
  // the same trace/screenshot resource files Playwright is mid-write on, which
  // throws sporadic `EBUSY: resource busy or locked` failures that have nothing
  // to do with the test. Route local runs to a non-synced temp dir instead; CI
  // keeps the default './test-results' so any artifact-upload step still finds it.
  outputDir: process.env.CI ? undefined : path.join(os.tmpdir(), 'ai-autimation-test-results'),
  timeout: 60000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  // Local runs use headed, maximized Microsoft Edge (see the project below) — 5 concurrent
  // instances can exhaust RAM/CPU on a dev machine during a full bulk run, crashing a
  // worker's browser mid-test ("Target page, context or browser has been closed") even
  // though the same tests pass individually. Lowered to 3 to reduce that contention.
  workers: process.env.CI ? 1 : 3,
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
    // Opt-in cross-browser coverage (CROSS_BROWSER=1): the mock-driven Registration UI specs only — they need no
    // real OTP, pool identity or login session, so they are safe to run in any engine.
    // Run with:  CROSS_BROWSER=1 npm run test:dev -- --project=Chromium --project=WebKit BusinessTestCases/Registration/ui
    ...(process.env['CROSS_BROWSER']
      ? (['Chromium', 'WebKit'] as const).map(name => ({
          name,
          use: { browserName: name.toLowerCase() as 'chromium' | 'webkit', headless: true, viewport: { width: 1280, height: 900 } },
          grep: /(?=.*@registration)(?=.*@ui)/,
          grepInvert: /@visual|@performance/,
        }))
      : []),
  ],
});
