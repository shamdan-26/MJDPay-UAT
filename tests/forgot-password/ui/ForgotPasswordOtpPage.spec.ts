import { test, expect } from '@playwright/test';
import {
    MODAL_SELECTOR,
    VALID_PASSWORD,
    gotoForgotPassword,
} from '../../pageObjects/ForgotPasswordHelper';

const COMPANY = 'A2316';
const MOBILE  = '500021788';

test.describe('Forgot Password OTP Popup — UI', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await gotoForgotPassword(page);

        await page.pause();
        const companyInput = page.getByPlaceholder('Input here').first();
        await companyInput.click();
        await companyInput.fill(COMPANY);

        const mobileInput = page.locator('input[placeholder="Input here"]').nth(1);
        await mobileInput.click();
        await mobileInput.pressSequentially(MOBILE, { delay: 50 });

        await page.getByRole('button', { name: 'Next' }).click();
        await page.waitForURL(/change-password/, { timeout: 15000 });

        await page.locator('input[type="password"]').nth(0).fill(VALID_PASSWORD);
        await page.locator('input[type="password"]').nth(1).fill(VALID_PASSWORD);
        await page.locator('#btn_change_password').click();
        await page.locator(MODAL_SELECTOR).waitFor({ state: 'visible', timeout: 15000 });
    });

    // ── Modal container ───────────────────────────────────────────────────────

    test('should display the OTP modal dialog', async ({ page }) => {
        await expect(page.locator(MODAL_SELECTOR)).toBeVisible();
    });

    // ── Heading ───────────────────────────────────────────────────────────────

    test('should display the "Enter OTP" heading', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByRole('heading', { name: 'Enter OTP' })
        ).toBeVisible();
    });

    // ── Description text ──────────────────────────────────────────────────────

    test('should display the instruction text', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByText(/A Code Has Been Sent To You/i)
        ).toBeVisible();
    });

    test('should mention the Change Password Process in the instruction text', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByText(/Change Password Process/i)
        ).toBeVisible();
    });

    // ── Close button ──────────────────────────────────────────────────────────

    test('should display the close (×) button', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByRole('button', { name: /close/i })
        ).toBeVisible();
    });

    test('should have the close button enabled', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByRole('button', { name: /close/i })
        ).toBeEnabled();
    });

    // ── OTP inputs ────────────────────────────────────────────────────────────

    test('should display 6 OTP digit input boxes', async ({ page }) => {
        await expect(page.locator(MODAL_SELECTOR).locator('input')).toHaveCount(6);
    });

    test('should show all OTP inputs visible', async ({ page }) => {
        const inputs = page.locator(MODAL_SELECTOR).locator('input');
        const count = await inputs.count();
        for (let i = 0; i < count; i++) {
            await expect(inputs.nth(i)).toBeVisible();
        }
    });

    test('should show all OTP inputs empty by default', async ({ page }) => {
        const inputs = page.locator(MODAL_SELECTOR).locator('input');
        const count = await inputs.count();
        for (let i = 0; i < count; i++) {
            await expect(inputs.nth(i)).toHaveValue('');
        }
    });

    test('should focus the first OTP input when the dialog opens', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).locator('input').first()
        ).toBeFocused({ timeout: 3000 });
    });

    // ── Countdown timer ───────────────────────────────────────────────────────

    test('should display the countdown timer', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByText(/Code Ends/i)
        ).toBeVisible();
    });

    test('should show the timer value in MM:SS format', async ({ page }) => {
        const timerText = await page.locator(MODAL_SELECTOR).getByText(/Code Ends/i).textContent();
        expect(timerText).toMatch(/\d{2}:\d{2}/);
    });

    // ── Resend ────────────────────────────────────────────────────────────────

    test('should display the "Didn\'t Receive Code?" label', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByText(/Didn't Receive Code\?/i)
        ).toBeVisible();
    });

    test('should display the "Click to resend" button', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Click to resend' })
        ).toBeVisible();
    });

    test('should have "Click to resend" disabled while the countdown is active', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Click to resend' })
        ).toBeDisabled();
    });

    // ── Cancel button ─────────────────────────────────────────────────────────

    test('should display the Cancel button', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Cancel' })
        ).toBeVisible();
    });

    test('should have the Cancel button enabled', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Cancel' })
        ).toBeEnabled();
    });

    // ── Confirm button ────────────────────────────────────────────────────────

    test('should display the Confirm button', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Confirm' })
        ).toBeVisible();
    });

    test('should have the Confirm button disabled when OTP inputs are empty', async ({ page }) => {
        await expect(
            page.locator(MODAL_SELECTOR).getByRole('button', { name: 'Confirm' })
        ).toBeDisabled();
    });
});
