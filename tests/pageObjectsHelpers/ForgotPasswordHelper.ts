import type { Page } from '@playwright/test';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';

const BASE_URL              = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const FORGOT_URL     = `${BASE_URL}/business/auth/forgot-password`;
export const LOGIN_URL      = `${BASE_URL}/business/auth/login`;

export const VALID_COMPANY  = process.env['UAT_COMPANY'] ?? 'A2316';
export const VALID_MOBILE   = process.env['UAT_MOBILE']  ?? '500021788';

export const SUBMIT_BUTTON  = 'reset password';
export const VALID_PASSWORD = 'Aa#1234567';

export const VALID_OTP      = '00000000';
export const INVALID_OTP    = '11111111';

export const MODAL_SELECTOR = "//div[@class='my-modal-container']";

// ── Route mocking helpers ─────────────────────────────────────────────────────

export async function mockOtpDisabled(page: Page): Promise<void> {
    await page.route('**/otp/otp-settings/**', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false }) })
    );
}

export async function mockForgetPasswordSuccess(page: Page): Promise<void> {
    await page.route('**/auth/passwords/forget', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
}

export async function mockForgetPasswordFailure(page: Page): Promise<void> {
    await page.route('**/auth/passwords/forget', route =>
        route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid credentials' }) })
    );
}

export async function mockAllPasswordsSuccess(page: Page): Promise<void> {
    await page.route('**/auth/passwords/**', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
}

// Register a catch-all abort BEFORE specific mocks so LIFO ordering lets
// targeted mocks take priority while preventing teardown hangs from unmocked requests.
export async function abortUnmockedGatewayRequests(page: Page): Promise<void> {
    await page.route('https://gateway-uat.majdpay.com/**', route => route.abort());
}

// ── Navigation helpers ────────────────────────────────────────────────────────

export async function gotoForgotPassword(page: Page): Promise<void> {
    const fp = new ForgotPasswordPage(page);
    await fp.goto(FORGOT_URL);
}

export async function fillStep1AndProceed(page: Page): Promise<void> {
    const fp = new ForgotPasswordPage(page);
    await fp.fillStep1(VALID_COMPANY, VALID_MOBILE);
    await fp.submitStep1();
}
