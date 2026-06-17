import { chromium } from '@playwright/test';

const LOGIN_URL     = 'https://uat.majdpay.com/business/auth/login';
const VALID_COMPANY  = 'L3999';
const VALID_MOBILE   = '500318143';
const VALID_PASSWORD = 'Aa#1234567';
const VALID_OTP      = '0000';

async function globalSetup() {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page    = await context.newPage();

    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
    await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();

    // Handle OTP if the environment has it enabled
    const otpVisible = await page.getByRole('heading', { name: 'Enter OTP' })
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => true)
        .catch(() => false);

    if (otpVisible) {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        for (let i = 0; i < 4; i++) await inputs.nth(i).fill(VALID_OTP[i]);
        await page.getByRole('button', { name: 'Verify' }).click();
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
    }

    // Save cookies + localStorage so tests can restore the authenticated state
    await context.storageState({ path: 'session.json' });
    await browser.close();
}

export default globalSetup;
