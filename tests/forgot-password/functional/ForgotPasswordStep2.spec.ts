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

// ── Step 2: Password validation logic ─────────────────────────────────────────

test.describe('Forgot Password - Step 2 Password Validation', () => {
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

// ── Step 2: Back navigation ───────────────────────────────────────────────────

test.describe('Forgot Password - Step 2 Back Navigation', () => {
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

// ── Step 2: Interactions (toggles, field input, form submission) ──────────────

test.describe('Forgot Password - Step 2 Interactions', () => {
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

    test('should enable submit when both passwords match', async ({ page }) => {
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
        await page.pause();
        await mockAllPasswordsSuccess(page);
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });
});
