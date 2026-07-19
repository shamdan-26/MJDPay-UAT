import type { Page } from '@playwright/test';
import { ForgotPasswordPage } from '../pageElements/ForgotPasswordPage';
import { LoginPage } from '../pageElements/LoginPage';
import { OtpPage } from '../pageElements/OtpPage';
import { LOGIN_URL, VALID_OTP, INVALID_OTP } from '../Login/LoginHelper';
import testAccounts from '../../data/testAccounts.json';

const BASE_URL              = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const FORGOT_URL     = `${BASE_URL}/business/auth/forgot-password`;
export { LOGIN_URL, VALID_OTP, INVALID_OTP };

// Dedicated ForgotPassword identities (not the shared UAT_COMPANY/UAT_MOBILE
// pool used elsewhere) — kept separate so repeated forgot-password runs can't
// accidentally lock out an account other suites depend on.
export const VALID_COMPANY  = 'V7204';
export const VALID_MOBILE   = '599995846';

// Reserved for negative scenarios involving a blocked/locked account (or a
// flow that deliberately drives an account into that state) — never used on
// the happy path, so it doesn't get burned by unrelated test runs.
export const BLOCKED_COMPANY = 'A3713';
export const BLOCKED_MOBILE  = '599834420';

export const SUBMIT_BUTTON  = 'reset password';
export const VALID_PASSWORD = testAccounts.defaultPassword;

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

/**
 * Lets the step-1 identity check (`/auth/passwords/forget`) succeed so the flow
 * can reach step 2, but fails the final reset-password submission — for testing
 * error display when the reset itself is rejected (e.g. expired session, backend
 * error) rather than when the initial company/mobile lookup fails.
 */
export async function mockPasswordResetFailure(page: Page): Promise<void> {
    await page.route('**/auth/passwords/**', async route => {
        if (route.request().url().includes('/forget')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        } else {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Unable to reset password' }),
            });
        }
    });
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

/** Submits step 1 with the given identity against the real (unmocked) backend
 *  and reports back the /auth/passwords/forget response plus the page text
 *  afterward — for negative-scenario specs asserting how a specific identity
 *  (e.g. BLOCKED_COMPANY/BLOCKED_MOBILE) is actually treated, rather than
 *  guessing at status codes/copy up front. */
export async function submitStep1AndGetResult(
    page: Page,
    company: string,
    mobile: string
): Promise<{ status: number | null; body: string; pageText: string }> {
    await gotoForgotPassword(page);
    const fp = new ForgotPasswordPage(page);
    await fp.fillStep1(company, mobile);
    // Click directly rather than fp.submitStep1() — that hard-waits on step 2
    // appearing, which throws for identities the backend rejects (exactly the
    // case this helper exists to observe).
    const [resp] = await Promise.all([
        page.waitForResponse(r => r.url().includes('/auth/passwords/forget'), { timeout: 15000 }).catch(() => null),
        fp.nextButton.click(),
    ]);
    const body = resp ? await resp.text().catch(() => '') : '';
    await page.waitForTimeout(1000);
    const pageText = await page.evaluate(() => document.body.innerText);
    return { status: resp ? resp.status() : null, body, pageText };
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
