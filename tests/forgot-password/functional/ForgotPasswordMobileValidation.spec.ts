import { test, expect } from '@playwright/test';
import { VALID_COMPANY, FORGOT_URL, gotoForgotPassword } from '../../pageObjectsHelpers/ForgotPasswordHelper';

test.describe('Forgot Password Mobile Number Validation', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(FORGOT_URL).origin });
        await gotoForgotPassword(page);
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
    });

    // ── Format blocking ───────────────────────────────────────────────────────

    test('should keep Next button disabled when mobile is too short', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('5123');
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should keep Next button disabled when mobile has a leading zero', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('0500021788');
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    // ── Character filtering ───────────────────────────────────────────────────

    test('should not accept alphabetic characters in the mobile field', async ({ page }) => {
        const mobileInput = page.getByRole('textbox', { name: 'Mobile number' });
        await mobileInput.pressSequentially('abc');
        await expect(mobileInput).toHaveValue('');
    });

    test('should not accept special characters in the mobile field', async ({ page }) => {
        const mobileInput = page.getByRole('textbox', { name: 'Mobile number' });
        await mobileInput.pressSequentially('!@#');
        await expect(mobileInput).toHaveValue('');
    });

    // ── Valid format ──────────────────────────────────────────────────────────

    test('should enable Next button with a valid 9-digit mobile starting with 5', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500021788');
        await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
    });
});
