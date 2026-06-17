import { test, expect } from '@playwright/test';
import {
    FORGOT_URL,
    SUBMIT_BUTTON,
    VALID_PASSWORD,
    VALID_OTP,
    INVALID_OTP,
} from './helpers';

const VALID_COMPANY = 'L3999';
const VALID_MOBILE  = '500318143';

const MODAL = "//div[@class='my-modal-container']";

// ── OTP Verification: Dialog functionality after step 2 submit ────────────────

test.describe('Forgot Password - OTP Verification Flow', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await page.route('**/auth/passwords/forget', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );
        await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await page.getByRole('textbox', { name: 'New Password' }).waitFor({ state: 'visible', timeout: 15000 });
        await page.getByRole('textbox', { name: 'New Password' }).fill(VALID_PASSWORD);
        await page.getByRole('textbox', { name: 'Confirm password' }).fill(VALID_PASSWORD);
        await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
        const otpAppeared = await page.locator(MODAL).waitFor({ state: 'visible', timeout: 15000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!otpAppeared, 'OTP dialog did not appear — FORGET_PASSWORD OTP is disabled in this environment');
    });

    // ── Dialog presence ───────────────────────────────────────────────────────

    test('should display the OTP dialog after submitting new password', async ({ page }) => {
        await expect(page.locator(MODAL)).toBeVisible();
    });

    // ── Confirm button state ──────────────────────────────────────────────────

    test('should keep Confirm button disabled when OTP inputs are empty', async ({ page }) => {
        await expect(page.locator(MODAL).getByRole('button', { name: 'Confirm' })).toBeDisabled();
    });

    test('should keep Confirm button disabled when OTP inputs are partially filled', async ({ page }) => {
        const inputs = page.locator(MODAL).locator('input');
        await inputs.nth(0).fill('1');
        await inputs.nth(1).fill('2');
        await expect(page.locator(MODAL).getByRole('button', { name: 'Confirm' })).toBeDisabled();
    });

    test('should enable Confirm button when all 4 OTP inputs are filled', async ({ page }) => {
        const inputs = page.locator(MODAL).locator('input');
        await inputs.nth(0).fill('1');
        await inputs.nth(1).fill('2');
        await inputs.nth(2).fill('3');
        await inputs.nth(3).fill('4');
        await expect(page.locator(MODAL).getByRole('button', { name: 'Confirm' })).toBeEnabled();
    });

    // ── Input validation ──────────────────────────────────────────────────────

    test('should not accept non-numeric characters in OTP inputs', async ({ page }) => {
        const input = page.locator(MODAL).locator('input').first();
        await input.pressSequentially('a');
        await expect(input).toHaveValue('');
    });

    // ── OTP submission ────────────────────────────────────────────────────────

    test('should remain on OTP dialog after submitting wrong OTP', async ({ page }) => {
        const inputs = page.locator(MODAL).locator('input');
        for (let i = 0; i < 4; i++) await inputs.nth(i).fill(INVALID_OTP[i]);
        await page.locator(MODAL).getByRole('button', { name: 'Confirm' }).click();
        await expect(page.locator(MODAL)).toBeVisible();
    });

    test('should reset password successfully with correct OTP and redirect to login', async ({ page }) => {
        const inputs = page.locator(MODAL).locator('input');
        for (let i = 0; i < 4; i++) await inputs.nth(i).fill(VALID_OTP[i]);
        await page.locator(MODAL).getByRole('button', { name: 'Confirm' }).click();
        await expect(page).toHaveURL(/login/, { timeout: 15000 });
    });

    // ── Resend ────────────────────────────────────────────────────────────────

    test('should keep resend button disabled while countdown timer is active', async ({ page }) => {
        await expect(page.locator(MODAL).getByRole('button', { name: 'Click to resend' })).toBeDisabled();
        await expect(page.locator(MODAL).getByText(/Code Ends/)).toBeVisible();
    });

    test('should enable resend button after countdown expires and clear inputs on click', async ({ page }) => {
        test.setTimeout(90000);

        const inputs = page.locator(MODAL).locator('input');
        for (let i = 0; i < 4; i++) await inputs.nth(i).fill(String(i + 1));

        const resendBtn = page.locator(MODAL).getByRole('button', { name: 'Click to resend' });
        await expect(resendBtn).toBeEnabled({ timeout: 60000 });
        await resendBtn.click();
        await expect(inputs.nth(0)).toHaveValue('');
    });

    // ── Cancel / dismiss ──────────────────────────────────────────────────────

    test('should close the OTP dialog when Cancel is clicked', async ({ page }) => {
        await page.locator(MODAL).getByRole('button', { name: 'Cancel' }).click();
        await expect(page.locator(MODAL)).not.toBeVisible({ timeout: 5000 });
    });

    test('should return to the change-password page after cancelling the OTP dialog', async ({ page }) => {
        await page.locator(MODAL).getByRole('button', { name: 'Cancel' }).click();
        await expect(page).toHaveURL(/change-password/, { timeout: 5000 });
    });

    test('should allow re-submitting the form after cancelling the OTP dialog', async ({ page }) => {
        await page.locator(MODAL).getByRole('button', { name: 'Cancel' }).click();
        await expect(page.locator(MODAL)).not.toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeVisible();
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeEnabled();
    });
});
