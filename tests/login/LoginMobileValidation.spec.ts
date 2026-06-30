import { test, expect } from '@playwright/test';
import { VALID_COMPANY, VALID_PASSWORD, LOGIN_URL } from './helpers';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login Mobile Number Validation', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });
        loginPage = new LoginPage(page);
        await loginPage.goto(LOGIN_URL);
        await loginPage.companyInput.fill(VALID_COMPANY);
        await loginPage.passwordInput.fill(VALID_PASSWORD);
    });

    // ── Format blocking ───────────────────────────────────────────────────────

    test('should keep Log In button disabled when mobile is too short', async () => {
        await loginPage.mobileInput.fill('5123');
        await expect(loginPage.loginButton).toBeDisabled();
    });

    test('should keep Log In button disabled when mobile has a leading zero', async () => {
        await loginPage.mobileInput.fill('0500318143');
        await expect(loginPage.loginButton).toBeDisabled();
    });

    // ── Character filtering ───────────────────────────────────────────────────

    test('should not accept alphabetic characters in the mobile field', async () => {
        await loginPage.mobileInput.pressSequentially('abc');
        await expect(loginPage.mobileInput).toHaveValue('');
    });

    test('should not accept special characters in the mobile field', async () => {
        await loginPage.mobileInput.pressSequentially('!@#');
        await expect(loginPage.mobileInput).toHaveValue('');
    });

    // ── Valid format ──────────────────────────────────────────────────────────

    test('should enable Log In button with a valid 9-digit mobile starting with 5', async () => {
        await loginPage.mobileInput.fill('500318143');
        await expect(loginPage.loginButton).toBeEnabled();
    });
});
