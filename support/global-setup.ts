import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import { getOtpFromDb, fillOTP } from '../BusinessTestCases/Registration-KYC/RegistrationHelper';
import {
    loginAsMerchant,
    homepageAccountPool,
    LOGIN_URL,
} from '../BusinessTestCases/homepage/HomePageHelper';

const env            = process.env['ENV'] ?? 'dev';
const VALID_COMPANY  = process.env['UAT_SETUP_COMPANY'];
const VALID_MOBILE   = process.env['UAT_SETUP_MOBILE'];
const VALID_PASSWORD = process.env['UAT_SETUP_PASSWORD'];

async function globalSetup() {
    const browser = await chromium.launch();

    if (!VALID_COMPANY || !VALID_MOBILE || !VALID_PASSWORD) {
        console.warn('[global-setup] UAT_SETUP_COMPANY / UAT_SETUP_MOBILE / UAT_SETUP_PASSWORD not set — skipping session.json creation. Tests using storageState: \'session.json\' will be skipped or fail.');
    } else {
        try {
            const context = await browser.newContext();
            const page    = await context.newPage();

            await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
            await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
            await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
            if (env === 'dev') {
                await page.locator('#btn_login').click();
            } else {
                await page.getByRole('button', { name: 'Log In' }).click();
            }

            // Handle OTP if the environment has it enabled
            const otpVisible = await page.getByRole('heading', { name: 'Enter OTP' })
                .waitFor({ state: 'visible', timeout: 15000 })
                .then(() => true)
                .catch(() => false);

            if (otpVisible) {
                await page.getByRole('textbox', { name: 'One time password input' }).first()
                    .waitFor({ state: 'visible', timeout: 10000 });
                const otp = await getOtpFromDb(VALID_MOBILE);
                await fillOTP(page, otp);
                const verifyBtn = page.getByRole('button', { name: 'Verify' });
                if (await verifyBtn.isVisible().catch(() => false)) {
                    await verifyBtn.click();
                }
                await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
            }

            // Save cookies + localStorage so tests can restore the authenticated state
            await context.storageState({ path: 'session.json' });
            await context.close();
        } catch (err) {
            console.warn(`[global-setup] session.json creation failed, continuing without it. Tests using storageState: 'session.json' will be skipped or fail. Cause: ${err}`);
        }
    }

    // Homepage suite: pre-authenticate every account in the pool once here, so
    // individual homepage spec files restore via storageState instead of each
    // logging in live (faster, and — since createHomepageSession() picks an
    // account by worker index — avoids concurrent same-account login
    // collisions between parallel workers). The pool has 2 accounts today;
    // add more via UAT_COMPANY_3/UAT_MOBILE_3/UAT_PASSWORD_3 (etc.) and they're
    // authenticated here automatically, no changes needed in this file.
    //
    // Non-fatal: these accounts are only consumed by the homepage suite, but
    // globalSetup runs before every test file. If browser automation here
    // crashes or times out (e.g. a flaky Chromium launch), swallow it instead
    // of failing every other suite's ability to run at all.
    mkdirSync('playwright/.auth', { recursive: true });
    for (const account of homepageAccountPool) {
        await saveAuthenticatedStorageState(account.storageState, account.creds);
    }

    async function saveAuthenticatedStorageState(storagePath: string, creds: { company: string; mobile: string; password: string }) {
        try {
            const context = await browser.newContext();
            const page    = await context.newPage();
            await loginAsMerchant(page, creds);
            await context.storageState({ path: storagePath });
            await context.close();
        } catch (err) {
            console.warn(`[global-setup] Failed to create homepage storage state at ${storagePath}, continuing without it. Homepage tests relying on it will fail. Cause: ${err}`);
        }
    }

    await browser.close();
}

export default globalSetup;
