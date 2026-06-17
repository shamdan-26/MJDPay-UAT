import { test, expect } from '@playwright/test';
import {
    SUBMIT_BUTTON,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
} from './helpers';

test.describe('Forgot Password – Step 2 Page', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
    });

    // ── Page elements ─────────────────────────────────────────────────────────

    test('should display the New Password field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'New Password' })).toBeVisible();
    });

    test('should display the Confirm Password field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible();
    });

    test('should have New Password field masked by default', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'New Password' })).toHaveAttribute('type', 'password');
    });

    test('should have Confirm Password field masked by default', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Confirm password' })).toHaveAttribute('type', 'password');
    });

    test('should display the submit button', async ({ page }) => {
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeVisible();
    });

    test('should have submit button disabled when both fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });
});
