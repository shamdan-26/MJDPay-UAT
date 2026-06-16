import { test, expect } from '@playwright/test';
import { FORGOT_URL } from './helpers';

test.describe('Forgot Password Page', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    // ── Page load ─────────────────────────────────────────────────────────────

    test('should open the Forgot Password URL', async ({ page }) => {
        await expect(page).toHaveURL(FORGOT_URL);
    });

    test('should have the correct page title', async ({ page }) => {
        await expect(page).toHaveTitle('EMI - Business');
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should display the MJD Pay logo', async ({ page }) => {
        await expect(page.locator('img[alt="MJD Pay"]')).toBeVisible();
    });

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should display the EN language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toBeVisible();
    });

    test('should display the Arabic language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'العربية' })).toBeVisible();
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    test('should display the theme toggle button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
    });

    // ── Back button ───────────────────────────────────────────────────────────

    test('should display the back button', async ({ page }) => {
        await expect(page.locator('main button').first()).toBeVisible();
    });

    // ── Eyebrow & title ───────────────────────────────────────────────────────

    test('should display the "Forgot password" eyebrow text', async ({ page }) => {
        await expect(page.getByText('Forgot password')).toBeVisible();
    });

    test('should display the "Welcome to MJD Pay" heading', async ({ page }) => {
        await expect(page.getByText('Welcome to MJD Pay')).toBeVisible();
    });

    // ── Company number field ──────────────────────────────────────────────────

    test('should display the Company number label', async ({ page }) => {
        await expect(page.getByText('Company number')).toBeVisible();
    });

    test('should display the Company number input', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Company number' })).toBeVisible();
    });

    test('should have the correct placeholder for Company number', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Company number' }))
            .toHaveAttribute('placeholder', 'Input here');
    });

    // ── Mobile number field ───────────────────────────────────────────────────

    test('should display the Mobile number label', async ({ page }) => {
        await expect(page.getByText('Mobile number')).toBeVisible();
    });

    test('should display the country code (+966)', async ({ page }) => {
        await expect(page.locator('.floating-prefix')).toContainText('(+966)');
    });

    test('should display the Mobile number input', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toBeVisible();
    });

    test('should have the correct placeholder for Mobile number', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Mobile number' }))
            .toHaveAttribute('placeholder', 'Input here');
    });

    // ── Next button ───────────────────────────────────────────────────────────

    test('should display the Next button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    });

    test('should have Next button disabled when both fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });
});
