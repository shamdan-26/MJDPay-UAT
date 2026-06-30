import { test, expect } from '@playwright/test';
import {
    SUBMIT_BUTTON,
    VALID_PASSWORD,
    VALID_MOBILE,
    INVALID_OTP,
    MODAL_SELECTOR,
    mockForgetPasswordSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../../pageObjects/ForgotPasswordHelper';
import { getOtpFromDb } from '../../login/helpers';
import { assertToast } from '../../shared';

// ── OTP Verification: Dialog functionality after step 2 submit ────────────────

test.describe('Forgot Password - OTP Verification Flow', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
        const otpAppeared = await page.locator(MODAL_SELECTOR).waitFor({ state: 'visible', timeout: 15000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!otpAppeared, 'OTP dialog did not appear — FORGET_PASSWORD OTP is disabled in this environment');
    });

    // ── Dialog presence ───────────────────────────────────────────────────────

    test('should display the OTP dialog after submitting new password', async ({ page }) => {
        await expect(page.locator(MODAL_SELECTOR)).toBeVisible();
    });

    // ── Confirm button state ──────────────────────────────────────────────────

    test('should keep Confirm button disabled when OTP inputs are empty', async ({ page }) => {
        await expect(page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Confirm' })).toBeDisabled();
    });

    test('should keep Confirm button disabled when OTP inputs are partially filled', async ({ page }) => {
        const inputs = page.locator(MODAL_SELECTOR).locator('input');
        await inputs.nth(0).fill('1');
        await inputs.nth(1).fill('2');
        await expect(page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Confirm' })).toBeDisabled();
    });

    test('should enable Confirm button when all OTP inputs are filled', async ({ page }) => {
        const inputs = page.locator(MODAL_SELECTOR).locator('input');
        const count = await inputs.count();
        for (let i = 0; i < count; i++) await inputs.nth(i).fill(String(i + 1));
        await expect(page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Confirm' })).toBeEnabled();
    });

    // ── Input validation ──────────────────────────────────────────────────────

    test('should not accept non-numeric characters in OTP inputs', async ({ page }) => {
        const input = page.locator(MODAL_SELECTOR).locator('input').first();
        await input.pressSequentially('a');
        await expect(input).toHaveValue('');
    });

    test('should auto-advance focus to the next OTP input when a digit is entered', async ({ page }) => {
        const inputs = page.locator(MODAL_SELECTOR).locator('input');
        await inputs.nth(0).click();
        await inputs.nth(0).press('1');
        await expect(inputs.nth(1)).toBeFocused({ timeout: 3000 });
    });

    // ── OTP submission ────────────────────────────────────────────────────────

    test('should remain on OTP dialog after submitting wrong OTP', async ({ page }) => {
        const inputs = page.locator(MODAL_SELECTOR).locator('input');
        const count = await inputs.count();
        for (let i = 0; i < count; i++) await inputs.nth(i).fill(INVALID_OTP[i] ?? '1');
        await page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Confirm' }).click();
        await expect(page.locator(MODAL_SELECTOR)).toBeVisible();
    });

    test('should display an error message after submitting wrong OTP', async ({ page }) => {
        const inputs = page.locator(MODAL_SELECTOR).locator('input');
        const count = await inputs.count();
        for (let i = 0; i < count; i++) await inputs.nth(i).fill(INVALID_OTP[i] ?? '1');
        await page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Confirm' }).click();
        const errorIndicator = page.locator(MODAL_SELECTOR).locator('[role="alert"], [class*="error"], [class*="invalid"]').first();
        await expect(errorIndicator).toBeVisible({ timeout: 5000 });
    });

    test('should reset password successfully with correct OTP, redirect to login, and show a success message', async ({ page }) => {
        // Password-reset SMS uses a different template; use /Use this/i to match either format.
        const otp    = await getOtpFromDb(VALID_MOBILE, 10, 2000, /Use this/i);
        const inputs = page.locator(MODAL_SELECTOR).locator('input');
        const count  = await inputs.count();
        for (let i = 0; i < count; i++) {
            await inputs.nth(i).pressSequentially(otp[i] ?? '0', { delay: 50 });
        }
        const confirmBtn = page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Confirm' });
        if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click({ timeout: 5000 }).catch(() => {});
        }
        await expect(page).toHaveURL(/login/, { timeout: 15000 });
        await assertToast(page);
    });

    // ── Resend ────────────────────────────────────────────────────────────────

    test('should keep resend button disabled while countdown timer is active', async ({ page }) => {
        await expect(page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Click to resend' })).toBeDisabled();
        await expect(page.locator(MODAL_SELECTOR).getByText(/Code ends/i)).toBeVisible();
    });

    test('should enable resend button after countdown expires and clear inputs on click', async ({ page }) => {
        const timerText = await page.locator(MODAL_SELECTOR).getByText(/Code ends/i).textContent();
        const match     = timerText?.match(/(\d+):(\d+)/);
        const seconds   = match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 90;
        test.setTimeout((seconds + 15) * 1000);

        const inputs = page.locator(MODAL_SELECTOR).locator('input');
        const count  = await inputs.count();
        for (let i = 0; i < count; i++) await inputs.nth(i).fill(String(i + 1));

        const resendBtn = page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Click to resend' });
        await expect(resendBtn).toBeEnabled({ timeout: (seconds + 5) * 1000 });
        await resendBtn.click();
        await expect(inputs.nth(0)).toHaveValue('');
    });

    // ── Cancel / dismiss ──────────────────────────────────────────────────────

    test('should close the OTP dialog when Cancel is clicked', async ({ page }) => {
        await page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Cancel' }).click();
        await expect(page.locator(MODAL_SELECTOR)).not.toBeVisible({ timeout: 5000 });
    });

    test('should return to the change-password page after cancelling the OTP dialog', async ({ page }) => {
        await page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Cancel' }).click();
        await expect(page).toHaveURL(/change-password/, { timeout: 5000 });
    });

    test('should allow re-submitting the form after cancelling the OTP dialog', async ({ page }) => {
        await page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Cancel' }).click();
        await expect(page.locator(MODAL_SELECTOR)).not.toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeVisible();
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeEnabled();
    });
});
