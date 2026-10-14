import { test, expect } from '../../../fixtures';
import { LOGIN_URL, LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../LoginHelper';
import { LoginPage } from '../../../pageElements/Shared/LoginPage';
import { DashboardPage } from '../../../pageElements/Shared/DashboardPage';
import { OtpPage } from '../../../pageElements/Shared/OtpPage';

// The validation card's 3-step display and the post-card OTP dialog appearing
// are owned by ui/LoginValidationPopup.spec.ts — this file owns only what's
// unique to the happy path: form state, dashboard landing, and logout.

test.describe('Login — Happy Path (End-to-End)', { tag: ['@login', '@functional', '@session'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;
    let dashboard: DashboardPage;

    test.beforeEach(async ({ page, loginPage: lp, dashboard: d }) => {
        loginPage = lp;
        dashboard = d;
        await loginPage.goto(LOGIN_URL);
    });

    // ── Step 1: Login form ────────────────────────────────────────────────────

    test('should display the login form on page load', { annotation: [{ type: 'testcase', description: "LG-76: Login form present on load" }] }, async () => {
        await expect(loginPage.companyInput).toBeVisible();
        await expect(loginPage.mobileInput).toBeVisible();
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.loginButton).toBeVisible();
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should enable the Log In button once all fields are filled', { annotation: [{ type: 'testcase', description: "LG-77: Button enables once all fields are filled" }] }, async () => {
        await loginPage.fill(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeEnabled();
    });

    // ── Step 2: Validation card ───────────────────────────────────────────────

    test('should dismiss the validation card after all steps complete', { annotation: [{ type: 'testcase', description: "LG-60: Card dismisses after all steps complete" }] }, async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 30000 });
    });

    // ── Step 3: Dashboard ─────────────────────────────────────────────────────

    test('should redirect away from the login page after submitting valid credentials', { annotation: [{ type: 'testcase', description: "LG-79: Redirect away from login on valid login" }] }, async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
    });

    test('should display the sidebar logo and brand name on the dashboard', { annotation: [{ type: 'testcase', description: "LG-80: Dashboard sidebar logo and brand shown" }] }, async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.logo).toBeVisible({ timeout: 15000 });
        await expect(dashboard.brandName).toBeVisible();
    });

    test('should display the sidebar navigation links on the dashboard', { annotation: [{ type: 'testcase', description: "LG-81: Dashboard sidebar navigation shown" }] }, async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.navigation).toBeVisible({ timeout: 15000 });
        await expect(dashboard.homeLink).toBeVisible();
        await expect(dashboard.transactionsLink).toBeVisible();
        await expect(dashboard.paymentsLink).toBeVisible();
    });

    test('should display the header profile and notifications icons on the dashboard', { annotation: [{ type: 'testcase', description: "LG-82: Header profile & notification icons shown" }] }, async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.profileTrigger).toBeVisible({ timeout: 15000 });
        await expect(dashboard.notificationsIcon).toBeVisible();
    });

    test('should display the wallet balance widget on the dashboard', { annotation: [{ type: 'testcase', description: "LG-83: Wallet balance widget shown" }] }, async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.walletBalanceSar).toBeVisible({ timeout: 15000 });
    });

    test('should display the last transactions widget on the dashboard', { annotation: [{ type: 'testcase', description: "LG-84: Last transactions widget shown" }] }, async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.lastTransactionsContainer).toBeVisible({ timeout: 15000 });
    });

    test('should display the last login timestamp on the dashboard', { annotation: [{ type: 'testcase', description: "LG-85: Last login timestamp shown" }] }, async ({ page }) => {
        await loginPage.fillAndSubmit(LOGIN_COMPANY, LOGIN_MOBILE, VALID_PASSWORD);
        await handleOtpIfPresent(page);
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 30000 });
        await expect(dashboard.lastLoginText).toBeVisible({ timeout: 15000 });
    });

    // ── Step 4: Logout ────────────────────────────────────────────────────────

    test('should log out successfully and return to the login page', { annotation: [{ type: 'testcase', description: "LG-86: Logout returns to login page" }] }, async ({ page }) => {
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
    const otp = new OtpPage(page);
    if (!(await otp.isVisible())) return;
    const otpCode = await getOtpFromDb(LOGIN_MOBILE);
    await otp.fillAndVerify(otpCode);
}
