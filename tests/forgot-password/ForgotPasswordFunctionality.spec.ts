import { test, expect } from '@playwright/test';
import {
    FORGOT_URL,
    SUBMIT_BUTTON,
    VALID_PASSWORD,
    VALID_OTP,
    INVALID_OTP,
} from './helpers';

const VALID_COMPANY = 'A2316';
const VALID_MOBILE  = '500021788';

// ── Step 1: Credential validation & navigation ────────────────────────────────

test.describe('Forgot Password - Step 1 Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    test('should remain on the forgot-password page after submitting invalid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
    });

    test('should display an error notification after submitting invalid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        const errorIndicator = page.locator('[role="alert"], [class*="error"], [class*="toast"], [class*="notification"]').first();
        await expect(errorIndicator).toBeVisible({ timeout: 10000 });
    });

    test('should keep Company number field value after failed submission', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await expect(page.getByRole('textbox', { name: 'Company number' })).toHaveValue('INVALID');
    });

    test('should navigate to change-password URL when step 1 is submitted with valid credentials (mocked)', async ({ page }) => {
        await page.route('**/auth/passwords/forget', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(/change-password/, { timeout: 15000 });
    });

    test('should show the New Password field after step 1 succeeds (mocked)', async ({ page }) => {
        await page.route('**/auth/passwords/forget', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page.getByRole('textbox', { name: 'New Password' })).toBeVisible({ timeout: 15000 });
    });

    test('should show the Confirm Password field after step 1 succeeds (mocked)', async ({ page }) => {
        await page.route('**/auth/passwords/forget', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible({ timeout: 15000 });
    });
});

// ── Step 2: Password validation logic ─────────────────────────────────────────

test.describe('Forgot Password - Step 2 Password Validation', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.route('**/auth/passwords/forget', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await page.getByRole('textbox', { name: 'New Password' }).waitFor({ state: 'visible', timeout: 15000 });
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

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.route('**/auth/passwords/forget', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await page.getByRole('textbox', { name: 'New Password' }).waitFor({ state: 'visible', timeout: 15000 });
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
});

// ── OTP Verification: Dialog functionality after step 2 submit ────────────────

test.describe('Forgot Password - OTP Verification Flow', () => {
    test.describe.configure({ mode: 'serial' });

    const MODAL = "//div[@class='my-modal-container']";

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await Promise.all([
            page.waitForResponse(
                resp => resp.url().includes('passwords/forget') && resp.status() === 200,
                { timeout: 15000 }
            ),
            page.getByRole('button', { name: 'Next' }).click(),
        ]);
        await page.getByRole('textbox', { name: 'New Password' }).waitFor({ state: 'visible', timeout: 15000 });
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
        await page.locator(MODAL).waitFor({ state: 'visible', timeout: 15000 });
    });

    test('should display the OTP dialog after submitting new password', async ({ page }) => {
        await expect(page.locator(MODAL)).toBeVisible();
    });

    test('should keep Confirm button disabled when OTP inputs are empty', async ({ page }) => {
        await expect(page.locator(MODAL).getByRole('button', { name: 'Confirm' })).toBeDisabled();
    });

    test('should keep Confirm button disabled when OTP inputs are partially filled', async ({ page }) => {
        const inputs = page.locator(MODAL).locator('input');
        await inputs.nth(0).fill('1');
        await inputs.nth(1).fill('2');
        await expect(page.locator(MODAL).getByRole('button', { name: 'Confirm' })).toBeDisabled();
    });

    test('should enable Confirm button when all 4 OTP inputs are filled', async ({ page }) => {
        const inputs = page.locator(MODAL).locator('input');
        await inputs.nth(0).fill('1');
        await inputs.nth(1).fill('2');
        await inputs.nth(2).fill('3');
        await inputs.nth(3).fill('4');
        await expect(page.locator(MODAL).getByRole('button', { name: 'Confirm' })).toBeEnabled();
    });

    test('should not accept non-numeric characters in OTP inputs', async ({ page }) => {
        const input = page.locator(MODAL).locator('input').first();
        await input.pressSequentially('a');
        await expect(input).toHaveValue('');
    });

    test('should remain on OTP dialog after submitting wrong OTP', async ({ page }) => {
        const inputs = page.locator(MODAL).locator('input');
        for (let i = 0; i < 4; i++) await inputs.nth(i).fill(INVALID_OTP[i]);
        await page.locator(MODAL).getByRole('button', { name: 'Confirm' }).click();
        await expect(page.locator(MODAL)).toBeVisible();
    });

    test('should reset password successfully with correct OTP and redirect to login', async ({ page }) => {
        const inputs = page.locator(MODAL).locator('input');
        for (let i = 0; i < 4; i++) await inputs.nth(i).fill(VALID_OTP[i]);
        await page.locator(MODAL).getByRole('button', { name: 'Confirm' }).click();
        await expect(page).toHaveURL(/login/, { timeout: 15000 });
    });

    test('should keep resend button disabled while countdown timer is active', async ({ page }) => {
        await expect(page.locator(MODAL).getByRole('button', { name: 'Click to resend' })).toBeDisabled();
        await expect(page.locator(MODAL).getByText(/Code Ends/)).toBeVisible();
    });

    test('should enable resend button after countdown expires and clear inputs on click', async ({ page }) => {
        test.setTimeout(90000);

        const inputs = page.locator(MODAL).locator('input');
        for (let i = 0; i < 4; i++) await inputs.nth(i).fill(String(i + 1));

        const resendBtn = page.locator(MODAL).getByRole('button', { name: 'Click to resend' });
        await expect(resendBtn).toBeEnabled({ timeout: 60000 });
        await resendBtn.click();
        await expect(inputs.nth(0)).toHaveValue('');
    });

    test('should close the OTP dialog when Cancel is clicked', async ({ page }) => {
        await page.locator(MODAL).getByRole('button', { name: 'Cancel' }).click();
        await expect(page.locator(MODAL)).not.toBeVisible({ timeout: 5000 });
    });

    test('should return to the change-password page after cancelling the OTP dialog', async ({ page }) => {
        await page.locator(MODAL).getByRole('button', { name: 'Cancel' }).click();
        await expect(page).toHaveURL(/change-password/, { timeout: 5000 });
    });

    test('should allow re-submitting the form after cancelling the OTP dialog', async ({ page }) => {
        await page.locator(MODAL).getByRole('button', { name: 'Cancel' }).click();
        await expect(page.locator(MODAL)).not.toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeVisible();
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeEnabled();
    });
});

// ── End-to-End: Complete password reset flow ──────────────────────────────────

test.describe('Forgot Password - End-to-End Flow', () => {
    test.describe.configure({ mode: 'serial' });

    test('should complete the full forgot-password flow and redirect to the login page', async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.route('**/auth/passwords/**', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await page.getByRole('textbox', { name: 'New Password' }).waitFor({ state: 'visible', timeout: 15000 });
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });

    test('should not redirect to login when reset is submitted with mismatched passwords', async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.route('**/auth/passwords/forget', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await page.getByRole('textbox', { name: 'New Password' }).waitFor({ state: 'visible', timeout: 15000 });
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('DifferentPass#1');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
        await expect(page).not.toHaveURL(/login/);
    });
});
