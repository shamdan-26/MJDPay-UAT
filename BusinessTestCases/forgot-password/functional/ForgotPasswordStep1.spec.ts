import { test, expect } from '@playwright/test';
import { assertToast } from '../../toastMessages';
import {
    FORGOT_URL,
    VALID_COMPANY,
    VALID_MOBILE,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    mockForgetPasswordFailure,
    abortUnmockedGatewayRequests,
    gotoForgotPassword,
} from '../ForgotPasswordHelper';
import { ForgotPasswordPage } from '../../pageElements/ForgotPasswordPage';
import { OtpPage } from '../../pageElements/OtpPage';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: HAPPY PATH
// ─────────────────────────────────────────────────────────────────────────────
//
// Static page-load/logo/language/theme/field-visibility checks live in
// ui/ForgotPassword.spec.ts — this describe owns flow-progression only.

test.describe('Forgot Password — Step 1: Happy Path', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        forgotPassword = new ForgotPasswordPage(page);
    });

    test('should switch to Arabic (RTL) when the Arabic button is clicked', async () => {
        await forgotPassword.arabicButton.click();
        await forgotPassword.arabicButton.waitFor({ state: 'visible', timeout: 15000 });
        await expect(forgotPassword.arabicButton).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
    });

    test('should switch back to English when EN is clicked after Arabic', async () => {
        await forgotPassword.arabicButton.click();
        await forgotPassword.arabicButton.waitFor({ state: 'visible', timeout: 15000 });
        await forgotPassword.enButton.click();
        await forgotPassword.enButton.waitFor({ state: 'visible', timeout: 15000 });
        await expect(forgotPassword.enButton).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
    });

    test('should accept and retain alphanumeric input in the Company number field', async () => {
        await forgotPassword.companyInput.fill(VALID_COMPANY);
        await expect(forgotPassword.companyInput).toHaveValue(VALID_COMPANY);
    });

    test('should accept and retain a valid 9-digit mobile number', async () => {
        await forgotPassword.mobileInput.fill(VALID_MOBILE);
        await expect(forgotPassword.mobileInput).toHaveValue(VALID_MOBILE);
    });

    test('should enable the Next button when both Company and Mobile fields are filled', async () => {
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await expect(forgotPassword.nextButton).toBeEnabled();
    });

    test('should navigate to the change-password URL after submitting valid credentials', async ({ page }) => {
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();
        await expect(page).toHaveURL(/change-password/, { timeout: 15000 });
    });

    test('should show the New Password field after step 1 succeeds', async () => {
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();
        await expect(forgotPassword.newPasswordInput).toBeVisible({ timeout: 15000 });
    });

    test('should show the Confirm Password field after step 1 succeeds', async () => {
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();
        await expect(forgotPassword.confirmPasswordInput).toBeVisible({ timeout: 15000 });
    });

    test('should hide the step-1 fields after step 1 succeeds', async () => {
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();
        await expect(forgotPassword.newPasswordInput).toBeVisible({ timeout: 15000 });
        await expect(forgotPassword.companyInput).not.toBeVisible();
        await expect(forgotPassword.mobileInput).not.toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: MOBILE NUMBER VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 1: Mobile Number Validation', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(FORGOT_URL).origin });
        await gotoForgotPassword(page);
        forgotPassword = new ForgotPasswordPage(page);
        await forgotPassword.companyInput.fill(VALID_COMPANY);
    });

    // Format blocking

    test('should keep Next button disabled when mobile is too short', async () => {
        await forgotPassword.mobileInput.fill('5123');
        await expect(forgotPassword.nextButton).toBeDisabled();
    });

    test('should keep Next button disabled when mobile has a leading zero', async () => {
        await forgotPassword.mobileInput.fill('0500021788');
        await expect(forgotPassword.nextButton).toBeDisabled();
    });

    // Character filtering

    test('should not accept alphabetic characters in the mobile field', async () => {
        await forgotPassword.mobileInput.pressSequentially('abc');
        await expect(forgotPassword.mobileInput).toHaveValue('');
    });

    test('should not accept special characters in the mobile field', async () => {
        await forgotPassword.mobileInput.pressSequentially('!@#');
        await expect(forgotPassword.mobileInput).toHaveValue('');
    });

    // Valid format

    test('should enable Next button with a valid 9-digit mobile starting with 5', async () => {
        await forgotPassword.mobileInput.fill('500021788');
        await expect(forgotPassword.nextButton).toBeEnabled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: NEGATIVE SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 1: Negative Scenarios', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;
    let otp: OtpPage;

    test.beforeEach(async ({ page }) => {
        await abortUnmockedGatewayRequests(page);
        await mockOtpDisabled(page);
        await mockForgetPasswordFailure(page);
        await gotoForgotPassword(page);
        forgotPassword = new ForgotPasswordPage(page);
        otp = new OtpPage(page);
    });

    // Button disabled states

    test('should have the Next button disabled when both fields are empty', async () => {
        await expect(forgotPassword.nextButton).toBeDisabled();
    });

    test('should have the Next button disabled when only Company number is filled', async () => {
        await forgotPassword.companyInput.fill(VALID_COMPANY);
        await expect(forgotPassword.nextButton).toBeDisabled();
    });

    test('should have the Next button disabled when only Mobile number is filled', async () => {
        await forgotPassword.mobileInput.fill(VALID_MOBILE);
        await expect(forgotPassword.nextButton).toBeDisabled();
    });

    test('should disable the Next button again after clearing the Company number field', async () => {
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await expect(forgotPassword.nextButton).toBeEnabled();
        await forgotPassword.companyInput.clear();
        await expect(forgotPassword.nextButton).toBeDisabled();
    });

    test('should disable the Next button again after clearing the Mobile number field', async () => {
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await expect(forgotPassword.nextButton).toBeEnabled();
        await forgotPassword.mobileInput.clear();
        await expect(forgotPassword.nextButton).toBeDisabled();
    });

    // Failed submission

    test('should remain on the forgot-password page after submitting invalid credentials', async ({ page }) => {
        await forgotPassword.fillStep1('INVALID', '500000000');
        await forgotPassword.nextButton.click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
    });

    test('should display a toast error notification after submitting invalid credentials', async ({ page }) => {
        await forgotPassword.fillStep1('INVALID', '500000000');
        await forgotPassword.nextButton.click();
        await assertToast(page);
    });

    test('should preserve the Company number field value after a failed submission', async ({ page }) => {
        await forgotPassword.fillStep1('INVALID', '500000000');
        await forgotPassword.nextButton.click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await expect(forgotPassword.companyInput).toHaveValue('INVALID');
    });

    test('should preserve the Mobile number field value after a failed submission', async ({ page }) => {
        await forgotPassword.fillStep1('INVALID', '500000000');
        await forgotPassword.nextButton.click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await expect(forgotPassword.mobileInput).toHaveValue('500000000');
    });

    test('should not advance to step 2 when the API rejects the credentials', async ({ page }) => {
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();
        await assertToast(page);
        await expect(forgotPassword.newPasswordInput).not.toBeVisible({ timeout: 5000 });
    });

    test('should not display the OTP dialog when credentials are rejected', async ({ page }) => {
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();
        await assertToast(page);
        await expect(otp.heading).not.toBeVisible();
    });

    test('should keep the step-1 heading and eyebrow visible after a failed submission', async ({ page }) => {
        await forgotPassword.fillStep1('INVALID', '500000000');
        await forgotPassword.nextButton.click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await expect(page.getByText('Welcome to MJD Pay')).toBeVisible();
        await expect(page.getByText('Forgot password')).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 1: Edge Cases', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page }) => {
        await abortUnmockedGatewayRequests(page);
        await mockOtpDisabled(page);
        await gotoForgotPassword(page);
        forgotPassword = new ForgotPasswordPage(page);
    });

    test('should keep Next button disabled when Company number contains only spaces', async () => {
        await forgotPassword.fillStep1('   ', VALID_MOBILE);
        await expect(forgotPassword.nextButton).toBeDisabled();
    });

    test('should strip non-digit formatting characters (spaces and dashes) from the Mobile field', async () => {
        await forgotPassword.mobileInput.pressSequentially('500-318-143');
        const value = await forgotPassword.mobileInput.inputValue();
        expect(value).not.toContain('-');
        expect(value).not.toContain(' ');
    });

    test('should not crash the page when Company number is an extremely long string', async ({ page }) => {
        await forgotPassword.fillStep1('A'.repeat(200), VALID_MOBILE);
        await expect(forgotPassword.nextButton).toBeVisible();
        await expect(page).toHaveURL(FORGOT_URL);
    });

    test('should not crash when Mobile number is pasted as an extremely long string', async ({ page }) => {
        await forgotPassword.mobileInput.fill('5'.repeat(50));
        await expect(page).toHaveURL(FORGOT_URL);
    });

    test('should keep the theme intact after a language switch', async () => {
        const themeBtn = forgotPassword.page.locator('#text_toggleButton');
        await themeBtn.click();
        await expect(themeBtn).toHaveClass(/dark/);
        await forgotPassword.arabicButton.click();
        await forgotPassword.arabicButton.waitFor({ state: 'visible', timeout: 10000 });
        await expect(themeBtn).toHaveClass(/dark/);
    });

    test.skip('should submit step 1 when Enter is pressed in the Mobile field', async ({ page }) => {
        await mockForgetPasswordSuccess(page);
        await forgotPassword.companyInput.fill(VALID_COMPANY);
        await forgotPassword.mobileInput.fill(VALID_MOBILE);
        await forgotPassword.mobileInput.press('Enter');
        await expect(page).toHaveURL(/change-password/, { timeout: 15000 });
    });

    test('should not send duplicate API requests when Next is double-clicked', async ({ page }) => {
        let requestCount = 0;
        await page.route('**/auth/passwords/forget', async route => {
            requestCount++;
            await new Promise(r => setTimeout(r, 2000));
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }).catch(() => {});
        });
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.dblclick();
        await page.waitForURL(/change-password/, { timeout: 10000 });
        expect(requestCount).toBe(1);
    });

    test('should show a loading spinner on the Next button while the API request is in flight', async () => {
        await forgotPassword.page.route('**/auth/passwords/forget', async route => {
            await new Promise(r => setTimeout(r, 1000));
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        });
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();
        await expect(
            forgotPassword.page.locator('mat-spinner, .mat-progress-spinner, [class*="spinner"], [class*="loading"]').first()
        ).toBeVisible({ timeout: 3000 });
    });

    test('should not alter a validly formatted company number (no trimming or transformation)', async () => {
        await forgotPassword.companyInput.fill(VALID_COMPANY);
        await expect(forgotPassword.companyInput).toHaveValue(VALID_COMPANY);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: SECURITY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 1: Security', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page }) => {
        await abortUnmockedGatewayRequests(page);
        await mockOtpDisabled(page);
        await mockForgetPasswordFailure(page);
        await gotoForgotPassword(page);
        forgotPassword = new ForgotPasswordPage(page);
    });

    test('should not execute a script payload entered in the Company number field', async ({ page }) => {
        let dialogTriggered = false;
        page.on('dialog', async dialog => { dialogTriggered = true; await dialog.dismiss(); });
        await forgotPassword.fillStep1('<script>alert(1)</script>', '500000000');
        await forgotPassword.nextButton.click();
        await assertToast(page);
        expect(dialogTriggered).toBe(false);
    });

    test('should not execute a script payload entered in the Mobile number field', async ({ page }) => {
        let dialogTriggered = false;
        page.on('dialog', async dialog => { dialogTriggered = true; await dialog.dismiss(); });
        await forgotPassword.companyInput.fill(VALID_COMPANY);
        await forgotPassword.mobileInput.pressSequentially('<script>alert(1)</script>');
        expect(dialogTriggered).toBe(false);
    });

    test('should treat SQL-injection-style Company number input as an invalid credential and not crash the page', async ({ page }) => {
        await forgotPassword.fillStep1("' OR '1'='1", '500000000');
        await forgotPassword.nextButton.click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await assertToast(page);
    });

    test('should not expose technical details (stack trace, SQL, DB errors) in the error toast', async () => {
        await forgotPassword.fillStep1('INVALID', '500000000');
        await forgotPassword.nextButton.click();
        const detail = forgotPassword.page.locator('.toast-snackbar__detail');
        await expect(detail).toBeVisible({ timeout: 10000 });
        const text = await detail.textContent() ?? '';
        expect(text).not.toMatch(/stack|exception|sql|database|null pointer|traceback|internal server error/i);
    });

    test('should not expose the New Password form when the change-password URL is opened directly without completing step 1', async ({ page }) => {
        await page.goto(FORGOT_URL.replace('forgot-password', 'change-password'), { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(forgotPassword.newPasswordInput).not.toBeVisible({ timeout: 10000 });
    });

    test('should send the credential-check request as POST with data in the body, not the URL', async ({ page }) => {
        let capturedUrl    = '';
        let capturedMethod = '';
        page.on('request', req => {
            if (req.url().includes('/auth/passwords/forget')) {
                capturedUrl    = req.url();
                capturedMethod = req.method();
            }
        });
        await mockForgetPasswordSuccess(page);
        await forgotPassword.fillStep1(VALID_COMPANY, VALID_MOBILE);
        await forgotPassword.nextButton.click();
        await expect(page).toHaveURL(/change-password/, { timeout: 15000 });
        expect(capturedMethod).toBe('POST');
        expect(capturedUrl).not.toContain(VALID_COMPANY);
        expect(capturedUrl).not.toContain(VALID_MOBILE);
    });

    test('should give a generic error and not reveal whether the company or mobile number was the invalid part', async () => {
        await forgotPassword.fillStep1('WRONGCOMPANY', VALID_MOBILE);
        await forgotPassword.nextButton.click();
        const detail = forgotPassword.page.locator('.toast-snackbar__detail');
        await expect(detail).toBeVisible({ timeout: 10000 });
        const text = await detail.textContent() ?? '';
        expect(text).not.toMatch(/company number (is )?(invalid|not found|does not exist)/i);
        expect(text).not.toMatch(/mobile (number )?(is )?(invalid|not found|does not exist)/i);
    });
});
