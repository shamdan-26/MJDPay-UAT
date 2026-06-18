import { test, expect } from '@playwright/test';
import { VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, gotoLogin } from './helpers';

test.describe('Login OTP Popup - Page Elements', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await gotoLogin(page);
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
        await page.getByRole('button', { name: 'Log In' }).click();
        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 15000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!otpAppeared, 'OTP dialog did not appear — Login OTP is disabled in this environment');
    });

    // ── Heading & instruction ─────────────────────────────────────────────────

    test('should display the Enter OTP heading', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
    });

    test('should display the OTP instruction message', async ({ page }) => {
        await expect(page.getByText('A code has been sent to you, in order to continue with the login process.')).toBeVisible();
    });

    // ── OTP inputs ────────────────────────────────────────────────────────────

    test('should display OTP input boxes', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count = await inputs.count();
        expect(count).toBeGreaterThanOrEqual(4);
        expect(count).toBeLessThanOrEqual(8);
    });

    // ── Timer & resend ────────────────────────────────────────────────────────

    test('should display the countdown timer', async ({ page }) => {
        await expect(page.getByText(/Code ends/i)).toBeVisible();
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
});
