import { test, expect } from '@playwright/test';
import { goToInfoStep } from './helpers';

test.describe('Registration - Info Page', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await goToInfoStep(page);
    });

    // ── Page content ──────────────────────────────────────────────────────────

    test('should display the registration info form heading', async ({ page }) => {
        await expect(page.getByText('Tell us about your business')).toBeVisible();
    });

    // ── CRN field ─────────────────────────────────────────────────────────────

    test('should display the CRN field label', async ({ page }) => {
        await expect(page.getByText('unified number').first()).toBeVisible();
    });

    test('should display the CRN input', async ({ page }) => {
        await expect(page.getByPlaceholder('Eg. 1023456789')).toBeVisible();
    });

    // ── Iqama field ───────────────────────────────────────────────────────────

    test('should display the Iqama field label', async ({ page }) => {
        await expect(page.getByText('National ID/Iqama').first()).toBeVisible();
    });

    test('should display the Iqama input', async ({ page }) => {
        await expect(page.getByPlaceholder('Eg. 1012345678')).toBeVisible();
    });

    // ── Email field ───────────────────────────────────────────────────────────

    test('should display the Email field label', async ({ page }) => {
        await expect(page.getByText(/Email/i).first()).toBeVisible();
    });

    test('should display the Email input', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /Email/i })).toBeVisible();
    });

    // ── Profile Type radio group ──────────────────────────────────────────────

    test('should display the Profile Type options', async ({ page }) => {
        await expect(page.getByRole('radiogroup', { name: 'Profile Type' })).toBeVisible();
    });

    // ── Next / Submit button ──────────────────────────────────────────────────

    test('should display the Next button', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: /next|submit|continue/i }).first()
        ).toBeVisible();
    });

    test('should have the Next button disabled when required fields are empty', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: /next|submit|continue/i }).first()
        ).toBeDisabled();
    });
});
