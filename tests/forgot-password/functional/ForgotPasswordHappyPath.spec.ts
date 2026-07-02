import { test, expect } from '@playwright/test';
import { assertToast } from '../../shared';
import {
    SUBMIT_BUTTON,
    VALID_PASSWORD,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    mockAllPasswordsSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../../pageObjectsHelpers/ForgotPasswordHelper';

// ─────────────────────────────────────────────────────────────────────────────
// END-TO-END FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — End-to-End Flow', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
    });

    test('should complete the full forgot-password flow and redirect to the login page', async ({ page }) => {
        await mockAllPasswordsSuccess(page);
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });

    test('should not redirect to login when reset is submitted with mismatched passwords', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('DifferentPass#1');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
        await expect(page).not.toHaveURL(/login/);
    });

    test('should display an error and remain on the page when the reset API fails', async ({ page }) => {
        await page.route('**/auth/passwords/**', route =>
            route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Server error' }) })
        );
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
        await expect(page).not.toHaveURL(/login/, { timeout: 10000 });
        await assertToast(page);
    });
});
