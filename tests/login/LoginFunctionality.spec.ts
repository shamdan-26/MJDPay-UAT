import { test, expect } from '@playwright/test';
import {
    LOGIN_URL,
    SESSION_PATH,
    VALID_COMPANY,
    VALID_MOBILE,
    VALID_PASSWORD,
    gotoLogin,
    fillAndSubmitLogin,
} from './helpers';

test.describe('Login Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await gotoLogin(page);
    });

    // ── Valid credentials ─────────────────────────────────────────────────────

    test('should redirect to dashboard with valid credentials when OTP is disabled', async ({ page }) => {
        await fillAndSubmitLogin(page);
        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 8000 })
            .then(() => true)
            .catch(() => false);
        test.skip(otpAppeared, 'OTP is enabled in this environment — redirect without OTP is not applicable');
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 15000 });
    });

    // ── Invalid credentials ───────────────────────────────────────────────────

    test('should stay on login page with a wrong password', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill('WrongPass@99');
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should stay on login page with a wrong company number', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID99');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should stay on login page with a wrong mobile number', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should stay on login page with all wrong credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('WRONG123');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.locator('input[aria-label="Password"]').fill('WrongPass@99');
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should display an error message after submitting wrong credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('WRONG123');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.locator('input[aria-label="Password"]').fill('WrongPass@99');
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(
            page.locator('[role="alert"], [class*="error"], [class*="invalid"], .toast, .notification').first()
        ).toBeVisible({ timeout: 10000 });
    });

    // ── Log In button state ───────────────────────────────────────────────────

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

    test('should enable Log In button when all three fields are filled with valid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: 'Log In' })).toBeEnabled();
    });

    test('should disable Log In button again after clearing a previously filled field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await expect(page.getByRole('button', { name: 'Log In' })).toBeEnabled();
        await page.getByRole('textbox', { name: 'Company number' }).clear();
        await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
    });

    // ── Password visibility ───────────────────────────────────────────────────

    test('should reveal password when show password toggle is clicked', async ({ page }) => {
        const passwordInput = page.locator('input[aria-label="Password"]');
        await passwordInput.fill(VALID_PASSWORD);
        await expect(passwordInput).toHaveAttribute('type', 'password');
        await page.locator('button.floating-password-toggle').click();
        await expect(passwordInput).toHaveAttribute('type', 'text');
    });

    test('should re-mask password when the toggle is clicked a second time', async ({ page }) => {
        const passwordInput = page.locator('input[aria-label="Password"]');
        await passwordInput.fill(VALID_PASSWORD);
        const toggle = page.locator('button.floating-password-toggle');
        await toggle.click();
        await expect(passwordInput).toHaveAttribute('type', 'text');
        await toggle.click();
        await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    // ── Navigation ────────────────────────────────────────────────────────────

    test('should navigate to the Forgot Password page', async ({ page }) => {
        await page.getByText('Forgot Password?').click();
        await expect(page).toHaveURL(/forgot-password/);
    });

    test('should navigate to the Sign Up page', async ({ page }) => {
        await page.getByText('Sign Up').click();
        await expect(page).not.toHaveURL(LOGIN_URL);
    });
});

// ── Already authenticated (uses saved session) ────────────────────────────────

test.describe('Login - Already Authenticated', () => {
    test.use({ storageState: SESSION_PATH });

    test.skip('should redirect away from login page when already logged in', async ({ page }) => {
        await page.pause();
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 10000 });
    });

    test.skip('should not display the Log In button when already logged in', async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(page.getByRole('button', { name: 'Log In' })).not.toBeVisible({ timeout: 10000 });
    });
});
