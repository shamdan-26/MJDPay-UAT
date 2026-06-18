import { Page } from '@playwright/test';

export const LOGIN_URL   = 'https://uat.majdpay.com/business/auth/login';
export const HOME_URL    = 'https://uat.majdpay.com/business/home';
export const BASE_ORIGIN = 'https://uat.majdpay.com';

export const VALID_COMPANY  = 'A2316';
export const VALID_MOBILE   = '500021788';
export const VALID_PASSWORD = 'Aa#1234567';
export const VALID_OTP      = '00000000'; // static OTP for dev environment

/** Full login flow: credentials â†’ OTP â†’ home page. */
export async function loginAsMerchant(page: Page): Promise<void> {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
    await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();

    await page.getByRole('heading', { name: 'Enter OTP' }).waitFor({ state: 'visible', timeout: 15000 });
    const inputs = page.getByRole('textbox', { name: 'One time password input' });
    const otpCount = await inputs.count();
    for (let i = 0; i < otpCount; i++) {
        await inputs.nth(i).fill(VALID_OTP[i] ?? '0');
    }
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.waitForURL(/\/business\/main\/home/, { timeout: 20000 });
}
