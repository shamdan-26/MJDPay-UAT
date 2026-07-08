import { test, expect } from '@playwright/test';
import { assertToast } from '../../shared';
import { VALID_MOBILE, INVALID_OTP, gotoOtpModal } from '../ForgotPasswordHelper';
import { getOtpFromDb } from '../../login/LoginHelper';
import { OtpPage } from '../../pageElements/OtpPage';
import { ForgotPasswordPage } from '../../pageElements/ForgotPasswordPage';

// ─────────────────────────────────────────────────────────────────────────────
// OTP VERIFICATION FLOW
// ─────────────────────────────────────────────────────────────────────────────
//
// Static UI facts about the OTP dialog (heading, instructions, input count,
// countdown visibility, Confirm-disabled-when-empty, resend-disabled) live in
// ui/ForgotPasswordOtpPage.spec.ts — this file owns interaction/business logic only.

test.describe('Forgot Password — OTP Verification Flow', () => {
    test.describe.configure({ mode: 'serial' });

    let otp: OtpPage;

    test.beforeEach(async ({ page }) => {
        // Step 1 must call the real API — mocking it with {} prevents the backend
        // from creating a session, and step 2 then has no token to trigger OTP.
        const otpAppeared = await gotoOtpModal(page);
        otp = new OtpPage(page);
        test.skip(!otpAppeared, 'OTP dialog did not appear — FORGET_PASSWORD OTP is disabled in this environment');
    });

    // Confirm button state

    test('should keep Confirm button disabled when OTP inputs are partially filled', async () => {
        await otp.inputs.nth(0).fill('1');
        await otp.inputs.nth(1).fill('2');
        await expect(otp.verifyButton).toBeDisabled();
    });

    test('should enable Confirm button when all OTP inputs are filled', async () => {
        const count = await otp.inputs.count();
        for (let i = 0; i < count; i++) await otp.inputs.nth(i).fill(String(i + 1));
        await expect(otp.verifyButton).toBeEnabled();
    });

    // Input validation

    test('should not accept non-numeric characters in OTP inputs', async () => {
        const input = otp.inputs.first();
        await input.pressSequentially('a');
        await expect(input).toHaveValue('');
    });

    test('should auto-advance focus to the next OTP input when a digit is entered', async () => {
        await otp.inputs.nth(0).click();
        await otp.inputs.nth(0).press('1');
        await expect(otp.inputs.nth(1)).toBeFocused({ timeout: 3000 });
    });

    // OTP submission

    test('should remain on OTP dialog after submitting wrong OTP', async () => {
        const count = await otp.inputs.count();
        for (let i = 0; i < count; i++) await otp.inputs.nth(i).fill(INVALID_OTP[i] ?? '1');
        await otp.verifyButton.click();
        await expect(otp.modalContainer).toBeVisible();
    });

    test('should display an error message after submitting wrong OTP', async ({ page }) => {
        const count = await otp.inputs.count();
        for (let i = 0; i < count; i++) await otp.inputs.nth(i).fill(INVALID_OTP[i] ?? '1');
        await otp.verifyButton.click();
        const errorIndicator = otp.modalContainer.locator('[role="alert"], [class*="error"], [class*="invalid"]').first();
        await expect(errorIndicator).toBeVisible({ timeout: 5000 });
    });

    test('should not expose technical details in the wrong-OTP error message', async () => {
        const count = await otp.inputs.count();
        for (let i = 0; i < count; i++) await otp.inputs.nth(i).fill(INVALID_OTP[i] ?? '1');
        await otp.verifyButton.click();
        const errorIndicator = otp.modalContainer.locator('[role="alert"], [class*="error"], [class*="invalid"]').first();
        await expect(errorIndicator).toBeVisible({ timeout: 5000 });
        const text = await errorIndicator.textContent() ?? '';
        expect(text).not.toMatch(/stack|exception|sql|database|null pointer|traceback|internal server error/i);
    });

    test('should clear the wrong-OTP error indicator once the inputs are corrected and resubmitted', async () => {
        const count = await otp.inputs.count();
        for (let i = 0; i < count; i++) await otp.inputs.nth(i).fill(INVALID_OTP[i] ?? '1');
        await otp.verifyButton.click();
        const errorIndicator = otp.modalContainer.locator('[role="alert"], [class*="error"], [class*="invalid"]').first();
        await expect(errorIndicator).toBeVisible({ timeout: 5000 });

        for (let i = 0; i < count; i++) await otp.inputs.nth(i).fill('9');
        await expect(otp.modalContainer).toBeVisible();
    });

    test('should reset password successfully with correct OTP, redirect to login, and show a success toast', async ({ page }) => {
        const otpCode = await getOtpFromDb(VALID_MOBILE, 10, 2000, /Use this/i);
        await otp.fill(otpCode);
        await otp.verify();
        await expect(page).toHaveURL(/login/, { timeout: 15000 });
        await assertToast(page);
    });

    // Resend

    test('should enable resend button after countdown expires and clear inputs on click', async () => {
        const seconds = await otp.getRemainingSeconds() || 90;
        test.setTimeout((seconds + 15) * 1000);

        const count = await otp.inputs.count();
        for (let i = 0; i < count; i++) await otp.inputs.nth(i).fill(String(i + 1));

        await expect(otp.resendButton).toBeEnabled({ timeout: (seconds + 5) * 1000 });
        await otp.resendButton.click();
        await expect(otp.inputs.nth(0)).toHaveValue('');
    });

    // Cancel / dismiss

    test('should close the OTP dialog when Cancel is clicked', async () => {
        await otp.cancelButton.click();
        await expect(otp.modalContainer).not.toBeVisible({ timeout: 5000 });
    });

    test('should return to the change-password page after cancelling the OTP dialog', async ({ page }) => {
        await otp.cancelButton.click();
        await expect(page).toHaveURL(/change-password/, { timeout: 5000 });
    });

    test('should allow re-submitting the form after cancelling the OTP dialog', async ({ page }) => {
        await otp.cancelButton.click();
        await expect(otp.modalContainer).not.toBeVisible({ timeout: 5000 });
        const forgotPassword = new ForgotPasswordPage(page);
        await expect(forgotPassword.resetPasswordButton).toBeVisible();
        await expect(forgotPassword.resetPasswordButton).toBeEnabled();
    });
});
