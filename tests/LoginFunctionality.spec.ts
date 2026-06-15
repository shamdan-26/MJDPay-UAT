

import { test, expect } from '@playwright/test';

const URL = 'https://dev.majdpay.com/business/auth/login';
const VALID_COMPANY  = 'A2316';
const VALID_MOBILE   = '500021788';
const VALID_PASSWORD = 'Aa#1234567';

test.describe('Login Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    // â”€â”€ Valid login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display OTP dialog after submitting valid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible({ timeout: 15000 });
    });

    // â”€â”€ Invalid credentials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should show an error with wrong password', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill('WrongPass@99');
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page).toHaveURL(URL);
    });

    test('should show an error with wrong company number', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID99');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page).toHaveURL(URL);
    });

    test('should show an error with wrong mobile number', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page).toHaveURL(URL);
    });

    test('should show an error with all wrong credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('WRONG123');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.locator('input[aria-label="Password"]').fill('WrongPass@99');
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page).toHaveURL(URL);
    });

    // â”€â”€ Empty fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should keep Log In button disabled when all fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
    });

    test('should keep Log In button disabled when only company number is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
    });

    test('should keep Log In button disabled when only mobile number is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
    });

    test('should keep Log In button disabled when only password is filled', async ({ page }) => {
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
    });

    test('should keep Log In button disabled when company number and mobile are filled but not password', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
    });

    test('should keep Log In button disabled when company number and password are filled but not mobile', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
    });

    test('should keep Log In button disabled when mobile and password are filled but not company number', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
    });

    // â”€â”€ Enable button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should enable Log In button when all fields are filled with valid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: 'Log In' })).toBeEnabled();
    });

    // â”€â”€ Field clearing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should disable Log In button again after clearing a filled field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: 'Log In' })).toBeEnabled();
        await page.getByRole('textbox', { name: 'Company number' }).clear();
        await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
    });

    // â”€â”€ Password visibility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should reveal password when show password toggle is clicked', async ({ page }) => {
        const passwordInput = page.locator('input[aria-label="Password"]');
        await passwordInput.fill(VALID_PASSWORD);
        await expect(passwordInput).toHaveAttribute('type', 'password');
        await page.locator('button.floating-password-toggle').click();
        await expect(passwordInput).toHaveAttribute('type', 'text');
    });

    test('should hide password again when toggle is clicked twice', async ({ page }) => {
        const passwordInput = page.locator('input[aria-label="Password"]');
        await passwordInput.fill(VALID_PASSWORD);
        const toggle = page.locator('button.floating-password-toggle');
        await toggle.click();
        await expect(passwordInput).toHaveAttribute('type', 'text');
        await toggle.click();
        await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    // â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should navigate to Forgot Password page', async ({ page }) => {
        await page.getByText('Forgot Password?').click();
        await expect(page).not.toHaveURL(URL);
    });

    test('should navigate to Sign Up page', async ({ page }) => {
        await page.getByText('Sign Up').click();
        await expect(page).not.toHaveURL(URL);
    });

    // ── OTP functionality ─────────────────────────────────────────────────────

    test.describe('OTP popup functionality', () => {
        const VALID_OTP   = '0000'; // static OTP for dev environment
        const INVALID_OTP = '1111';

        test.beforeEach(async ({ page }) => {
            await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
            await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
            await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
            await page.getByRole('button', { name: 'Log In' }).click();
            await page.getByRole('heading', { name: 'Enter OTP' }).waitFor({ state: 'visible', timeout: 15000 });
        });

        test('should enable Verify button when all 4 OTP inputs are filled', async ({ page }) => {
            const inputs = page.getByRole('textbox', { name: 'One time password input' });
            await inputs.nth(0).fill('1');
            await inputs.nth(1).fill('2');
            await inputs.nth(2).fill('3');
            await inputs.nth(3).fill('4');
            await expect(page.getByRole('button', { name: 'Verify' })).toBeEnabled();
        });

        test('should keep Verify button disabled when OTP inputs are partially filled', async ({ page }) => {
            const inputs = page.getByRole('textbox', { name: 'One time password input' });
            await inputs.nth(0).fill('1');
            await inputs.nth(1).fill('2');
            await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
        });

        test('should not accept non-numeric characters in OTP inputs', async ({ page }) => {
            const input = page.getByRole('textbox', { name: 'One time password input' }).first();
            await input.pressSequentially('a');
            await expect(input).toHaveValue('');
        });

        test('should close OTP popup and return to login page when Cancel is clicked', async ({ page }) => {
            await page.getByRole('button', { name: 'Cancel' }).click();
            await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
            await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
        });

        test('should remain on OTP popup after submitting wrong OTP', async ({ page }) => {
            const inputs = page.getByRole('textbox', { name: 'One time password input' });
            await inputs.nth(0).fill(INVALID_OTP[0]);
            await inputs.nth(1).fill(INVALID_OTP[1]);
            await inputs.nth(2).fill(INVALID_OTP[2]);
            await inputs.nth(3).fill(INVALID_OTP[3]);
            await page.getByRole('button', { name: 'Verify' }).click();
            await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
        });

        test('should log in successfully with correct OTP', async ({ page }) => {
            const inputs = page.getByRole('textbox', { name: 'One time password input' });
            await inputs.nth(0).fill(VALID_OTP[0]);
            await inputs.nth(1).fill(VALID_OTP[1]);
            await inputs.nth(2).fill(VALID_OTP[2]);
            await inputs.nth(3).fill(VALID_OTP[3]);
            await page.getByRole('button', { name: 'Verify' }).click();
            await expect(page).not.toHaveURL(/auth\/login/);
        });

        test('should keep resend button disabled while countdown timer is active', async ({ page }) => {
            await expect(page.getByRole('button', { name: 'Click to resend' })).toBeDisabled();
            await expect(page.getByText(/Code ends/)).toBeVisible();
        });

        test('should enable resend button after countdown expires and clear inputs on click', async ({ page }) => {
            test.setTimeout(90000); // beforeEach (~15 s) + countdown (~30 s) + buffer

            const inputs = page.getByRole('textbox', { name: 'One time password input' });
            await inputs.nth(0).fill('1');
            await inputs.nth(1).fill('2');
            await inputs.nth(2).fill('3');
            await inputs.nth(3).fill('4');

            const resendBtn = page.getByRole('button', { name: 'Click to resend' });
            await expect(resendBtn).toBeEnabled({ timeout: 60000 });
            await resendBtn.click();
            await expect(inputs.nth(0)).toHaveValue('');
        });
    });

});
