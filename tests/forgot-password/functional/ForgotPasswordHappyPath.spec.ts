import { test, expect } from '@playwright/test';
import { assertToast } from '../../shared';
import {
    VALID_PASSWORD,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    mockAllPasswordsSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../ForgotPasswordHelper';
import { ForgotPasswordPage } from '../../pageElements/ForgotPasswordPage';

// ─────────────────────────────────────────────────────────────────────────────
// END-TO-END FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — End-to-End Flow', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
        forgotPassword = new ForgotPasswordPage(page);
    });

    test('should complete the full forgot-password flow and redirect to the login page', async ({ page }) => {
        await mockAllPasswordsSuccess(page);
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await forgotPassword.resetPasswordButton.click();
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });

    test('should not redirect to login when reset is submitted with mismatched passwords', async ({ page }) => {
        await forgotPassword.fillStep2(VALID_PASSWORD, 'DifferentPass#1');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
        await expect(page).not.toHaveURL(/login/);
    });

    test('should display an error and remain on the page when the reset API fails', async ({ page }) => {
        await page.route('**/auth/passwords/**', route =>
            route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Server error' }) })
        );
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await forgotPassword.resetPasswordButton.click();
        await expect(page).not.toHaveURL(/login/, { timeout: 10000 });
        await assertToast(page);
    });
});
