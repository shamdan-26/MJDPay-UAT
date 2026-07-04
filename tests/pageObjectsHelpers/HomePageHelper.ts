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

/** Second merchant account — used to spread homepage spec files across two
 *  sessions so parallel workers don't collide on the same account. */
export const VALID_COMPANY_2  = process.env['UAT_COMPANY_2'] ?? 'T9446';
export const VALID_MOBILE_2   = process.env['UAT_MOBILE_2']  ?? '502310965';
export const VALID_PASSWORD_2 = process.env['UAT_PASSWORD_2'] ?? 'Aa#1234567';

export const VALID_BILLER_COMPANY  = process.env['UAT_BILLER_COMPANY'] ?? 'L3999';
export const VALID_BILLER_MOBILE   = process.env['UAT_BILLER_MOBILE']  ?? '500318143';
export const VALID_BILLER_PASSWORD = process.env['UAT_BILLER_PASSWORD'] ?? 'Aa#1234567';

/** Pre-authenticated storage states for the two homepage merchant accounts,
 *  generated once by support/global-setup.ts. Spec files restore these via
 *  `browser.newContext({ storageState: ... })` instead of logging in live —
 *  no OTP round-trip, and no risk of concurrent same-account login collisions. */
export const ACCOUNT_1_STORAGE_STATE = 'playwright/.auth/homepage-account1.json';
export const ACCOUNT_2_STORAGE_STATE = 'playwright/.auth/homepage-account2.json';

export interface MerchantCredentials {
    company:  string;
    mobile:   string;
    password: string;
}

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

/** Full login flow: credentials → OTP (fetched from MongoDB) → home page.
 *  Defaults to the primary merchant account; pass `creds` to log in as a
 *  different account (e.g. VALID_COMPANY_2 / VALID_MOBILE_2 / VALID_PASSWORD_2).
 *
 *  Retries once on failure: when multiple spec files log into the same
 *  account concurrently (parallel workers sharing one of the two test
 *  accounts), the backend can invalidate one of the racing sessions. A
 *  short-delayed retry lets the other login finish first and self-heals. */
export async function loginAsMerchant(page: Page, creds?: MerchantCredentials): Promise<void> {
    const company  = creds?.company  ?? VALID_COMPANY;
    const mobile   = creds?.mobile   ?? VALID_MOBILE;
    const password = creds?.password ?? VALID_PASSWORD;

    const attemptLogin = async (): Promise<void> => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Company number' }).fill(company);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(mobile);
        await page.locator('input[aria-label="Password"]').fill(password);
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
            const otp = await getOtpFromDb(mobile);
            await fillOTP(page, otp);
            const verifyBtn = page.getByRole('button', { name: 'Verify' });
            if (await verifyBtn.isVisible().catch(() => false)) {
                await verifyBtn.click();
            }
            await page.waitForURL(HOME_URL_PATTERN, { timeout: 30000 });
        }
    };

    try {
        await attemptLogin();
    } catch (err) {
        console.warn(`[loginAsMerchant] first attempt failed for ${mobile}, retrying once. Cause: ${err}`);
        await new Promise(r => setTimeout(r, 3000));
        await attemptLogin();
    }
    await waitForToastClear(page);
}

/** Opens the profile dropdown and waits for the logout item to be visible. */
export async function openProfileMenu(page: Page): Promise<void> {
    const dashboard = new DashboardPage(page);
    await dashboard.openProfileMenu();
}
