import { test, expect } from '../../fixtures';
import { VALID_MOBILE, INVALID_OTP, gotoOtpModal } from '../ForgotPasswordHelper';
import { getOtpFromDb } from '../../Login/LoginHelper';
import type { OtpPage } from '../../pageElements/Shared/OtpPage';

// ─────────────────────────────────────────────────────────────────────────────
// OTP lifecycle — real backend + OTP read from the database.
// Covers FP-E2E-03 (reuse / replaced code) and FP-E2E-04 (lockout after repeated failures).
// The reset password used is the account's current password, so the account is left unchanged.
// ─────────────────────────────────────────────────────────────────────────────

const tags = { tag: ['@forgotpassword', '@functional', '@otp-lifecycle'], annotation: [{ type: 'feature', description: 'ForgotPassword' }, { type: 'layer', description: 'functional' }] };
const MAX_WRONG_ATTEMPTS = 6;
const OTP_PATTERN = /Use this/i;

async function enterCode(otp: OtpPage, code: string) {
    await otp.fill(code);
    await otp.verify();
}

test.describe('Forgot Password — OTP Lifecycle', tags, () => {
    test.describe.configure({ mode: 'serial' });

    test('an OTP that already completed a reset is refused when replayed', { annotation: [{ type: 'testcase', description: 'FP-E2E-03: A recovery OTP cannot be reused' }] }, async ({ page, otp }) => {
        test.setTimeout(120_000);
        test.skip(!(await gotoOtpModal(page)), 'OTP disabled in this environment');
        const usedCode = await getOtpFromDb(VALID_MOBILE, 10, 2000, OTP_PATTERN);
        await enterCode(otp, usedCode);
        await expect(page).toHaveURL(/login/, { timeout: 15000 });

        // Start a second reset and replay the code that was already consumed.
        test.skip(!(await gotoOtpModal(page)), 'OTP disabled in this environment');
        await enterCode(otp, usedCode);
        await expect(page).not.toHaveURL(/login/, { timeout: 5000 });
        await expect(otp.modalContainer).toBeVisible();
    });

    test('requesting a new code makes the previous code unusable', { annotation: [{ type: 'testcase', description: 'FP-97: Resend invalidates the previous OTP' }] }, async ({ page, otp }) => {
        test.skip(!(await gotoOtpModal(page)), 'OTP disabled in this environment');
        const seconds = (await otp.getRemainingSeconds()) || 90;
        test.setTimeout((seconds + 90) * 1000);

        const firstCode = await getOtpFromDb(VALID_MOBILE, 10, 2000, OTP_PATTERN);
        await expect(otp.resendButton).toBeEnabled({ timeout: (seconds + 5) * 1000 });
        await otp.resendButton.click();
        await expect(otp.inputs.nth(0)).toHaveValue('');
        const secondCode = await getOtpFromDb(VALID_MOBILE, 10, 2000, OTP_PATTERN);

        test.skip(firstCode === secondCode, 'Backend re-sent the same code; nothing to compare');
        await enterCode(otp, firstCode);
        await expect(page).not.toHaveURL(/login/, { timeout: 5000 });
        await expect(otp.modalContainer).toBeVisible();
    });

    test('repeated wrong codes lock recovery: the correct code no longer completes the reset', { annotation: [{ type: 'testcase', description: 'FP-E2E-04: Repeated OTP failures lock recovery' }] }, async ({ page, otp }) => {
        test.setTimeout(180_000);
        test.skip(!(await gotoOtpModal(page)), 'OTP disabled in this environment');
        const correctCode = await getOtpFromDb(VALID_MOBILE, 10, 2000, OTP_PATTERN);

        let attempts = 0;
        while (attempts < MAX_WRONG_ATTEMPTS && await otp.modalContainer.isVisible()) {
            await enterCode(otp, INVALID_OTP);
            attempts++;
            await page.waitForTimeout(1000);
        }
        await test.info().attach('wrong-attempts-before-lock', { body: String(attempts), contentType: 'text/plain' });

        if (await otp.modalContainer.isVisible()) {
            await enterCode(otp, correctCode);
        }
        await expect(page).not.toHaveURL(/login/, { timeout: 5000 });
    });
});
