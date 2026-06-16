import { test, expect } from '@playwright/test';
import { REGISTER_URL, generateKSAMobile, fillOTP } from './helpers';

test.describe('Registration – OTP Popup', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(generateKSAMobile());
        await page.getByRole('button', { name: 'next' }).click();
        await page.waitForTimeout(5000);
        await page.getByRole('heading', { name: 'Enter OTP' }).waitFor({ state: 'visible', timeout: 20000 });
    });

    // ── OTP popup content ─────────────────────────────────────────────────────

    test('should display the Enter OTP heading', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
    });

    test('should display the OTP instruction message', async ({ page }) => {
        await expect(page.getByText('A code has been sent to you, in order to continue with the sign up process.')).toBeVisible();
    });

    test('should display the countdown timer', async ({ page }) => {
        await expect(page.getByText(/Code ends/)).toBeVisible();
    });

    // ── Buttons ───────────────────────────────────────────────────────────────

    test('should display the Cancel button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('should display the Verify button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible();
    });

    test('should display the Click to resend button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Click to resend' })).toBeVisible();
    });

    test('should have Verify button disabled when OTP inputs are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
    });

    test('should have Click to resend button disabled initially', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Click to resend' })).toBeDisabled();
    });

    // ── OTP input behaviour ───────────────────────────────────────────────────

    test('should enable Verify button when all OTP inputs are filled', async ({ page }) => {
        await fillOTP(page);
        await expect(page.getByRole('button', { name: 'Verify' })).toBeEnabled();
    });

    test('should keep Verify disabled when fewer than all OTP digits are entered', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count  = await inputs.count();
        for (let i = 0; i < count - 1; i++) {
            await inputs.nth(i).click();
            await inputs.nth(i).pressSequentially('0');
        }
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
    });

    // ── Cancel ────────────────────────────────────────────────────────────────

    test('should return to the mobile number page when Cancel is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByText('Enter Phone Number')).toBeVisible({ timeout: 10000 });
    });
});
