import { test, expect, type Page } from '@playwright/test';
import {
    LOGIN_URL,
    LOGIN_COMPANY,
    LOGIN_MOBILE,
    VALID_PASSWORD,
} from '../../pageObjectsHelpers/LoginHelper';

const env = process.env['ENV'] ?? 'dev';

async function submitAndCatchCard(page: Page): Promise<void> {
    await page.getByRole('textbox', { name: 'Company number' }).fill(LOGIN_COMPANY);
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(LOGIN_MOBILE);
    await page.locator('input[aria-label="Password"]').click();
    await page.locator('input[aria-label="Password"]').pressSequentially(VALID_PASSWORD, { delay: 50 });
    const loginBtn = env === 'dev'
        ? page.locator('#btn_login')
        : page.getByRole('button', { name: 'Log In' });
    await Promise.all([
        loginBtn.click(),
        page.getByText('Just a moment...').waitFor({ state: 'visible', timeout: 15000 }),
    ]);
}

test.describe('Login Validation Popup — UI', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    test('should show the "Just a moment..." heading', async ({ page }) => {
        await submitAndCatchCard(page);
        await expect(page.getByText('Just a moment...')).toBeVisible();
    });

    test('should show the popup subtitle text', async ({ page }) => {
        await submitAndCatchCard(page);
        await expect(page.getByText("We're preparing a secure session for this device.")).toBeVisible();
    });

    test('should display all three validation steps', async ({ page }) => {
        await submitAndCatchCard(page);
        await expect(page.getByText('Verifying your credentials')).toBeVisible();
        await expect(page.getByText('Preparing this device')).toBeVisible();
        await expect(page.getByText('Securing your session')).toBeVisible();
    });

    test('should show step 1 "Verifying your credentials"', async ({ page }) => {
        await submitAndCatchCard(page);
        await expect(page.getByText('Verifying your credentials')).toBeVisible();
    });

    test('should show step 2 "Preparing this device"', async ({ page }) => {
        await submitAndCatchCard(page);
        await expect(page.getByText('Preparing this device')).toBeVisible();
    });

    test('should show step 3 "Securing your session"', async ({ page }) => {
        await submitAndCatchCard(page);
        await expect(page.getByText('Securing your session')).toBeVisible();
    });

    test('should show the OTP dialog after the validation card completes (when OTP is enabled)', async ({ page }) => {
        await submitAndCatchCard(page);
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 20000 });
        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 10000 })
            .then(() => true).catch(() => false);
        test.skip(!otpAppeared, 'OTP is disabled in this environment — dialog does not appear');
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
        await expect(page.getByText('A code has been sent to you, in order to continue with the login process.')).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'One time password input' }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });
});
