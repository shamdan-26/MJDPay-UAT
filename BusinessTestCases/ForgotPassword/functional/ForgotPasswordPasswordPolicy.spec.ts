import { test, expect } from '../../shared/fixtures.ts';
import {
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../helpers/ForgotPasswordHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — password policy edge cases not covered by functional/ForgotPasswordStep2.spec.ts (all mocked).
// ─────────────────────────────────────────────────────────────────────────────

const tags = { tag: ['@forgotpassword', '@functional', '@password-policy'], annotation: [{ type: 'feature', description: 'ForgotPassword' }, { type: 'layer', description: 'functional' }] };

test.describe('Forgot Password — Password Policy Edge Cases', tags, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
    });

    test('a password of exactly 8 characters meeting every rule is accepted', { annotation: [{ type: 'testcase', description: 'FP-88: Minimum-length boundary (8 chars) is accepted' }] }, async ({ forgotPassword }) => {
        await forgotPassword.fillStep2('Aa#12345', 'Aa#12345');
        await expect(forgotPassword.resetPasswordButton).toBeEnabled();
    });

    test('a password of 7 characters meeting every other rule is rejected', { annotation: [{ type: 'testcase', description: 'FP-89: One below the minimum length stays blocked' }] }, async ({ forgotPassword }) => {
        await forgotPassword.fillStep2('Aa#1234', 'Aa#1234');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('a leading or trailing space makes the password invalid', { annotation: [{ type: 'testcase', description: 'FP-90: Leading/trailing space is not trimmed into validity' }] }, async ({ forgotPassword }) => {
        await forgotPassword.fillStep2(' Aa#12345', ' Aa#12345');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
        await forgotPassword.fillStep2('Aa#12345 ', 'Aa#12345 ');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('Arabic letters alone do not satisfy the upper/lower-case rules', { annotation: [{ type: 'testcase', description: 'FP-91: Arabic-only letters do not meet the case rules' }] }, async ({ forgotPassword }) => {
        await forgotPassword.fillStep2('كلمةالمرور#1', 'كلمةالمرور#1');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('a very long password (256 characters) does not break the page', { annotation: [{ type: 'testcase', description: 'FP-92: Very long password does not crash the form' }] }, async ({ page, forgotPassword }) => {
        const long = `Aa#1${'x'.repeat(251)}`;
        await forgotPassword.fillStep2(long, long);
        await expect(forgotPassword.newPasswordInput).toBeVisible();
        await expect(page.getByText(/internal server error|undefined|NaN/i)).toBeHidden();
    });
});
