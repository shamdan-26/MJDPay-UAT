import { test, expect } from '@playwright/test';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD } from './helpers';

test.describe('Verify Login OTP page', () => {
    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Log In' }).click();
        await page.getByRole('heading', { name: 'Enter OTP' }).waitFor({ state: 'visible', timeout: 15000 });
    });

    // ── Heading & instruction ─────────────────────────────────────────────────

    test('should display the Enter OTP heading', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
    });

    test('should display the instruction message', async ({ page }) => {
        await expect(page.getByText('A code has been sent to you, in order to continue with the login process.')).toBeVisible();
    });

    // ── OTP inputs ────────────────────────────────────────────────────────────

    test('should display 4 OTP input boxes', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'One time password input' })).toHaveCount(4);
    });

    // ── Timer & resend ────────────────────────────────────────────────────────

    test('should display the countdown timer', async ({ page }) => {
        await expect(page.getByText(/Code ends/)).toBeVisible();
    });

    test('should display the Click to resend button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Click to resend' })).toBeVisible();
    });

    // ── Action buttons ────────────────────────────────────────────────────────

    test('should display the Cancel button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('should display the Verify button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible();
    });

    test('should display the Verify button as disabled when OTP inputs are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
    });

    test('should display the Click to resend button as disabled initially', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Click to resend' })).toBeDisabled();
    });
});
