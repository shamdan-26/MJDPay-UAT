import { test, expect } from '@playwright/test';
import { VALID_COMPANY, VALID_PASSWORD, gotoLogin } from './helpers';

test.describe('Login Mobile Number Validation', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await gotoLogin(page);
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.locator('input[aria-label="Password"]').fill(VALID_PASSWORD);
    });

    // ── Format blocking ───────────────────────────────────────────────────────

    test('should keep Log In button disabled when mobile is too short', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('5123');
        await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
    });

    test('should keep Log In button disabled when mobile has a leading zero', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('0500318143');
        await expect(page.getByRole('button', { name: 'Log In' })).toBeDisabled();
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

    test('should enable Log In button with a valid 9-digit mobile starting with 5', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500318143');
        await expect(page.getByRole('button', { name: 'Log In' })).toBeEnabled();
    });
});
