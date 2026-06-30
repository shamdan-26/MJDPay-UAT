import { test, expect } from '@playwright/test';
import { assertToast } from '../../shared';
import {
    FORGOT_URL,
    LOGIN_URL,
    VALID_COMPANY,
    VALID_MOBILE,
    mockOtpDisabled,
    mockForgetPasswordSuccess,
    mockForgetPasswordFailure,
    abortUnmockedGatewayRequests,
    gotoForgotPassword,
} from '../../pageObjects/ForgotPasswordHelper';

// ── Step 1: Credential validation & navigation ────────────────────────────────

test.describe('Forgot Password - Step 1 Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await abortUnmockedGatewayRequests(page);
        await mockOtpDisabled(page);
        await mockForgetPasswordFailure(page);
        await gotoForgotPassword(page);
    });

    test('should remain on the forgot-password page after submitting invalid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
    });

    test('should display an error notification after submitting invalid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await assertToast(page);
    });

    test('should keep Company number field value after failed submission', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await expect(page.getByRole('textbox', { name: 'Company number' })).toHaveValue('INVALID');
    });

    test('should keep Mobile number field value after failed submission', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toHaveValue('500000000');
    });

    test('should navigate to change-password URL when step 1 is submitted with valid credentials (mocked)', async ({ page }) => {
        await mockForgetPasswordSuccess(page);
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(/change-password/, { timeout: 15000 });
    });

    test('should show the New Password field after step 1 succeeds (mocked)', async ({ page }) => {
        await mockForgetPasswordSuccess(page);
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page.getByRole('textbox', { name: 'New Password' })).toBeVisible({ timeout: 15000 });
    });

    test('should show the Confirm Password field after step 1 succeeds (mocked)', async ({ page }) => {
        await mockForgetPasswordSuccess(page);
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible({ timeout: 15000 });
    });
});

// ── Page interactions (navigation & field input) ──────────────────────────────

test.describe('Forgot Password - Page Interactions', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await abortUnmockedGatewayRequests(page);
        await mockOtpDisabled(page);
        await gotoForgotPassword(page);
    });

    test('should switch to Arabic (RTL) when Arabic button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'العربية' }).click();
        await page.waitForLoadState('domcontentloaded');
        await page.getByRole('button', { name: 'العربية' }).waitFor({ state: 'visible', timeout: 15000 });
        await expect(page.getByRole('button', { name: 'العربية' })).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
    });

    test('should switch back to English when EN button is clicked after Arabic', async ({ page }) => {
        await page.getByRole('button', { name: 'العربية' }).click();
        await page.getByRole('button', { name: 'العربية' }).waitFor({ state: 'visible', timeout: 15000 });
        await expect(page.getByRole('button', { name: 'العربية' })).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
        await page.getByRole('button', { name: 'EN' }).click();
        await page.getByRole('button', { name: 'EN' }).waitFor({ state: 'visible', timeout: 15000 });
        await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
    });

    test('should navigate back to the login page when back button is clicked', async ({ page }) => {
        await page.locator('main button').first().click();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    test('should accept input in the Company number field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await expect(page.getByRole('textbox', { name: 'Company number' })).toHaveValue(VALID_COMPANY);
    });

    test('should accept input in the Mobile number field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toHaveValue(VALID_MOBILE);
    });

    test('should have Next button disabled when only Company number is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should have Next button disabled when only Mobile number is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should enable Next button when both fields are filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
    });

    test('should disable Next button again after clearing the Mobile number field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
        await page.getByRole('textbox', { name: 'Mobile number' }).clear();
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should disable Next button again after clearing the Company number field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
        await page.getByRole('textbox', { name: 'Company number' }).clear();
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should proceed when Next is clicked with valid credentials', async ({ page }) => {
        await mockForgetPasswordSuccess(page);
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).not.toHaveURL(FORGOT_URL, { timeout: 15000 });
    });

    test('should show an error when Next is clicked with invalid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL);
    });
});

// ── Step 1: Edge cases & input boundaries ─────────────────────────────────────

test.describe('Forgot Password - Step 1 Edge Cases', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await abortUnmockedGatewayRequests(page);
        await mockOtpDisabled(page);
        await gotoForgotPassword(page);
    });

    test('should keep Next button disabled when Company number contains only spaces', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('   ');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should strip non-digit formatting characters (spaces/dashes) from the Mobile number field', async ({ page }) => {
        const mobileInput = page.getByRole('textbox', { name: 'Mobile number' });
        await mobileInput.pressSequentially('500-318-143');
        const value = await mobileInput.inputValue();
        expect(value).not.toContain('-');
        expect(value).not.toContain(' ');
    });

    test('should not crash the page when Company number is an extremely long string', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('1'.repeat(200));
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    });

    test.skip('should submit step 1 when Enter is pressed after filling valid credentials', async ({ page }) => {
        await mockForgetPasswordSuccess(page);
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('#btn_get_otp').press('Enter');
        await expect(page).toHaveURL(/change-password/, { timeout: 15000 });
    });

    test('should not send duplicate credential-check requests when Next is double-clicked', async ({ page }) => {
        let requestCount = 0;
        await page.route('**/auth/passwords/forget', async route => {
            requestCount++;
            await new Promise(r => setTimeout(r, 2000));
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }).catch(() => {});
        });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        const nextBtn = page.locator('#btn_get_otp');
        await nextBtn.click();
        await expect(nextBtn).toBeDisabled({ timeout: 3000 });
        await nextBtn.click({ force: true }).catch(() => {});
        await expect(page.getByRole('textbox', { name: 'New Password' })).toBeVisible({ timeout: 15000 });
        expect(requestCount).toBe(1);
    });

    test('should disable the Next button while the credential-check request is in flight', async ({ page }) => {
        await page.route('**/auth/passwords/forget', async route => {
            await new Promise(r => setTimeout(r, 1000));
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        const nextBtn = page.locator('#btn_get_otp');
        await nextBtn.click();
        await expect(nextBtn).toBeDisabled();
    });
});

// ── Step 1: Security ──────────────────────────────────────────────────────────

test.describe('Forgot Password - Step 1 Security', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await abortUnmockedGatewayRequests(page);
        await mockOtpDisabled(page);
        await mockForgetPasswordFailure(page);
        await gotoForgotPassword(page);
    });

    test('should not execute a script payload entered in the Company number field', async ({ page }) => {
        let dialogTriggered = false;
        page.on('dialog', async dialog => { dialogTriggered = true; await dialog.dismiss(); });
        await page.getByRole('textbox', { name: 'Company number' }).fill('<script>alert(1)</script>');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await assertToast(page);
        expect(dialogTriggered).toBe(false);
    });

    test('should treat SQL-injection-style Company number input as an invalid credential, not crash the page', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill("' OR '1'='1");
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await assertToast(page);
    });

    test('should not expose the New Password form when the change-password URL is opened directly without completing step 1', async ({ page }) => {
        await page.goto(FORGOT_URL.replace('forgot-password', 'change-password'), { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(page.getByRole('textbox', { name: 'New Password' })).not.toBeVisible({ timeout: 10000 });
    });
});
