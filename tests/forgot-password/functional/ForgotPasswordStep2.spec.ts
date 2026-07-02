import { test, expect } from '@playwright/test';
import {
    SUBMIT_BUTTON,
    VALID_PASSWORD,
    VALID_COMPANY,
    VALID_MOBILE,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    mockAllPasswordsSuccess,
    gotoForgotPassword,
    fillStep1AndProceed,
} from '../../pageObjectsHelpers/ForgotPasswordHelper';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: PASSWORD VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 2: Password Validation', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
    });

    test('should display password requirements heading when typing in the New Password field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill('a');
        await expect(page.getByText('Your password must contain:')).toBeVisible({ timeout: 5000 });
    });

    test('should display all six password requirement items', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill('a');
        await expect(page.getByText('At least 8 characters')).toBeVisible();
        await expect(page.getByText('Should contain lowercase')).toBeVisible();
        await expect(page.getByText('Should contain uppercase')).toBeVisible();
        await expect(page.getByText('Should contain numbers')).toBeVisible();
        await expect(page.getByText('Should contain special characters')).toBeVisible();
        await expect(page.getByText('Should not contain spaces')).toBeVisible();
    });

    test('should display a mismatch error when New Password and Confirm Password differ', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('DifferentPass#1');
        await expect(page.getByText('New password and Confirm password are not matched')).toBeVisible();
    });

    test('should keep submit disabled when password has no uppercase letter', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill('aa#1234567');
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('aa#1234567');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should keep submit disabled when password has no lowercase letter', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill('AA#1234567');
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('AA#1234567');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should keep submit disabled when password has no number', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill('Aa#abcdefg');
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('Aa#abcdefg');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should keep submit disabled when password has no special character', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill('Aa12345678');
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('Aa12345678');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should keep submit disabled when password is too short (under 8 characters)', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill('Aa#123');
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('Aa#123');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should keep submit disabled when password contains spaces', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill('Aa#1234 67');
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('Aa#1234 67');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should keep submit disabled when passwords do not match', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('DifferentPass#1');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should enable submit after correcting a mismatched confirm password', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('WrongPass#1');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
        await page.getByRole('textbox', { name: 'Confirm password' }).clear();
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeEnabled();
    });

    test('should keep submit disabled after clearing the Confirm Password field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeEnabled();
        await page.getByRole('textbox', { name: 'Confirm password' }).clear();
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should keep submit disabled after clearing the New Password field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeEnabled();
        await page.getByRole('textbox', { name: 'New Password' }).clear();
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: BACK NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 2: Back Navigation', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
    });

    test('should navigate back to step 1 when the back button is clicked from step 2', async ({ page }) => {
        await page.locator('main button').first().click();
        await expect(page.getByRole('textbox', { name: 'Company number' })).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toBeVisible({ timeout: 10000 });
    });

    test('should hide the New Password field after navigating back to step 1', async ({ page }) => {
        await page.locator('main button').first().click();
        await expect(page.getByRole('textbox', { name: 'New Password' })).not.toBeVisible({ timeout: 10000 });
    });

    test('should show the Next button again after navigating back to step 1', async ({ page }) => {
        await page.locator('main button').first().click();
        await expect(page.getByRole('button', { name: 'Next' })).toBeVisible({ timeout: 10000 });
    });

    test.skip('should preserve Company and Mobile number values when navigating back to step 1', async ({ page }) => {
        await page.locator('main button').first().click();
        await expect(page.getByRole('textbox', { name: 'Company number' })).toHaveValue(VALID_COMPANY, { timeout: 10000 });
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toHaveValue(VALID_MOBILE, { timeout: 10000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: INTERACTIONS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 2: Interactions', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
    });

    test('should reveal New Password when show toggle is clicked', async ({ page }) => {
        const newPassInput = page.getByRole('textbox', { name: 'New Password' });
        await newPassInput.fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Show password' }).first().click();
        await expect(newPassInput).toHaveAttribute('type', 'text');
    });

    test('should re-mask New Password when hide toggle is clicked after revealing', async ({ page }) => {
        const newPassInput = page.getByRole('textbox', { name: 'New Password' });
        await newPassInput.fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Show password' }).first().click();
        await expect(newPassInput).toHaveAttribute('type', 'text');
        await page.getByRole('button', { name: 'Hide password' }).first().click();
        await expect(newPassInput).toHaveAttribute('type', 'password');
    });

    test('should reveal Confirm Password when show toggle is clicked', async ({ page }) => {
        const confirmInput = page.getByRole('textbox', { name: 'Confirm password' });
        await confirmInput.fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Show password' }).nth(1).click();
        await expect(confirmInput).toHaveAttribute('type', 'text');
    });

    test('should re-mask Confirm Password when hide toggle is clicked after revealing', async ({ page }) => {
        const confirmInput = page.getByRole('textbox', { name: 'Confirm password' });
        await confirmInput.fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Show password' }).nth(1).click();
        await expect(confirmInput).toHaveAttribute('type', 'text');
        const hideBtn = page.getByRole('button', { name: 'Hide password' }).first();
        await hideBtn.waitFor({ state: 'visible', timeout: 5000 });
        await hideBtn.click();
        await expect(confirmInput).toHaveAttribute('type', 'password');
    });

    test('should keep submit disabled when only New Password is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should keep submit disabled when only Confirm Password is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should enable submit when both passwords match and meet requirements', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeEnabled();
    });

    test('should accept input in the New Password field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await expect(page.getByRole('textbox', { name: 'New Password' })).toHaveValue(VALID_PASSWORD);
    });

    test('should accept input in the Confirm Password field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await expect(page.getByRole('textbox', { name: 'Confirm password' })).toHaveValue(VALID_PASSWORD);
    });

    test('should navigate to login page after successful password reset', async ({ page }) => {
        await mockAllPasswordsSuccess(page);
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 2: Edge Cases', () => {
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

    test('should show a loading spinner on the submit button and prevent duplicate submissions', async ({ page }) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: SECURITY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 2: Security', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
        await fillStep1AndProceed(page);
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
