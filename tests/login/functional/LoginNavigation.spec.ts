import { test, expect } from '@playwright/test';
import {
    LOGIN_URL,
    SESSION_PATH,
} from '../../pageObjectsHelpers/LoginHelper';
import { LoginPage } from '../../pages/LoginPage';

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — Navigation', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });
        loginPage = new LoginPage(page);
        await loginPage.goto(LOGIN_URL);
    });

    test('should navigate to the Forgot Password page when the link is clicked', async ({ page }) => {
        await loginPage.forgotPasswordLink.click();
        await expect(page).toHaveURL(/forgot-password/);
    });

    test('should navigate to the Sign Up page when the link is clicked', async ({ page }) => {
        await loginPage.signUpLink.click();
        await expect(page).not.toHaveURL(LOGIN_URL);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ALREADY AUTHENTICATED
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — Already Authenticated', () => {
    test.use({ storageState: SESSION_PATH });

    test.skip('should redirect away from the login page when already logged in', async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 10000 });
    });

    test.skip('should not display the Log In button when already logged in', async ({ page }) => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(page.getByRole('button', { name: 'Log In' })).not.toBeVisible({ timeout: 10000 });
    });
});
