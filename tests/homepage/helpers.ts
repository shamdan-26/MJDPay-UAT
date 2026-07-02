import { Page } from '@playwright/test';
import { getOtpFromDb, fillOTP } from '../Registration/helpers';
import { waitForToastClear } from '../shared';
import { DashboardPage } from '../pages/DashboardPage';

const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const LOGIN_URL        = `${BASE_URL}/business/auth/login`;
export const HOME_URL         = `${BASE_URL}/business/main/home`;
export const HOME_URL_PATTERN = /\/business\/main\/home/;
export const BASE_ORIGIN      = BASE_URL;

export const VALID_COMPANY  = process.env['UAT_COMPANY'] ?? 'A2316';
export const VALID_MOBILE   = process.env['UAT_MOBILE']  ?? '500021788';
export const VALID_PASSWORD = 'Aa#1234567';

export const VALID_BILLER_COMPANY  = process.env['UAT_BILLER_COMPANY'] ?? 'L3999';
export const VALID_BILLER_MOBILE   = process.env['UAT_BILLER_MOBILE']  ?? '500318143';
export const VALID_BILLER_PASSWORD = process.env['UAT_BILLER_PASSWORD'] ?? 'Aa#1234567';

/** Full login flow for a biller: credentials → OTP (fetched from MongoDB) → home page.
 *  Requires UAT_BILLER_COMPANY and UAT_BILLER_MOBILE env vars to be set.
 *  Note (AMB-HP-01): assumes biller uses the same /business/auth/login endpoint as merchant.
 */
export async function loginAsBiller(page: Page): Promise<void> {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_BILLER_COMPANY);
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_BILLER_MOBILE);
    await page.locator('input[aria-label="Password"]').fill(VALID_BILLER_PASSWORD);
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
            `Biller login did not reach home or OTP screen within 20 s. Current URL: ${page.url()}\nCause: ${err}`
        );
    }

    if (landed === 'otp') {
        await page.getByRole('textbox', { name: 'One time password input' }).first()
            .waitFor({ state: 'visible', timeout: 10000 });
        const otp = await getOtpFromDb(VALID_BILLER_MOBILE);
        await fillOTP(page, otp);
        const verifyBtn = page.getByRole('button', { name: 'Verify' });
        if (await verifyBtn.isVisible().catch(() => false)) {
            await verifyBtn.click();
        }
        await page.waitForURL(HOME_URL_PATTERN, { timeout: 30000 });
    }
    await waitForToastClear(page);
}

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
    await waitForToastClear(page);
}

/** Opens the profile dropdown and waits for the logout item to be visible. */
export async function openProfileMenu(page: Page): Promise<void> {
    const dashboard = new DashboardPage(page);
    await dashboard.openProfileMenu();
}
