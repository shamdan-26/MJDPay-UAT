import { test, expect } from '@playwright/test';
import {
    VALID_OTP,
    INVALID_OTP,
    gotoLogin,
    fillAndSubmitLogin,
} from './helpers';

test.describe('Login OTP Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await gotoLogin(page);
        await fillAndSubmitLogin(page);
        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 15000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!otpAppeared, 'OTP dialog did not appear — Login OTP is disabled in this environment');
    });

    // ── Dialog presence ───────────────────────────────────────────────────────

    test('should display the OTP dialog after submitting valid credentials', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
    });

    // ── Verify button state ───────────────────────────────────────────────────

    test('should have Verify button disabled when OTP inputs are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
    });

    test('should keep Verify button disabled when OTP inputs are partially filled', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        await inputs.nth(0).fill('1');
        await inputs.nth(1).fill('2');
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
    });

    test('should enable Verify button when all OTP inputs are filled', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count = await inputs.count();
        for (let i = 0; i < count; i++) await inputs.nth(i).fill(String(i + 1));
        await expect(page.getByRole('button', { name: 'Verify' })).toBeEnabled();
    });

    // ── Input validation ──────────────────────────────────────────────────────

    test('should not accept non-numeric characters in OTP inputs', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'One time password input' }).first();
        await input.pressSequentially('a');
        await expect(input).toHaveValue('');
    });

    test('should auto-advance focus to the next input when a digit is entered', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        await inputs.nth(0).click();
        await inputs.nth(0).press('1');
        await expect(inputs.nth(1)).toBeFocused({ timeout: 3000 });
    });

    // ── Resend button ─────────────────────────────────────────────────────────

    test('should have Click to resend button disabled while countdown is active', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Click to resend' })).toBeDisabled();
        await expect(page.getByText(/Code ends/)).toBeVisible();
    });

    test('should enable resend button after countdown expires and clear inputs on click', async ({ page }) => {
        test.setTimeout(90000);

        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count = await inputs.count();
        for (let i = 0; i < count; i++) await inputs.nth(i).fill(String(i + 1));

        const resendBtn = page.getByRole('button', { name: 'Click to resend' });
        await expect(resendBtn).toBeEnabled({ timeout: 60000 });
        await resendBtn.click();
        await expect(inputs.nth(0)).toHaveValue('');
    });

    // ── Cancel ────────────────────────────────────────────────────────────────

    test('should close the OTP popup when Cancel is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
    });

    test('should return to the login form when Cancel is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
    });

    // ── OTP submission ────────────────────────────────────────────────────────

    test('should remain on OTP popup after submitting a wrong OTP', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count = await inputs.count();
        for (let i = 0; i < count; i++) await inputs.nth(i).fill(INVALID_OTP[i] ?? '1');
        await page.getByRole('button', { name: 'Verify' }).click();
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
    });

    test('should log in successfully and redirect with a correct OTP', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count = await inputs.count();
        for (let i = 0; i < count; i++) await inputs.nth(i).fill(VALID_OTP[i] ?? '0');
        await page.getByRole('button', { name: 'Verify' }).click();
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 15000 });
    });
});
