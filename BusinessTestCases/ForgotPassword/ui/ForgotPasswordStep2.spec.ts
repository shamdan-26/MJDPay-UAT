import { test, expect } from '../../fixtures';
import {
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../ForgotPasswordHelper';
import { ForgotPasswordPage } from '../../pageElements/ForgotPassword/ForgotPasswordPage';

test.describe('Forgot Password – Step 2 Page', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page, forgotPassword: fp }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
        forgotPassword = fp;
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should display the MJD Pay logo on step 2', async () => {
        await expect(forgotPassword.logoImage).toBeVisible();
    });

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should display the EN language button on step 2', async () => {
        await expect(forgotPassword.enButton).toBeVisible();
    });

    test('should display the Arabic language button on step 2', async () => {
        await expect(forgotPassword.arabicButton).toBeVisible();
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    test('should display the theme toggle button on step 2', async () => {
        await expect(forgotPassword.themeToggle).toBeVisible();
    });

    // ── Heading & subtitle ────────────────────────────────────────────────────

    test('should display the "Forgot Password" heading on step 2', async ({ page }) => {
        await expect(page.getByText('Forgot Password')).toBeVisible();
    });

    test('should display the back button on step 2', async () => {
        await expect(forgotPassword.backButton).toBeVisible();
    });

    test('should display the subtitle "Create A New Password, Follow Password Regulation"', async ({ page }) => {
        await expect(page.getByText('Create A New Password, Follow Password Regulation')).toBeVisible();
    });

    // ── New Password field ────────────────────────────────────────────────────

    test('should display the New Password label', async ({ page }) => {
        await expect(page.locator('.floating-field-label.ng-star-inserted', { hasText: 'New Password' })).toBeVisible();
    });

    test('should display the New Password input', async () => {
        await expect(forgotPassword.newPasswordInput).toBeVisible();
    });

    test('should have New Password field masked by default', async () => {
        await expect(forgotPassword.newPasswordInput).toHaveAttribute('type', 'password');
    });

    test('should display "Input Password" placeholder in the New Password field', async () => {
        await expect(forgotPassword.newPasswordInput).toHaveAttribute('placeholder', 'Input Password');
    });

    test('should display the show-password eye icon on the New Password field', async () => {
        await expect(forgotPassword.showNewPasswordToggle).toBeVisible();
    });

    // ── Confirm Password field ────────────────────────────────────────────────

    test('should display the Confirm Password label', async ({ page }) => {
        await expect(page.getByText('Confirm Password')).toBeVisible();
    });

    test('should display the Confirm Password input', async () => {
        await expect(forgotPassword.confirmPasswordInput).toBeVisible();
    });

    test('should have Confirm Password field masked by default', async () => {
        await expect(forgotPassword.confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    test('should display "Input Password" placeholder in the Confirm Password field', async () => {
        await expect(forgotPassword.confirmPasswordInput).toHaveAttribute('placeholder', 'Input Password');
    });

    test('should display the show-password eye icon on the Confirm Password field', async () => {
        await expect(forgotPassword.showConfirmPasswordToggle).toBeVisible();
    });

    // ── Reset Password button ─────────────────────────────────────────────────

    test('should display the Reset Password button', async () => {
        await expect(forgotPassword.resetPasswordButton).toBeVisible();
    });

    test('should have Reset Password button disabled when both fields are empty', async () => {
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });
});
