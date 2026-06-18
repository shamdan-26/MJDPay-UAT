import { test, expect } from '@playwright/test';
import { REGISTER_URL, generateKSAMobile, fillOTP } from './helpers';

test.describe('Registration - OTP Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(generateKSAMobile());
        await page.getByRole('button', { name: 'next' }).click();

        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 20000 })
            .then(() => true)
            .catch(() => false);

        if (!otpAppeared) {
            const errorEl = page.locator('[class*="error"], [class*="alert"], [role="alert"]').first();
            const errorVisible = await errorEl.isVisible().catch(() => false);
            if (errorVisible) {
                const errorText = await errorEl.textContent().catch(() => '');
                throw new Error(`Phone submission failed with error: "${errorText?.trim()}"`);
            }
            test.skip(true, 'OTP dialog did not appear — Registration OTP is disabled in this environment');
        }
    });

    // ── Verify button state ───────────────────────────────────────────────────

    test('should have Verify button disabled when OTP inputs are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
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

    test('should enable Verify button when all OTP inputs are filled', async ({ page }) => {
        await fillOTP(page);
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
        const count  = await inputs.count();
        for (let i = 0; i < count; i++) {
            await inputs.nth(i).click();
            await inputs.nth(i).pressSequentially('0');
        }

        const resendBtn = page.getByRole('button', { name: 'Click to resend' });
        await expect(resendBtn).toBeEnabled({ timeout: 60000 });
        await resendBtn.click();
        await expect(inputs.nth(0)).toHaveValue('');
    });

    // ── OTP submission ────────────────────────────────────────────────────────

    test('should remain on OTP popup after submitting wrong OTP', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count  = await inputs.count();
        for (let i = 0; i < count; i++) {
            await inputs.nth(i).click();
            await inputs.nth(i).pressSequentially('1');
        }
        await page.getByRole('button', { name: 'Verify' }).click();
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
    });

    // ── Cancel ────────────────────────────────────────────────────────────────

    test('should close the OTP popup when Cancel is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
    });

    test('should return to the mobile number page when Cancel is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByText('Enter Phone Number')).toBeVisible({ timeout: 10000 });
    });
});
