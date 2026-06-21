import { test, expect } from '@playwright/test';
import {
    LOCKOUT_COMPANY,
    LOCKOUT_MOBILE,
    LOCKOUT_PASSWORD,
    gotoLogin,
} from './helpers';

const WRONG_PASSWORD = 'WrongPass@99';

test.describe('Login — Account Lockout', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
    });

    // Requires a dedicated lockout test account (LOCKOUT_COMPANY / LOCKOUT_MOBILE / LOCKOUT_PASSWORD).
    // After this test runs the account will be locked; an admin must unlock it before the next run.
    test('should lock the account after 3 consecutive failed login attempts', async ({ page }) => {
        test.skip(!LOCKOUT_COMPANY || !LOCKOUT_MOBILE, 'Set LOCKOUT_COMPANY, LOCKOUT_MOBILE and LOCKOUT_PASSWORD env vars to run this test');

        const companyField  = page.getByRole('textbox', { name: 'Company number' });
        const mobileField   = page.getByRole('textbox', { name: 'Mobile number' });
        const passwordField = page.locator('input[aria-label="Password"]');
        const loginBtn      = page.getByRole('button', { name: 'Log In' });
        const error         = page.locator('[role="alert"], [class*="error"], [class*="invalid"], .toast, .notification').first();

        for (let attempt = 1; attempt <= 3; attempt++) {
            await gotoLogin(page);
            await companyField.fill(LOCKOUT_COMPANY);
            await mobileField.fill(LOCKOUT_MOBILE);
            await passwordField.fill(WRONG_PASSWORD);
            await loginBtn.click();
            await expect(error).toBeVisible({ timeout: 10000 });
        }

        // After 3 failures the account is locked — correct credentials should now return a
        // locked error without advancing to OTP.
        await gotoLogin(page);
        await companyField.fill(LOCKOUT_COMPANY);
        await mobileField.fill(LOCKOUT_MOBILE);
        await passwordField.fill(LOCKOUT_PASSWORD);
        await loginBtn.click();
        await expect(error).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
    });
});
