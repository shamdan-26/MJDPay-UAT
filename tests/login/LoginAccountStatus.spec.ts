import { test, expect, type Page } from '@playwright/test';
import {
    VALID_COMPANY,
    VALID_PASSWORD,
    LOCKED_COMPANY,
    LOCKED_MOBILE,
    DEACTIVATED_COMPANY,
    DEACTIVATED_MOBILE,
    AML_COMPANY,
    AML_MOBILE,
    generateUnregisteredMobile,
    gotoLogin,
} from './helpers';

const errorLocator = (page: Page) =>
    page.locator('[role="alert"], [class*="error"], [class*="invalid"], .toast, .notification').first();

async function submitLogin(page: Page, company: string, mobile: string, password = VALID_PASSWORD) {
    await page.getByRole('textbox', { name: 'Company number' }).fill(company);
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(mobile);
    await page.locator('input[aria-label="Password"]').fill(password);
    await page.getByRole('button', { name: 'Log In' }).click();
}

test.describe('Login — Account Status Errors', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await gotoLogin(page);
    });

    // ── Not Registered ────────────────────────────────────────────────────────

    test.describe('Not Registered', () => {
        test('should display an error when credentials are not registered', async ({ page }) => {
            await submitLogin(page, VALID_COMPANY, generateUnregisteredMobile());
            await expect(errorLocator(page)).toBeVisible({ timeout: 10000 });
        });

        test('should not expose technical details in the not-registered error', async ({ page }) => {
            await submitLogin(page, VALID_COMPANY, generateUnregisteredMobile());
            const error = errorLocator(page);
            await expect(error).toBeVisible({ timeout: 10000 });
            const text = await error.textContent() ?? '';
            expect(text).not.toMatch(/stack|exception|sql|database|null pointer|traceback|internal/i);
        });
    });

    // ── Locked Account ────────────────────────────────────────────────────────

    test.describe('Locked Account', () => {
        test('should display an error and not show OTP for a locked account', async ({ page }) => {
            test.skip(!LOCKED_COMPANY || !LOCKED_MOBILE, 'Set LOCKED_COMPANY and LOCKED_MOBILE env vars to run this test');
            await submitLogin(page, LOCKED_COMPANY, LOCKED_MOBILE);
            await expect(errorLocator(page)).toBeVisible({ timeout: 10000 });
            await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
        });
    });

    // ── Deactivated Account ───────────────────────────────────────────────────

    test.describe('Deactivated Account', () => {
        test('should display an error and not show OTP for a deactivated account', async ({ page }) => {
            test.skip(!DEACTIVATED_COMPANY || !DEACTIVATED_MOBILE, 'Set DEACTIVATED_COMPANY and DEACTIVATED_MOBILE env vars to run this test');
            await submitLogin(page, DEACTIVATED_COMPANY, DEACTIVATED_MOBILE);
            await expect(errorLocator(page)).toBeVisible({ timeout: 10000 });
            await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
        });
    });

    // ── AML / Compliance Block ────────────────────────────────────────────────

    test.describe('AML / Compliance Block', () => {
        test('should display a generic rejection for an AML-blocked account', async ({ page }) => {
            test.skip(!AML_COMPANY || !AML_MOBILE, 'Set AML_COMPANY and AML_MOBILE env vars to run this test');
            await submitLogin(page, AML_COMPANY, AML_MOBILE);
            await expect(errorLocator(page)).toBeVisible({ timeout: 10000 });
            await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
        });

        test('should not expose AML or compliance details in the error message', async ({ page }) => {
            test.skip(!AML_COMPANY || !AML_MOBILE, 'Set AML_COMPANY and AML_MOBILE env vars to run this test');
            await submitLogin(page, AML_COMPANY, AML_MOBILE);
            const error = errorLocator(page);
            await expect(error).toBeVisible({ timeout: 10000 });
            const text = await error.textContent() ?? '';
            expect(text).not.toMatch(/aml|compliance|sanction|blacklist|suspicious|investigation/i);
            expect(text).not.toMatch(/stack|exception|sql|database|internal/i);
        });
    });
});
