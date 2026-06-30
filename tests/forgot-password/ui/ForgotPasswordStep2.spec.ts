import { test, expect } from '@playwright/test';
import {
    SUBMIT_BUTTON,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../../pageObjects/ForgotPasswordHelper';

test.describe('Forgot Password – Step 2 Page', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should display the MJD Pay logo on step 2', async ({ page }) => {
        await expect(page.locator('img[alt="MJD Pay"]')).toBeVisible();
    });

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should display the EN language button on step 2', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toBeVisible();
    });

    test('should display the Arabic language button on step 2', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'العربية' })).toBeVisible();
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    test('should display the theme toggle button on step 2', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
    });

    // ── Heading & subtitle ────────────────────────────────────────────────────

    test('should display the "Forgot Password" heading on step 2', async ({ page }) => {
        await expect(page.getByText('Forgot Password')).toBeVisible();
    });

    test('should display the back button on step 2', async ({ page }) => {
        await expect(page.locator('main button').first()).toBeVisible();
    });

    test('should display the subtitle "Create A New Password, Follow Password Regulation"', async ({ page }) => {
        await expect(page.getByText('Create A New Password, Follow Password Regulation')).toBeVisible();
    });

    // ── New Password field ────────────────────────────────────────────────────

    test('should display the New Password label', async ({ page }) => {
        await expect(page.locator('.floating-field-label.ng-star-inserted', { hasText: 'New Password' })).toBeVisible();
    });

    test('should display the New Password input', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'New Password' })).toBeVisible();
    });

    test('should have New Password field masked by default', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'New Password' })).toHaveAttribute('type', 'password');
    });

    test('should display "Input Password" placeholder in the New Password field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'New Password' })).toHaveAttribute('placeholder', 'Input Password');
    });

    test('should display the show-password eye icon on the New Password field', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Show password' }).first()).toBeVisible();
    });

    // ── Confirm Password field ────────────────────────────────────────────────

    test('should display the Confirm Password label', async ({ page }) => {
        await expect(page.getByText('Confirm Password')).toBeVisible();
    });

    test('should display the Confirm Password input', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible();
    });

    test('should have Confirm Password field masked by default', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Confirm password' })).toHaveAttribute('type', 'password');
    });

    test('should display "Input Password" placeholder in the Confirm Password field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Confirm password' })).toHaveAttribute('placeholder', 'Input Password');
    });

    test('should display the show-password eye icon on the Confirm Password field', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Show password' }).nth(1)).toBeVisible();
    });

    // ── Reset Password button ─────────────────────────────────────────────────

    test('should display the Reset Password button', async ({ page }) => {
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeVisible();
    });

    test('should have Reset Password button disabled when both fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });
});
