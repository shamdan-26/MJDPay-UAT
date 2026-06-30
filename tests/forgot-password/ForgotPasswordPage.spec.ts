import { test, expect } from '@playwright/test';
import { FORGOT_URL, LOGIN_URL, mockOtpDisabled, gotoForgotPassword } from './helpers';

test.describe('Forgot Password Page', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await gotoForgotPassword(page);
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

    test('should navigate away from forgot-password when logo is clicked', async ({ page }) => {
        await page.locator('a').filter({ has: page.locator('img[alt="MJD Pay"]') }).click();
        await expect(page).not.toHaveURL(FORGOT_URL);
    });

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should display the EN language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toBeVisible();
    });

    test('should have EN button active by default', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('should display the Arabic language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'العربية' })).toBeVisible();
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    test('should display the theme toggle button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
    });

    test('should change the theme when theme toggle is clicked', async ({ page }) => {
        const html = page.locator('html');
        const before = await html.getAttribute('class');
        await page.getByRole('button', { name: 'Switch theme' }).click();
        await expect(html).not.toHaveAttribute('class', before ?? '');
    });

    // ── Back button ───────────────────────────────────────────────────────────

    test('should display the back button', async ({ page }) => {
        await expect(page.locator('main button').first()).toBeVisible();
    });

    test('should navigate to the login page when back button is clicked', async ({ page }) => {
        await page.locator('main button').first().click();
        await expect(page).toHaveURL(LOGIN_URL);
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

    test('should have the Company number input visible and enabled', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Company number' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Company number' })).toBeEnabled();
    });

    // ── Mobile number field ───────────────────────────────────────────────────

    test('should display the Mobile number label', async ({ page }) => {
        await expect(page.getByText('Mobile number')).toBeVisible();
    });

    test('should display the country code (+966)', async ({ page }) => {
        await expect(page.locator('.floating-prefix')).toContainText('(+966)');
    });

    test('should have the Mobile number input visible and enabled', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toBeEnabled();
    });

    // ── Next button ───────────────────────────────────────────────────────────

    test('should display the Next button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    });

    test('should have Next button disabled when both fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });
});
