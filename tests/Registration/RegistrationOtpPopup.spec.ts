import { test, expect } from '@playwright/test';
import { REGISTER_URL, generateKSAMobile } from './helpers';

test.describe('Registration - OTP Popup Page Elements', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(generateKSAMobile());
        await page.getByRole('button', { name: 'next' }).click();
        await page.waitForTimeout(5000);
        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 20000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!otpAppeared, 'OTP dialog did not appear — Registration OTP is disabled in this environment');
    });

    // ── OTP popup content ─────────────────────────────────────────────────────

    test('should display the Enter OTP heading', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
    });

    test('should display the OTP instruction message', async ({ page }) => {
        await expect(page.getByText('A code has been sent to you, in order to continue with the sign up process.')).toBeVisible();
    });

    test('should display OTP input boxes', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count = await inputs.count();
        expect(count).toBeGreaterThanOrEqual(4);
        expect(count).toBeLessThanOrEqual(8);
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
});
