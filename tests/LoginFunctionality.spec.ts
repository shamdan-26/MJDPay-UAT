

import { test, expect } from '@playwright/test';

const URL = 'https://dev.majdpay.com/business/auth/login';
const VALID_COMPANY  = 'L3999';
const VALID_MOBILE   = '500318143';
const VALID_PASSWORD = 'Aa#1234567';

test.describe('Login Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    // â”€â”€ Valid login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should log in successfully with valid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page).not.toHaveURL(URL);
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

});
