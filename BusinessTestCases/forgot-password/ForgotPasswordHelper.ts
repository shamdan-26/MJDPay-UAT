import type { Page } from '@playwright/test';
import { ForgotPasswordPage } from '../pageElements/ForgotPasswordPage';
import { LoginPage } from '../pageElements/LoginPage';
import { OtpPage } from '../pageElements/OtpPage';
import { LOGIN_URL, VALID_OTP, INVALID_OTP } from '../login/LoginHelper';

const BASE_URL              = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const FORGOT_URL     = `${BASE_URL}/business/auth/forgot-password`;
export { LOGIN_URL, VALID_OTP, INVALID_OTP };

export const VALID_COMPANY  = process.env['UAT_COMPANY'] ?? 'A2316';
export const VALID_MOBILE   = process.env['UAT_MOBILE']  ?? '500021788';

export const SUBMIT_BUTTON  = 'reset password';
export const VALID_PASSWORD = 'Aa#1234567';

export const MODAL_SELECTOR = "div.my-modal-container";

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
    const loginPage = new LoginPage(page);
    await loginPage.goto(LOGIN_URL);
    await loginPage.forgotPasswordLink.click();
    const fp = new ForgotPasswordPage(page);
    await fp.companyInput.waitFor({ state: 'visible', timeout: 15000 });
}

export async function fillStep1AndProceed(page: Page): Promise<void> {
    const fp = new ForgotPasswordPage(page);
    await fp.fillStep1(VALID_COMPANY, VALID_MOBILE);
    await fp.submitStep1();
}

/** Drives the full step1 → step2 → submit flow up to the OTP modal, for specs
 *  whose subject is the OTP popup itself rather than the flow that reaches it.
 *  Returns whether the modal actually appeared, so callers in environments
 *  where forget-password OTP may be disabled can skip instead of hard-failing. */
export async function gotoOtpModal(page: Page): Promise<boolean> {
    await gotoForgotPassword(page);
    await fillStep1AndProceed(page);
    const fp = new ForgotPasswordPage(page);
    await fp.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
    await fp.resetPasswordButton.click();
    const otp = new OtpPage(page);
    return otp.modalContainer.waitFor({ state: 'visible', timeout: 20000 })
        .then(() => true)
        .catch(() => false);
}
