import { test, expect } from '@playwright/test';
import { assertToast } from '../shared';
import {
    LOCKOUT_COMPANY,
    LOCKOUT_MOBILE,
    LOCKOUT_PASSWORD,
    LOGIN_URL,
} from './helpers';
import { LoginPage } from '../pages/LoginPage';

const WRONG_PASSWORD = 'WrongPass@99';

test.describe('Login — Account Lockout', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });
        loginPage = new LoginPage(page);
    });

    // Requires a dedicated lockout test account (LOCKOUT_COMPANY / LOCKOUT_MOBILE / LOCKOUT_PASSWORD).
    // After this test runs the account will be locked; an admin must unlock it before the next run.
    test('should lock the account after 3 consecutive failed login attempts', async ({ page }) => {
        test.skip(!LOCKOUT_COMPANY || !LOCKOUT_MOBILE, 'Set LOCKOUT_COMPANY, LOCKOUT_MOBILE and LOCKOUT_PASSWORD env vars to run this test');

        for (let attempt = 1; attempt <= 3; attempt++) {
            await loginPage.goto(LOGIN_URL);
            await loginPage.fill(LOCKOUT_COMPANY, LOCKOUT_MOBILE, WRONG_PASSWORD);
            await loginPage.submit();
            await assertToast(page);
        }

        // After 3 failures the account is locked — correct credentials should now return a
        // locked error without advancing to OTP.
        await loginPage.goto(LOGIN_URL);
        await loginPage.fill(LOCKOUT_COMPANY, LOCKOUT_MOBILE, LOCKOUT_PASSWORD);
        await loginPage.submit();
        await assertToast(page);
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
    });
});
