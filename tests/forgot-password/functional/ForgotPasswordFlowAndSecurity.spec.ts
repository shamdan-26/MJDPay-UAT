import { test, expect } from '@playwright/test';
import { assertToast } from '../../shared';
import {
    FORGOT_URL,
    SUBMIT_BUTTON,
    VALID_PASSWORD,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    mockAllPasswordsSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../../pageObjectsHelpers/ForgotPasswordHelper';

// ── End-to-End: Complete password reset flow ──────────────────────────────────

test.describe('Forgot Password - End-to-End Flow', () => {
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

// ── Step 2: Edge cases & input boundaries ─────────────────────────────────────

test.describe('Forgot Password - Step 2 Edge Cases', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
    });

    test('should flag passwords with swapped letter case as a mismatch (case-sensitive comparison)', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill('Aa#1234567');
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('aA#1234567');
        await expect(page.getByText('New password and Confirm password are not matched')).toBeVisible();
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should accept a long but otherwise valid password', async ({ page }) => {
        const longPassword = VALID_PASSWORD + 'Xx1#'.repeat(20);
        await page.getByRole('textbox', { name: 'New Password' }).fill(longPassword);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(longPassword);
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeEnabled();
    });

    test('should submit step 2 when Enter is pressed after filling matching valid passwords', async ({ page }) => {
        await mockAllPasswordsSuccess(page);
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        const confirmInput = page.getByRole('textbox', { name: 'Confirm password' });
        await confirmInput.fill(VALID_PASSWORD);
        await confirmInput.press('Enter');
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });

    test('should show a loading spinner on the submit button after the first click to prevent duplicate submissions', async ({ page }) => {
        let requestCount = 0;
        await page.route('**/auth/passwords/**', async route => {
            requestCount++;
            await new Promise(r => setTimeout(r, 2000));
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }).catch(() => {});
        });
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
        await expect(
            page.locator('mat-spinner, .mat-progress-spinner, [class*="spinner"], [class*="loading"]').first()
        ).toBeVisible({ timeout: 3000 });
        await page.waitForURL(/login/, { timeout: 15000 });
        expect(requestCount).toBe(1);
    });
});

// ── Step 2: Security ──────────────────────────────────────────────────────────

test.describe('Forgot Password - Step 2 Security', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
    });

    test('should send the reset-password request as POST with the password only in the request body, not the URL', async ({ page }) => {
        let capturedUrl    = '';
        let capturedMethod = '';
        page.on('request', req => {
            if (req.url().includes('/auth/passwords/')) {
                capturedUrl    = req.url();
                capturedMethod = req.method();
            }
        });
        await mockAllPasswordsSuccess(page);
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
        expect(capturedMethod).toBe('POST');
        expect(capturedUrl).not.toContain(VALID_PASSWORD);
    });

    test('should not execute a script payload entered in the New Password field', async ({ page }) => {
        let dialogTriggered = false;
        page.on('dialog', async dialog => { dialogTriggered = true; await dialog.dismiss(); });
        await page.getByRole('textbox', { name: 'New Password' }).fill('<script>alert(1)</script>');
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('<script>alert(1)</script>');
        expect(dialogTriggered).toBe(false);
    });
});
