import { test, expect } from '@playwright/test';
import {
    LOGIN_URL,
    SESSION_PATH,
    VALID_COMPANY,
    VALID_MOBILE,
    VALID_PASSWORD,
} from './helpers';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, context }) => {
        const origin = new URL(LOGIN_URL).origin;
        await context.grantPermissions(['geolocation'], { origin });
        loginPage = new LoginPage(page);
        await loginPage.goto(LOGIN_URL);
    });

    // ── Valid credentials ─────────────────────────────────────────────────────

    test('should redirect to dashboard with valid credentials when OTP is disabled', async ({ page }) => {
        await loginPage.fillAndSubmit(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 8000 })
            .then(() => true)
            .catch(() => false);
        test.skip(otpAppeared, 'OTP is enabled in this environment — redirect without OTP is not applicable');
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 15000 });
    });

    // ── Invalid credentials ───────────────────────────────────────────────────

    test('should stay on login page with a wrong password', async ({ page }) => {
        await loginPage.fill(VALID_COMPANY, VALID_MOBILE, 'WrongPass@99');
        await loginPage.submit();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should stay on login page with a wrong company number', async ({ page }) => {
        await loginPage.fill('INVALID99', VALID_MOBILE, VALID_PASSWORD);
        await loginPage.submit();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should stay on login page with a wrong mobile number', async ({ page }) => {
        await loginPage.fill(VALID_COMPANY, '500000000', VALID_PASSWORD);
        await loginPage.submit();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should stay on login page with all wrong credentials', async ({ page }) => {
        await loginPage.fill('WRONG123', '500000000', 'WrongPass@99');
        await loginPage.submit();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should display an error message after submitting wrong credentials', async ({ page }) => {
        await loginPage.fill('WRONG123', '500000000', 'WrongPass@99');
        await loginPage.submit();
        await expect(
            page.locator('[role="alert"], [class*="error"], [class*="invalid"], .toast, .notification').first()
        ).toBeVisible({ timeout: 10000 });
    });

    // ── Log In button state ───────────────────────────────────────────────────

    test('should keep Log In button disabled when all fields are empty', async () => {
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should keep Log In button disabled when only company number is filled', async () => {
        await loginPage.companyInput.fill(VALID_COMPANY);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should keep Log In button disabled when only mobile number is filled', async () => {
        await loginPage.mobileInput.fill(VALID_MOBILE);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should keep Log In button disabled when only password is filled', async () => {
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should keep Log In button disabled when company number and mobile are filled but not password', async () => {
        await loginPage.companyInput.fill(VALID_COMPANY);
        await loginPage.mobileInput.fill(VALID_MOBILE);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should keep Log In button disabled when company number and password are filled but not mobile', async () => {
        await loginPage.companyInput.fill(VALID_COMPANY);
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should keep Log In button disabled when mobile and password are filled but not company number', async () => {
        await loginPage.mobileInput.fill(VALID_MOBILE);
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should enable Log In button when all three fields are filled with valid credentials', async () => {
        await loginPage.fill(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeEnabled();
    });

    test('should disable Log In button again after clearing a previously filled field', async () => {
        await loginPage.fill(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        await expect(loginPage.loginButton).toBeEnabled();
        await loginPage.companyInput.clear();
        await expect(loginPage.loginButton).toBeDisabled();
    });

    // ── Password visibility ───────────────────────────────────────────────────

    test('should reveal password when show password toggle is clicked', async () => {
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
        await loginPage.showPasswordToggle.click();
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
    });

    test('should re-mask password when the toggle is clicked a second time', async () => {
        await loginPage.passwordInput.fill(VALID_PASSWORD);
        await loginPage.showPasswordToggle.click();
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
        await loginPage.showPasswordToggle.click();
        await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });

    // ── Navigation ────────────────────────────────────────────────────────────

    test('should navigate to the Forgot Password page', async ({ page }) => {
        await loginPage.forgotPasswordLink.click();
        await expect(page).toHaveURL(/forgot-password/);
    });

    test('should navigate to the Sign Up page', async ({ page }) => {
        await loginPage.signUpLink.click();
        await expect(page).not.toHaveURL(LOGIN_URL);
    });
});

// ── Already authenticated (uses saved session) ────────────────────────────────

test.describe('Login - Already Authenticated', () => {
    test.use({ storageState: SESSION_PATH });

    test.skip('should redirect away from login page when already logged in', async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 10000 });
    });

    test.skip('should not display the Log In button when already logged in', async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(page.getByRole('button', { name: 'Log In' })).not.toBeVisible({ timeout: 10000 });
    });
});
