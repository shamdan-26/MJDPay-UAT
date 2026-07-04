import { test, expect } from '@playwright/test';
import {
    LOGIN_URL,
    LOGIN_COMPANY,
    LOGIN_MOBILE,
    VALID_PASSWORD,
    getOtpFromDb,
    fillOtpInputs,
} from '../../pageObjectsHelpers/LoginHelper';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';

test.describe('Login — Happy Path (End-to-End)', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;
    let dashboard: DashboardPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });
        loginPage = new LoginPage(page);
        dashboard = new DashboardPage(page);
        await loginPage.goto(LOGIN_URL);
    });

    // ── Step 1: Login form ────────────────────────────────────────────────────

    test('should display the login form on page load', async () => {
        await expect(loginPage.companyInput).toBeVisible();
        await expect(loginPage.mobileInput).toBeVisible();
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.loginButton).toBeVisible();
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should enable the Log In button once all fields are filled', async () => {
        await loginPage.fill(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeEnabled();
    });

    // ── Step 2: Validation card ───────────────────────────────────────────────

    test('should show the validation card immediately after submitting valid credentials', async ({ page }) => {
        const loginBtn = loginPage.loginButton;
        await loginPage.fill(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await Promise.all([
            loginBtn.click(),
            page.getByText('Just a moment...'),
        ]);
        await expect(page.getByText('Just a moment...'));
        await expect(page.getByText('Verifying your credentials')).toBeVisible();
        await expect(page.getByText('Preparing this device')).toBeVisible();
        await expect(page.getByText('Securing your session')).toBeVisible();
    });

    test('should dismiss the validation card after all steps complete', async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 30000 });
    });

    // ── Step 3: OTP (conditional — skipped when OTP is disabled) ─────────────

    test('should show the OTP dialog after the validation card (when OTP is enabled)', async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 30000 });
        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 10000 })
            .then(() => true).catch(() => false);
        test.skip(!otpAppeared, 'OTP is disabled in this environment');
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    // ── Step 4: Dashboard ─────────────────────────────────────────────────────

    test('should redirect away from the login page after submitting valid credentials', async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
    });

    test('should display the sidebar logo and brand name on the dashboard', async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.logo).toBeVisible({ timeout: 15000 });
        await expect(dashboard.brandName).toBeVisible();
    });

    test('should display the sidebar navigation links on the dashboard', async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.navigation).toBeVisible({ timeout: 15000 });
        await expect(dashboard.homeLink).toBeVisible();
        await expect(dashboard.transactionsLink).toBeVisible();
        await expect(dashboard.paymentsLink).toBeVisible();
    });

    test('should display the header profile and notifications icons on the dashboard', async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.profileTrigger).toBeVisible({ timeout: 15000 });
        await expect(dashboard.notificationsIcon).toBeVisible();
    });

    test('should display the wallet balance widget on the dashboard', async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.walletBalanceSar).toBeVisible({ timeout: 15000 });
    });

    test('should display the last transactions widget on the dashboard', async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.lastTransactionsContainer).toBeVisible({ timeout: 15000 });
    });

    test('should display the last login timestamp on the dashboard', async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.lastLoginText).toBeVisible({ timeout: 15000 });
    });

    // ── Step 5: Logout ────────────────────────────────────────────────────────

    test('should log out successfully and return to the login page', async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.logo).toBeVisible({ timeout: 15000 });
        await dashboard.logout();
        await expect(page).toHaveURL(/auth\/login/, { timeout: 15000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────

async function handleOtpIfPresent(page: import('@playwright/test').Page): Promise<void> {
    const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => true).catch(() => false);
    if (!otpAppeared) return;
    const otp = await getOtpFromDb(LOGIN_MOBILE);
    await fillOtpInputs(page, otp);
    const verifyBtn = page.getByRole('button', { name: 'Verify' });
    if (await verifyBtn.isVisible().catch(() => false)) {
        await verifyBtn.click({ timeout: 5000 }).catch(() => {});
    }
}
