import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import { getOtpFromDb, fillOTP } from '../tests/Registration/helpers';
import {
    loginAsMerchant,
    VALID_COMPANY_2,
    VALID_MOBILE_2,
    VALID_PASSWORD_2,
    ACCOUNT_1_STORAGE_STATE,
    ACCOUNT_2_STORAGE_STATE,
    LOGIN_URL,
} from '../tests/homepage/HomePageHelper';

const env            = process.env['ENV'] ?? 'dev';
const VALID_COMPANY  = process.env['UAT_SETUP_COMPANY'];
const VALID_MOBILE   = process.env['UAT_SETUP_MOBILE'];
const VALID_PASSWORD = process.env['UAT_SETUP_PASSWORD'];

async function globalSetup() {
    const browser = await chromium.launch();

    if (!VALID_COMPANY || !VALID_MOBILE || !VALID_PASSWORD) {
        console.warn('[global-setup] UAT_SETUP_COMPANY / UAT_SETUP_MOBILE / UAT_SETUP_PASSWORD not set — skipping session.json creation. Tests using storageState: \'session.json\' will be skipped or fail.');
    } else {
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
    }

    // Homepage suite: pre-authenticate both merchant accounts once here, so
    // individual homepage spec files restore via storageState instead of
    // each logging in live (faster, and avoids concurrent same-account
    // login collisions between parallel workers).
    mkdirSync('playwright/.auth', { recursive: true });
    await saveAuthenticatedStorageState(ACCOUNT_1_STORAGE_STATE);
    await saveAuthenticatedStorageState(ACCOUNT_2_STORAGE_STATE, { company: VALID_COMPANY_2, mobile: VALID_MOBILE_2, password: VALID_PASSWORD_2 });

    async function saveAuthenticatedStorageState(storagePath: string, creds?: { company: string; mobile: string; password: string }) {
        const context = await browser.newContext();
        const page    = await context.newPage();
        await loginAsMerchant(page, creds);
        await context.storageState({ path: storagePath });
        await context.close();
    }

    await browser.close();
}

export default globalSetup;
