import { test, expect } from '@playwright/test';
import { assertToast } from '../shared';
import {
    VALID_COMPANY,
    VALID_PASSWORD,
    LOGIN_URL,
    LOCKED_COMPANY,
    LOCKED_MOBILE,
    DEACTIVATED_COMPANY,
    DEACTIVATED_MOBILE,
    AML_COMPANY,
    AML_MOBILE,
    generateUnregisteredMobile,
} from './helpers';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login — Account Status Errors', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });
        loginPage = new LoginPage(page);
        await loginPage.goto(LOGIN_URL);
    });

    // ── Not Registered ────────────────────────────────────────────────────────

    test.describe('Not Registered', () => {
        test('should display an error when credentials are not registered', async ({ page }) => {
            await loginPage.fill(VALID_COMPANY, generateUnregisteredMobile(), VALID_PASSWORD);
            await loginPage.submit();
            await assertToast(page);
        });

        test('should not expose technical details in the not-registered error', async ({ page }) => {
            await loginPage.fill(VALID_COMPANY, generateUnregisteredMobile(), VALID_PASSWORD);
            await loginPage.submit();
            const detail = page.locator('.toast-snackbar__detail');
            await expect(detail).toBeVisible({ timeout: 10000 });
            const text = await detail.textContent() ?? '';
            expect(text).not.toMatch(/stack|exception|sql|database|null pointer|traceback|internal/i);
        });
    });

    // ── Locked Account ────────────────────────────────────────────────────────

    test.describe('Locked Account', () => {
        test('should display an error and not show OTP for a locked account', async ({ page }) => {
            test.skip(!LOCKED_COMPANY || !LOCKED_MOBILE, 'Set LOCKED_COMPANY and LOCKED_MOBILE env vars to run this test');
            await loginPage.fill(LOCKED_COMPANY, LOCKED_MOBILE, VALID_PASSWORD);
            await loginPage.submit();
            await assertToast(page);
            await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
        });
    });

    // ── Deactivated Account ───────────────────────────────────────────────────

    test.describe('Deactivated Account', () => {
        test('should display an error and not show OTP for a deactivated account', async ({ page }) => {
            test.skip(!DEACTIVATED_COMPANY || !DEACTIVATED_MOBILE, 'Set DEACTIVATED_COMPANY and DEACTIVATED_MOBILE env vars to run this test');
            await loginPage.fill(DEACTIVATED_COMPANY, DEACTIVATED_MOBILE, VALID_PASSWORD);
            await loginPage.submit();
            await assertToast(page);
            await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
        });
    });

    // ── AML / Compliance Block ────────────────────────────────────────────────

    test.describe('AML / Compliance Block', () => {
        test('should display a generic rejection for an AML-blocked account', async ({ page }) => {
            test.skip(!AML_COMPANY || !AML_MOBILE, 'Set AML_COMPANY and AML_MOBILE env vars to run this test');
            await loginPage.fill(AML_COMPANY, AML_MOBILE, VALID_PASSWORD);
            await loginPage.submit();
            await assertToast(page);
            await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
        });

        test('should not expose AML or compliance details in the error message', async ({ page }) => {
            test.skip(!AML_COMPANY || !AML_MOBILE, 'Set AML_COMPANY and AML_MOBILE env vars to run this test');
            await loginPage.fill(AML_COMPANY, AML_MOBILE, VALID_PASSWORD);
            await loginPage.submit();
            const detail = page.locator('.toast-snackbar__detail');
            await expect(detail).toBeVisible({ timeout: 10000 });
            const text = await detail.textContent() ?? '';
            expect(text).not.toMatch(/aml|compliance|sanction|blacklist|suspicious|investigation/i);
            expect(text).not.toMatch(/stack|exception|sql|database|internal/i);
        });
    });
});
