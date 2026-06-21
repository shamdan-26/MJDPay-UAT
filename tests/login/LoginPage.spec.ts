import { test, expect, type Page } from '@playwright/test';
import { LOGIN_URL, gotoLogin } from './helpers';

const env = process.env['ENV'] ?? 'uat';
const loginBtn = (page: Page) =>
    env === 'dev' ? page.locator('#btn_login') : page.getByRole('button', { name: 'Log In' });

test.describe('Login Page', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await gotoLogin(page);
    });

    // ── Page load ─────────────────────────────────────────────────────────────

    test('should open the login URL', async ({ page }) => {
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should have the correct page title', async ({ page }) => {
        await expect(page).toHaveTitle('EMI - Business');
    });

    test('should display the login form container', async ({ page }) => {
        await expect(page.locator('#login-form-box')).toBeVisible();
    });

    test('should display the Login eyebrow text', async ({ page }) => {
        await expect(page.locator('#login-form-eyebrow')).toHaveText('Login');
    });

    test('should display the Welcome heading', async ({ page }) => {
        await expect(page.locator('#login-form-title')).toHaveText(' Welcome to MJD Pay');
    });

    test('should display the tagline description', async ({ page }) => {
        await expect(page.getByText(/Seamless transactions.*get started/)).toBeVisible();
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should display the MJD Pay logo image', async ({ page }) => {
        await expect(page.locator('img[alt="MJD Pay"]')).toBeVisible();
    });

    test('should display the MJD Pay logo as a clickable link', async ({ page }) => {
        await expect(page.locator('a:has(img[alt="MJD Pay"])')).toBeVisible();
    });

    test('should navigate to a valid page when the logo link is clicked', async ({ page }) => {
        await page.locator('a:has(img[alt="MJD Pay"])').click();
        await expect(page).toHaveURL(/majdpay\.com/, { timeout: 10000 });
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

    test('should not have Arabic as the active language by default', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'العربية' })).not.toHaveAttribute('aria-pressed', 'true');
    });

    test('should activate the Arabic button when clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'العربية' }).click();
        await expect(page.getByRole('button', { name: 'العربية' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('should switch back to EN when EN button is clicked after Arabic', async ({ page }) => {
        await page.getByRole('button', { name: 'العربية' }).click();
        await page.getByRole('button', { name: 'EN' }).click();
        await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    test('should display the theme toggle button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
    });

    test('should change the theme when the toggle is clicked', async ({ page }) => {
        const body = page.locator('body');
        const before = await body.getAttribute('class');
        await page.getByRole('button', { name: 'Switch theme' }).click();
        const after = await body.getAttribute('class');
        expect(after).not.toEqual(before);
    });

    // ── QA Login Tools ────────────────────────────────────────────────────────

    test('should display the QA Login Tools button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'QA Login Tools' })).toBeVisible();
    });

    // ── Company number field ──────────────────────────────────────────────────

    test('should display the Company number label', async ({ page }) => {
        await expect(page.getByText('Company number')).toBeVisible();
    });

    test('should display the Company number input as visible and enabled', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Company number' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Company number' })).toBeEnabled();
    });

    test('should display the Company number input with the correct placeholder', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Company number' }))
            .toHaveAttribute('placeholder', 'Eg. 153165659');
    });

    // ── Mobile number field ───────────────────────────────────────────────────

    test('should display the Mobile number label', async ({ page }) => {
        await expect(page.getByText('Mobile number')).toBeVisible();
    });

    test('should display the country code (+966)', async ({ page }) => {
        await expect(page.locator('.floating-prefix')).toContainText('(+966)');
    });

    test('should display the Mobile number input as visible and enabled', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toBeEnabled();
    });

    // ── Password field ────────────────────────────────────────────────────────

    test('should display the Password label', async ({ page }) => {
        await expect(page.locator('label.floating-field-label', { hasText: 'Password' })).toBeVisible();
    });

    test('should display the Password input masked by default', async ({ page }) => {
        const input = page.locator('input[aria-label="Password"]');
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('type', 'password');
    });

    test('should display the Show password toggle button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
    });

    // ── Forgot Password ───────────────────────────────────────────────────────

    test('should display the Forgot Password link', async ({ page }) => {
        await expect(page.getByText('Forgot Password?')).toBeVisible();
    });

    test('should navigate to the Forgot Password page when the link is clicked', async ({ page }) => {
        await page.getByText('Forgot Password?').click();
        await expect(page).toHaveURL(/forgot-password/, { timeout: 10000 });
    });

    // ── Log In button ─────────────────────────────────────────────────────────

    test('should display the Log In button', async ({ page }) => {
        await expect(loginBtn(page)).toBeVisible();
    });

    test('should have the Log In button disabled on page load', async ({ page }) => {
        await expect(loginBtn(page)).toBeDisabled();
    });

    // ── Sign Up ───────────────────────────────────────────────────────────────

    test('should display the "New to MJD PAY?" text', async ({ page }) => {
        await expect(page.getByText('New to MJD PAY?')).toBeVisible();
    });

    test('should display the Sign Up link', async ({ page }) => {
        await expect(page.getByText('Sign Up')).toBeVisible();
    });

});
