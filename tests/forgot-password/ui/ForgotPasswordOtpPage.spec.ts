import { test, expect } from '@playwright/test';
import { gotoOtpModal } from '../ForgotPasswordHelper';
import { OtpPage } from '../../pageElements/OtpPage';

test.describe('Forgot Password OTP Popup — UI', () => {
    test.describe.configure({ mode: 'serial' });

    let otp: OtpPage;

    test.beforeEach(async ({ page }) => {
        await gotoOtpModal(page);
        otp = new OtpPage(page);
    });

    // ── Modal container ───────────────────────────────────────────────────────

    test('should display the OTP modal dialog', async () => {
        await expect(otp.modalContainer).toBeVisible();
    });

    // ── Heading ───────────────────────────────────────────────────────────────

    test('should display the "Enter OTP" heading', async () => {
        await expect(otp.heading).toBeVisible();
    });

    // ── Description text ──────────────────────────────────────────────────────

    test('should display the instruction text', async () => {
        await expect(otp.instructionText).toBeVisible();
    });

    test('should mention the Change Password Process in the instruction text', async () => {
        await expect(
            otp.modalContainer.getByText(/Change Password Process/i)
        ).toBeVisible();
    });

    // ── Close button ──────────────────────────────────────────────────────────

    test('should display the close (×) button', async () => {
        await expect(otp.closeButton).toBeVisible();
    });

    test('should have the close button enabled', async () => {
        await expect(otp.closeButton).toBeEnabled();
    });

    // ── OTP inputs ────────────────────────────────────────────────────────────

    test('should display 6 OTP digit input boxes', async () => {
        await expect(otp.inputs).toHaveCount(6);
    });

    test('should show all OTP inputs visible', async () => {
        const count = await otp.inputs.count();
        for (let i = 0; i < count; i++) {
            await expect(otp.inputs.nth(i)).toBeVisible();
        }
    });

    test('should show all OTP inputs empty by default', async () => {
        const count = await otp.inputs.count();
        for (let i = 0; i < count; i++) {
            await expect(otp.inputs.nth(i)).toHaveValue('');
        }
    });

    test('should focus the first OTP input when the dialog opens', async () => {
        await expect(otp.inputs.first()).toBeFocused({ timeout: 3000 });
    });

    // ── Countdown timer ───────────────────────────────────────────────────────

    test('should display the countdown timer', async () => {
        await expect(otp.countdownTimer).toBeVisible();
    });

    test('should show the timer value in MM:SS format', async () => {
        const timerText = await otp.countdownTimer.textContent();
        expect(timerText).toMatch(/\d{2}:\d{2}/);
    });

    // ── Resend ────────────────────────────────────────────────────────────────

    test('should display the "Didn\'t Receive Code?" label', async () => {
        await expect(
            otp.modalContainer.getByText(/Didn't Receive Code\?/i)
        ).toBeVisible();
    });

    test('should display the "Click to resend" button', async () => {
        await expect(otp.resendButton).toBeVisible();
    });

    test('should have "Click to resend" disabled while the countdown is active', async () => {
        await expect(otp.resendButton).toBeDisabled();
    });

    // ── Cancel button ─────────────────────────────────────────────────────────

    test('should display the Cancel button', async () => {
        await expect(otp.cancelButton).toBeVisible();
    });

    test('should have the Cancel button enabled', async () => {
        await expect(otp.cancelButton).toBeEnabled();
    });

    // ── Confirm button ────────────────────────────────────────────────────────

    test('should display the Confirm button', async () => {
        await expect(otp.verifyButton).toBeVisible();
    });

    test('should have the Confirm button disabled when OTP inputs are empty', async () => {
        await expect(otp.verifyButton).toBeDisabled();
    });
});
