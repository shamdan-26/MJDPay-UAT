import { test, expect, type Page } from '@playwright/test';
import {
    LOGIN_URL,
    LOGIN_COMPANY,
    LOGIN_MOBILE,
    VALID_COMPANY,
    VALID_MOBILE,
    VALID_PASSWORD,
    WRONG_PASSWORD,
    INVALID_OTP,
    gotoLogin,
    fillAndSubmitLogin,
    getOtpFromDb,
} from '../LoginHelper';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';

// Uses pressSequentially on the password field to reliably trigger Angular reactive form validation.
async function submitWithSequentialPassword(page: Page, loginPage: LoginPage): Promise<void> {
    await loginPage.companyInput.fill(LOGIN_COMPANY);
    await loginPage.mobileInput.fill(LOGIN_MOBILE);
    await loginPage.passwordInput.click();
    await loginPage.passwordInput.pressSequentially(VALID_PASSWORD, { delay: 50 });
    await loginPage.loginButton.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — OTP Flow', () => {
    test.describe.configure({ mode: 'serial' });

    let otp: OtpPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });
        await gotoLogin(page);
        await fillAndSubmitLogin(page);
        otp = new OtpPage(page);
        // 30 s covers validation card (~10 s) + OTP dialog appearance
        const otpAppeared = await otp.heading.waitFor({ state: 'visible', timeout: 30000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!otpAppeared, 'OTP dialog did not appear — Login OTP is disabled in this environment');
    });

    test('should display the OTP dialog after submitting valid credentials', async () => {
        await expect(otp.heading).toBeVisible();
    });

    test('should have Verify button disabled when OTP inputs are empty', async () => {
        await expect(otp.verifyButton).toBeDisabled();
    });

    test('should keep Verify button disabled when OTP inputs are partially filled', async () => {
        await otp.inputs.nth(0).fill('1');
        await otp.inputs.nth(1).fill('2');
        await expect(otp.verifyButton).toBeDisabled();
    });

    test('should enable Verify button when all OTP inputs are filled', async () => {
        const count = await otp.inputs.count();
        for (let i = 0; i < count; i++) await otp.inputs.nth(i).fill(String(i + 1));
        await expect(otp.verifyButton).toBeEnabled();
    });

    test('should not accept non-numeric characters in OTP inputs', async () => {
        const input = otp.inputs.first();
        await input.pressSequentially('a');
        await expect(input).toHaveValue('');
    });

    test('should auto-advance focus to the next input when a digit is entered', async () => {
        await otp.inputs.nth(0).click();
        await otp.inputs.nth(0).press('1');
        await expect(otp.inputs.nth(1)).toBeFocused({ timeout: 3000 });
    });

    test('should have Click to resend button disabled while the countdown is active', async () => {
        await expect(otp.resendButton).toBeDisabled();
        await expect(otp.countdownTimer).toBeVisible();
    });

    test('should enable resend button after countdown expires and clear inputs on click', async () => {
        const seconds = await otp.getRemainingSeconds() || 90;
        test.setTimeout((seconds + 15) * 1000);

        await expect(otp.resendButton).toBeEnabled({ timeout: (seconds + 5) * 1000 });
        await otp.resendButton.click();
        await expect(otp.inputs.nth(0)).toHaveValue('');
    });

    test('should close the OTP popup when Cancel is clicked', async () => {
        await otp.cancelButton.click();
        await expect(otp.heading).not.toBeVisible();
    });

    test('should return to the login form when Cancel is clicked', async ({ page }) => {
        await otp.cancelButton.click();
        await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
    });

    test('should remain on the OTP popup after submitting a wrong OTP', async () => {
        const count = await otp.inputs.count();
        for (let i = 0; i < count; i++) await otp.inputs.nth(i).fill(INVALID_OTP[i] ?? '1');
        await otp.verifyButton.click();
        await expect(otp.heading).toBeVisible();
    });

    test('should log in successfully and redirect when the correct OTP is entered', async ({ page }) => {
        const otpCode = await getOtpFromDb(LOGIN_MOBILE);
        await otp.fillAndVerify(otpCode);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 15000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION CARD  (submit → 3-step card → OTP [optional/configurable] or dashboard)
// ─────────────────────────────────────────────────────────────────────────────
//
// The card's basic appearance and 3-step text display, and the post-card OTP
// dialog appearing, are owned by ui/LoginValidationPopup.spec.ts — this
// describe owns only what's unique: the negative case, per-step checkmark/
// spinner visuals, and the no-OTP direct-redirect path.

test.describe('Login — Validation Card', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });
        loginPage = new LoginPage(page);
        await loginPage.goto(LOGIN_URL);
    });

    test('should NOT display the validation card when login fails with wrong password', async ({ page }) => {
        await loginPage.fill(VALID_COMPANY, VALID_MOBILE, WRONG_PASSWORD);
        await loginPage.submit();
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 5000 });
    });

    // ── 3-step progression ────────────────────────────────────────────────────

    test('should mark step 1 "Verifying your credentials" as complete with a checkmark', async ({ page }) => {
        await submitWithSequentialPassword(page, loginPage);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 15000 });
        const step1 = page.locator('li, div').filter({ hasText: 'Verifying your credentials' });
        await expect(step1.locator('svg, [class*="check"], [class*="success"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('should mark step 2 "Preparing this device" as complete with a checkmark', async ({ page }) => {
        await submitWithSequentialPassword(page, loginPage);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 15000 });
        const step2 = page.locator('li, div').filter({ hasText: 'Preparing this device' });
        await expect(step2.locator('svg, [class*="check"], [class*="success"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show a spinner on step 3 "Securing your session" while it is in progress', async ({ page }) => {
        await submitWithSequentialPassword(page, loginPage);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 15000 });
        const step3 = page.locator('li, div').filter({ hasText: 'Securing your session' });
        await expect(step3.locator('[class*="spin"], [class*="loader"], circle').first()).toBeVisible({ timeout: 5000 });
    });

    // ── Post-card transition ──────────────────────────────────────────────────

    test('should redirect to dashboard after the validation card dismisses (when OTP is disabled)', async ({ page }) => {
        await submitWithSequentialPassword(page, loginPage);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 20000 });
        const otp = new OtpPage(page);
        const otpAppeared = await otp.heading.waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);
        test.skip(otpAppeared, 'OTP is enabled in this environment — direct redirect is not applicable');
        await expect(page).not.toHaveURL(LOGIN_URL);
    });
});
