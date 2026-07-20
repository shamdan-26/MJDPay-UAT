import { test, expect } from '../../fixtures';
import {
    SUBMIT_BUTTON,
    VALID_PASSWORD,
    VALID_COMPANY,
    VALID_MOBILE,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    mockAllPasswordsSuccess,
    mockPasswordResetFailure,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../ForgotPasswordHelper';
import { ForgotPasswordPage } from '../../pageElements/ForgotPassword/ForgotPasswordPage';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: PASSWORD VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 2: Password Validation', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page, forgotPassword: fp }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
        forgotPassword = fp;
    });

    test('should display password requirements heading when typing in the New Password field', async ({ page }) => {
        await forgotPassword.newPasswordInput.fill('a');
        await expect(page.getByText('Your password must contain:')).toBeVisible({ timeout: 5000 });
    });

    test('should display all six password requirement items', async ({ page }) => {
        await forgotPassword.newPasswordInput.fill('a');
        await expect(page.getByText('At least 8 characters')).toBeVisible();
        await expect(page.getByText('Should contain lowercase')).toBeVisible();
        await expect(page.getByText('Should contain uppercase')).toBeVisible();
        await expect(page.getByText('Should contain numbers')).toBeVisible();
        await expect(page.getByText('Should contain special characters')).toBeVisible();
        await expect(page.getByText('Should not contain spaces')).toBeVisible();
    });

    test('should display a mismatch error when New Password and Confirm Password differ', async ({ page }) => {
        await forgotPassword.fillStep2(VALID_PASSWORD, 'DifferentPass#1');
        await expect(page.getByText('New password and Confirm password are not matched')).toBeVisible();
    });

    test('should keep submit disabled when password has no uppercase letter', async () => {
        await forgotPassword.fillStep2('aa#1234567', 'aa#1234567');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('should keep submit disabled when password has no lowercase letter', async () => {
        await forgotPassword.fillStep2('AA#1234567', 'AA#1234567');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('should keep submit disabled when password has no number', async () => {
        await forgotPassword.fillStep2('Aa#abcdefg', 'Aa#abcdefg');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('should keep submit disabled when password has no special character', async () => {
        await forgotPassword.fillStep2('Aa12345678', 'Aa12345678');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('should keep submit disabled when password is too short (under 8 characters)', async () => {
        await forgotPassword.fillStep2('Aa#123', 'Aa#123');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('should keep submit disabled when password contains spaces', async () => {
        await forgotPassword.fillStep2('Aa#1234 67', 'Aa#1234 67');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('should keep submit disabled when passwords do not match', async () => {
        await forgotPassword.fillStep2(VALID_PASSWORD, 'DifferentPass#1');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('should enable submit after correcting a mismatched confirm password', async () => {
        await forgotPassword.fillStep2(VALID_PASSWORD, 'WrongPass#1');
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
        await forgotPassword.confirmPasswordInput.clear();
        await forgotPassword.confirmPasswordInput.fill(VALID_PASSWORD);
        await expect(forgotPassword.resetPasswordButton).toBeEnabled();
    });

    test('should keep submit disabled after clearing the Confirm Password field', async () => {
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await expect(forgotPassword.resetPasswordButton).toBeEnabled();
        await forgotPassword.confirmPasswordInput.clear();
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('should keep submit disabled after clearing the New Password field', async () => {
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await expect(forgotPassword.resetPasswordButton).toBeEnabled();
        await forgotPassword.newPasswordInput.clear();
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: BACK NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 2: Back Navigation', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page, forgotPassword: fp }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
        forgotPassword = fp;
    });

    test('should navigate back to step 1 when the back button is clicked from step 2', async () => {
        await forgotPassword.backButton.click();
        await expect(forgotPassword.companyInput).toBeVisible({ timeout: 10000 });
        await expect(forgotPassword.mobileInput).toBeVisible({ timeout: 10000 });
    });

    test('should hide the New Password field after navigating back to step 1', async () => {
        await forgotPassword.backButton.click();
        await expect(forgotPassword.newPasswordInput).not.toBeVisible({ timeout: 10000 });
    });

    test('should show the Next button again after navigating back to step 1', async () => {
        await forgotPassword.backButton.click();
        await expect(forgotPassword.nextButton).toBeVisible({ timeout: 10000 });
    });

    test.skip('should preserve Company and Mobile number values when navigating back to step 1', async () => {
        await forgotPassword.backButton.click();
        await expect(forgotPassword.companyInput).toHaveValue(VALID_COMPANY, { timeout: 10000 });
        await expect(forgotPassword.mobileInput).toHaveValue(VALID_MOBILE, { timeout: 10000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: INTERACTIONS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 2: Interactions', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page, forgotPassword: fp }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
        forgotPassword = fp;
    });

    test('should reveal New Password when show toggle is clicked', async () => {
        await forgotPassword.newPasswordInput.fill(VALID_PASSWORD);
        await forgotPassword.showNewPasswordToggle.click();
        await expect(forgotPassword.newPasswordInput).toHaveAttribute('type', 'text');
    });

    test('should re-mask New Password when hide toggle is clicked after revealing', async ({ page }) => {
        await forgotPassword.newPasswordInput.fill(VALID_PASSWORD);
        await forgotPassword.showNewPasswordToggle.click();
        await expect(forgotPassword.newPasswordInput).toHaveAttribute('type', 'text');
        await page.getByRole('button', { name: 'Hide password' }).first().click();
        await expect(forgotPassword.newPasswordInput).toHaveAttribute('type', 'password');
    });

    test('should reveal Confirm Password when show toggle is clicked', async () => {
        await forgotPassword.confirmPasswordInput.fill(VALID_PASSWORD);
        await forgotPassword.showConfirmPasswordToggle.click();
        await expect(forgotPassword.confirmPasswordInput).toHaveAttribute('type', 'text');
    });

    test('should re-mask Confirm Password when hide toggle is clicked after revealing', async ({ page }) => {
        await forgotPassword.confirmPasswordInput.fill(VALID_PASSWORD);
        await forgotPassword.showConfirmPasswordToggle.click();
        await expect(forgotPassword.confirmPasswordInput).toHaveAttribute('type', 'text');
        const hideBtn = page.getByRole('button', { name: 'Hide password' }).first();
        await hideBtn.waitFor({ state: 'visible', timeout: 5000 });
        await hideBtn.click();
        await expect(forgotPassword.confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    test('should keep submit disabled when only New Password is filled', async () => {
        await forgotPassword.newPasswordInput.fill(VALID_PASSWORD);
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('should keep submit disabled when only Confirm Password is filled', async () => {
        await forgotPassword.confirmPasswordInput.fill(VALID_PASSWORD);
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('should enable submit when both passwords match and meet requirements', async () => {
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await expect(forgotPassword.resetPasswordButton).toBeEnabled();
    });

    test('should accept input in the New Password field', async () => {
        await forgotPassword.newPasswordInput.fill(VALID_PASSWORD);
        await expect(forgotPassword.newPasswordInput).toHaveValue(VALID_PASSWORD);
    });

    test('should accept input in the Confirm Password field', async () => {
        await forgotPassword.confirmPasswordInput.fill(VALID_PASSWORD);
        await expect(forgotPassword.confirmPasswordInput).toHaveValue(VALID_PASSWORD);
    });

    // Full happy-path submission (mocked success → redirected to login) is
    // owned by functional/ForgotPasswordHappyPath.spec.ts.
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 2: Edge Cases', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page, forgotPassword: fp }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
        forgotPassword = fp;
    });

    test('should flag passwords with swapped letter case as a mismatch (case-sensitive comparison)', async ({ page }) => {
        await forgotPassword.fillStep2('Aa#1234567', 'aA#1234567');
        await expect(page.getByText('New password and Confirm password are not matched')).toBeVisible();
        await expect(forgotPassword.resetPasswordButton).toBeDisabled();
    });

    test('should accept a long but otherwise valid password', async () => {
        const longPassword = VALID_PASSWORD + 'Xx1#'.repeat(20);
        await forgotPassword.fillStep2(longPassword, longPassword);
        await expect(forgotPassword.resetPasswordButton).toBeEnabled();
    });

    test('should submit step 2 when Enter is pressed after filling matching valid passwords', async ({ page }) => {
        await mockAllPasswordsSuccess(page);
        await forgotPassword.newPasswordInput.fill(VALID_PASSWORD);
        await forgotPassword.confirmPasswordInput.fill(VALID_PASSWORD);
        await forgotPassword.confirmPasswordInput.press('Enter');
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });

    test('should show a loading spinner on the submit button and prevent duplicate submissions', async ({ page }) => {
        let requestCount = 0;
        await page.route('**/auth/passwords/**', async route => {
            requestCount++;
            await new Promise(r => setTimeout(r, 2000));
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }).catch(() => {});
        });
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await forgotPassword.resetPasswordButton.click();
        await expect(
            page.locator('mat-spinner, .mat-progress-spinner, [class*="spinner"], [class*="loading"]').first()
        ).toBeVisible({ timeout: 3000 });
        await page.waitForURL(/login/, { timeout: 15000 });
        expect(requestCount).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: FAILED SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────
//
// Every other Step 2 spec mocks the reset-password call as a success — this
// block is the only place that exercises the reset submission itself failing
// (e.g. expired session, backend rejection), distinct from Step 1's identity
// check failing.

test.describe('Forgot Password — Step 2: Failed Submission', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page, forgotPassword: fp }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
        await mockPasswordResetFailure(page);
        forgotPassword = fp;
    });

    test('should remain on the change-password page after a failed reset submission', async ({ page }) => {
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await forgotPassword.resetPasswordButton.click();
        await expect(page).toHaveURL(/change-password/);
        await expect(page).not.toHaveURL(/login/);
    });

    test('should keep the New Password and Confirm Password fields visible after a failed submission', async ({ page }) => {
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await forgotPassword.resetPasswordButton.click();
        await expect(forgotPassword.newPasswordInput).toBeVisible();
        await expect(forgotPassword.confirmPasswordInput).toBeVisible();
    });

    test('should re-enable the submit button after a failed submission so the user can retry', async ({ page }) => {
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await forgotPassword.resetPasswordButton.click();
        await expect(forgotPassword.resetPasswordButton).toBeEnabled({ timeout: 10000 });
    });

    test('should not expose technical details (stack trace, SQL, DB errors) in the failure toast', async ({ page }) => {
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await forgotPassword.resetPasswordButton.click();
        const detail = page.locator('.toast-snackbar__detail');
        await expect(detail).toBeVisible({ timeout: 10000 });
        const text = await detail.textContent() ?? '';
        expect(text).not.toMatch(/stack|exception|sql|database|null pointer|traceback|internal server error/i);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: SECURITY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 2: Security', () => {
    test.describe.configure({ mode: 'serial' });

    let forgotPassword: ForgotPasswordPage;

    test.beforeEach(async ({ page, forgotPassword: fp }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
        forgotPassword = fp;
    });

    test('should send the reset-password request as POST with the password only in the body, not the URL', async ({ page }) => {
        let capturedUrl    = '';
        let capturedMethod = '';
        page.on('request', req => {
            if (req.url().includes('/auth/passwords/')) {
                capturedUrl    = req.url();
                capturedMethod = req.method();
            }
        });
        await mockAllPasswordsSuccess(page);
        await forgotPassword.fillStep2(VALID_PASSWORD, VALID_PASSWORD);
        await forgotPassword.resetPasswordButton.click();
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
        expect(capturedMethod).toBe('POST');
        expect(capturedUrl).not.toContain(VALID_PASSWORD);
    });

    test('should not execute a script payload entered in the New Password field', async ({ page }) => {
        let dialogTriggered = false;
        page.on('dialog', async dialog => { dialogTriggered = true; await dialog.dismiss(); });
        await forgotPassword.fillStep2('<script>alert(1)</script>', '<script>alert(1)</script>');
        expect(dialogTriggered).toBe(false);
    });
});
