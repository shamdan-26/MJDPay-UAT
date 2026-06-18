import type { Page } from '@playwright/test';

export const LOGIN_URL    = 'https://uat.majdpay.com/business/auth/login';
export const SESSION_PATH = 'session.json';

export const VALID_COMPANY  = 'L3999';
export const VALID_MOBILE   = '500318143';
export const VALID_PASSWORD = 'Aa#1234567';

export const VALID_OTP   = '00000000';
export const INVALID_OTP = '11111111';

export async function gotoLogin(page: Page): Promise<void> {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
}

export async function fillAndSubmitLogin(page: Page): Promise<void> {
    await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
    await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();
}
