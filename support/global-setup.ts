import { chromium } from '@playwright/test';
import { getOtpFromDb, fillOTP } from '../tests/Registration/helpers';

const env            = process.env['ENV'] ?? 'uat';
const BASE_URL       = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
const LOGIN_URL      = `${BASE_URL}/business/auth/login`;
const VALID_COMPANY  = process.env['UAT_SETUP_COMPANY']  ?? (() => { throw new Error('UAT_SETUP_COMPANY env var is not set'); })();
const VALID_MOBILE   = process.env['UAT_SETUP_MOBILE']   ?? (() => { throw new Error('UAT_SETUP_MOBILE env var is not set'); })();
const VALID_PASSWORD = process.env['UAT_SETUP_PASSWORD'] ?? (() => { throw new Error('UAT_SETUP_PASSWORD env var is not set'); })();

async function globalSetup() {
    const browser = await chromium.launch();
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
    await browser.close();
}

export default globalSetup;
