import { Page } from '@playwright/test';
import { getOtpFromDb, fillOTP } from '../Registration/helpers';

const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const LOGIN_URL        = `${BASE_URL}/business/auth/login`;
export const HOME_URL         = `${BASE_URL}/business/main/home`;
export const HOME_URL_PATTERN = /\/business\/main\/home/;
export const BASE_ORIGIN      = BASE_URL;

export const VALID_COMPANY  = 'S2301';
export const VALID_MOBILE   = '500021788';
export const VALID_PASSWORD = 'Aa#1234567';

/** Full login flow: credentials → OTP (fetched from MongoDB) → home page. */
export async function loginAsMerchant(page: Page): Promise<void> {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
    await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();

    const otpHeading = page.getByRole('heading', { name: 'Enter OTP' });
    let landed: 'home' | 'otp';
    try {
        landed = await Promise.race([
            page.waitForURL(HOME_URL_PATTERN, { timeout: 20000 }).then(() => 'home' as const),
            otpHeading.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'otp' as const),
        ]);
    } catch (err) {
        throw new Error(
            `Login did not reach home or OTP screen within 20 s. Current URL: ${page.url()}\nCause: ${err}`
        );
    }

    if (landed === 'otp') {
        await page.getByRole('textbox', { name: 'One time password input' }).first()
            .waitFor({ state: 'visible', timeout: 10000 });
        const otp = await getOtpFromDb(VALID_MOBILE);
        await fillOTP(page, otp);
        const verifyBtn = page.getByRole('button', { name: 'Verify' });
        if (await verifyBtn.isVisible().catch(() => false)) {
            await verifyBtn.click();
        }
        await page.waitForURL(HOME_URL_PATTERN, { timeout: 30000 });
    }
}

/** Opens the profile dropdown and waits for the logout item to be visible. */
export async function openProfileMenu(page: Page): Promise<void> {
    await page.locator('#ddl_profile').click();
    await page.locator('#logout').waitFor({ state: 'visible' });
}
