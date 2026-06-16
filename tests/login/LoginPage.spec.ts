import { test, expect } from '@playwright/test';
import { LOGIN_URL } from './helpers';

test.describe('Verify Login page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(LOGIN_URL);
    });

    // ── Page load ─────────────────────────────────────────────────────────────

    test('should be able to open the URL', async ({ page }) => {
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should have the correct title', async ({ page }) => {
        await expect(page).toHaveTitle('EMI - Business');
    });

    test('should have the login form', async ({ page }) => {
        await expect(page.locator('#login-form-box')).toBeVisible();
    });

    test('should have the correct login form eyebrow text', async ({ page }) => {
        await expect(page.locator('#login-form-eyebrow')).toHaveText('Login');
    });

    test('should have the correct login form title', async ({ page }) => {
        await expect(page.locator('#login-form-title')).toHaveText(' Welcome to MJD Pay');
    });

    test('should have the correct login form description', async ({ page }) => {
        await expect(page.getByText(/Seamless transactions.*get started/)).toBeVisible();
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should display the MJD Pay logo image', async ({ page }) => {
        await expect(page.locator('img[alt="MJD Pay"]')).toBeVisible();
    });

    test('should display the MJD Pay logo as a link', async ({ page }) => {
        await expect(page.locator('a:has(img[alt="MJD Pay"])')).toBeVisible();
    });

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should display the EN language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toBeVisible();
    });

    test('should have EN as the active language by default', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('should display the Arabic language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'العربية' })).toBeVisible();
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    test('should display the theme toggle button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
    });

    // ── QA Login Tools ────────────────────────────────────────────────────────

    test('should display the QA Login Tools button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'QA Login Tools' })).toBeVisible();
    });

    // ── Company number field ──────────────────────────────────────────────────

    test('should display the Company number label', async ({ page }) => {
        await expect(page.getByText('Company number')).toBeVisible();
    });

    test('should display the Company number input with correct placeholder', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Company number' });
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Eg. 153165659');
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

    // ── Password field ────────────────────────────────────────────────────────

    test('should display the Password label', async ({ page }) => {
        await expect(page.locator('label.floating-field-label', { hasText: 'Password' })).toBeVisible();
    });

    test('should display the Password input masked by default', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'Password' });
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('type', 'password');
    });

    // ── Show/hide password button ─────────────────────────────────────────────

    test('should display the Show password button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
    });

    // ── Forgot Password ───────────────────────────────────────────────────────

    test('should display the Forgot Password link', async ({ page }) => {
        await expect(page.getByText('Forgot Password?')).toBeVisible();
    });

    // ── Log In button ─────────────────────────────────────────────────────────

    test('should display the Log In button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
    });

    // ── Sign Up ───────────────────────────────────────────────────────────────

    test('should display the "New to MJD PAY?" text', async ({ page }) => {
        await expect(page.getByText('New to MJD PAY?')).toBeVisible();
    });

    test('should display the Sign Up link', async ({ page }) => {
        await expect(page.getByText('Sign Up')).toBeVisible();
    });
});
