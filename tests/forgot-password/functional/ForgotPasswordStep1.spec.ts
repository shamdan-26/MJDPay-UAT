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
} from '../../pageObjectsHelpers/ForgotPasswordHelper';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: HAPPY PATH
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 1: Happy Path', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await mockOtpDisabled(page);
        await mockForgetPasswordSuccess(page);
        await gotoForgotPassword(page);
    });

    // Navigation & chrome

    test('should open on the correct forgot-password URL', async ({ page }) => {
        await expect(page).toHaveURL(FORGOT_URL);
    });

    test('should display the MJD Pay logo', async ({ page }) => {
        await expect(page.locator('img[alt="MJD Pay"]')).toBeVisible();
    });

    test('should navigate away from the forgot-password page when the logo is clicked', async ({ page }) => {
        await page.locator('a').filter({ has: page.locator('img[alt="MJD Pay"]') }).click();
        await expect(page).not.toHaveURL(FORGOT_URL);
    });

    test('should display the back button', async ({ page }) => {
        await expect(page.locator('main button').first()).toBeVisible();
    });

    test('should navigate to the login page when the back button is clicked', async ({ page }) => {
        await page.locator('main button').first().click();
        await expect(page).toHaveURL(LOGIN_URL);
    });

    // Language switcher

    test('should display the EN language button active by default', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('should display the Arabic language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'العربية' })).toBeVisible();
    });

    test('should switch to Arabic (RTL) when the Arabic button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'العربية' }).click();
        await page.getByRole('button', { name: 'العربية' }).waitFor({ state: 'visible', timeout: 15000 });
        await expect(page.getByRole('button', { name: 'العربية' })).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
    });

    test('should switch back to English when EN is clicked after Arabic', async ({ page }) => {
        await page.getByRole('button', { name: 'العربية' }).click();
        await page.getByRole('button', { name: 'العربية' }).waitFor({ state: 'visible', timeout: 15000 });
        await page.getByRole('button', { name: 'EN' }).click();
        await page.getByRole('button', { name: 'EN' }).waitFor({ state: 'visible', timeout: 15000 });
        await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
    });

    // Theme toggle

    test('should display the theme toggle button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();
    });

    test('should change the page theme when the theme toggle is clicked', async ({ page }) => {
        const html   = page.locator('html');
        const before = await html.getAttribute('class');
        await page.getByRole('button', { name: 'Switch theme' }).click();
        await expect(html).not.toHaveAttribute('class', before ?? '');
    });

    // Heading & text

    test('should display the "Forgot password" eyebrow text', async ({ page }) => {
        await expect(page.getByText('Forgot password')).toBeVisible();
    });

    test('should display the "Welcome to MJD Pay" heading', async ({ page }) => {
        await expect(page.getByText('Welcome to MJD Pay')).toBeVisible();
    });

    // Fields

    test('should have the Company number field visible and enabled', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Company number' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Company number' })).toBeEnabled();
    });

    test('should accept and retain alphanumeric input in the Company number field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await expect(page.getByRole('textbox', { name: 'Company number' })).toHaveValue(VALID_COMPANY);
    });

    test('should display the +966 country code prefix on the Mobile number field', async ({ page }) => {
        await expect(page.locator('.floating-prefix')).toContainText('(+966)');
    });

    test('should display the Saudi flag icon on the Mobile number field', async ({ page }) => {
        await expect(page.locator('.floating-prefix img, .floating-prefix .flag, [class*="flag"]').first()).toBeVisible();
    });

    test('should have the Mobile number field visible and enabled', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toBeEnabled();
    });

    test('should accept and retain a valid 9-digit mobile number', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toHaveValue(VALID_MOBILE);
    });

    // Next button & submission

    test('should enable the Next button when both Company and Mobile fields are filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
    });

    test('should navigate to the change-password URL after submitting valid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(/change-password/, { timeout: 15000 });
    });

    test('should show the New Password field after step 1 succeeds', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page.getByRole('textbox', { name: 'New Password' })).toBeVisible({ timeout: 15000 });
    });

    test('should show the Confirm Password field after step 1 succeeds', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible({ timeout: 15000 });
    });

    test('should hide the step-1 fields after step 1 succeeds', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page.getByRole('textbox', { name: 'New Password' })).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('textbox', { name: 'Company number' })).not.toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).not.toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: MOBILE NUMBER VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 1: Mobile Number Validation', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(FORGOT_URL).origin });
        await gotoForgotPassword(page);
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
    });

    // Format blocking

    test('should keep Next button disabled when mobile is too short', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('5123');
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should keep Next button disabled when mobile has a leading zero', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('0500021788');
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    // Character filtering

    test('should not accept alphabetic characters in the mobile field', async ({ page }) => {
        const mobileInput = page.getByRole('textbox', { name: 'Mobile number' });
        await mobileInput.pressSequentially('abc');
        await expect(mobileInput).toHaveValue('');
    });

    test('should not accept special characters in the mobile field', async ({ page }) => {
        const mobileInput = page.getByRole('textbox', { name: 'Mobile number' });
        await mobileInput.pressSequentially('!@#');
        await expect(mobileInput).toHaveValue('');
    });

    // Valid format

    test('should enable Next button with a valid 9-digit mobile starting with 5', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500021788');
        await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: NEGATIVE SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 1: Negative Scenarios', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await abortUnmockedGatewayRequests(page);
        await mockOtpDisabled(page);
        await mockForgetPasswordFailure(page);
        await gotoForgotPassword(page);
    });

    // Button disabled states

    test('should have the Next button disabled when both fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should have the Next button disabled when only Company number is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should have the Next button disabled when only Mobile number is filled', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should disable the Next button again after clearing the Company number field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
        await page.getByRole('textbox', { name: 'Company number' }).clear();
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('should disable the Next button again after clearing the Mobile number field', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
        await page.getByRole('textbox', { name: 'Mobile number' }).clear();
        await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    // Failed submission

    test('should remain on the forgot-password page after submitting invalid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
    });

    test('should display a toast error notification after submitting invalid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await assertToast(page);
    });

    test('should preserve the Company number field value after a failed submission', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await expect(page.getByRole('textbox', { name: 'Company number' })).toHaveValue('INVALID');
    });

    test('should preserve the Mobile number field value after a failed submission', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await expect(page.getByRole('textbox', { name: 'Mobile number' })).toHaveValue('500000000');
    });

    test('should not advance to step 2 when the API rejects the credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await assertToast(page);
        await expect(page.getByRole('textbox', { name: 'New Password' })).not.toBeVisible({ timeout: 5000 });
    });

    test('should not display the OTP dialog when credentials are rejected', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await assertToast(page);
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
    });

    test('should keep the step-1 heading and eyebrow visible after a failed submission', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await expect(page.getByText('Welcome to MJD Pay')).toBeVisible();
        await expect(page.getByText('Forgot password')).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 1: Edge Cases', () => {
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

    test('should strip non-digit formatting characters (spaces and dashes) from the Mobile field', async ({ page }) => {
        const mobileInput = page.getByRole('textbox', { name: 'Mobile number' });
        await mobileInput.pressSequentially('500-318-143');
        const value = await mobileInput.inputValue();
        expect(value).not.toContain('-');
        expect(value).not.toContain(' ');
    });

    test('should not crash the page when Company number is an extremely long string', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('A'.repeat(200));
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
        await expect(page).toHaveURL(FORGOT_URL);
    });

    test('should not crash when Mobile number is pasted as an extremely long string', async ({ page }) => {
        const mobileInput = page.getByRole('textbox', { name: 'Mobile number' });
        await mobileInput.fill('5'.repeat(50));
        await expect(page).toHaveURL(FORGOT_URL);
    });

    test('should keep the theme intact after a language switch', async ({ page }) => {
        const themeBtn = page.locator('#text_toggleButton');
        await themeBtn.click();
        await expect(themeBtn).toHaveClass(/dark/);
        await page.getByRole('button', { name: 'العربية' }).click();
        await page.getByRole('button', { name: 'العربية' }).waitFor({ state: 'visible', timeout: 10000 });
        await expect(themeBtn).toHaveClass(/dark/);
    });

    test.skip('should submit step 1 when Enter is pressed in the Mobile field', async ({ page }) => {
        await mockForgetPasswordSuccess(page);
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('textbox', { name: 'Mobile number' }).press('Enter');
        await expect(page).toHaveURL(/change-password/, { timeout: 15000 });
    });

    test('should not send duplicate API requests when Next is double-clicked', async ({ page }) => {
        let requestCount = 0;
        await page.route('**/auth/passwords/forget', async route => {
            requestCount++;
            await new Promise(r => setTimeout(r, 2000));
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }).catch(() => {});
        });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).dblclick();
        await page.waitForURL(/change-password/, { timeout: 10000 });
        expect(requestCount).toBe(1);
    });

    test('should show a loading spinner on the Next button while the API request is in flight', async ({ page }) => {
        await page.route('**/auth/passwords/forget', async route => {
            await new Promise(r => setTimeout(r, 1000));
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(
            page.locator('mat-spinner, .mat-progress-spinner, [class*="spinner"], [class*="loading"]').first()
        ).toBeVisible({ timeout: 3000 });
    });

    test('should not alter a validly formatted company number (no trimming or transformation)', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await expect(page.getByRole('textbox', { name: 'Company number' })).toHaveValue(VALID_COMPANY);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: SECURITY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot Password — Step 1: Security', () => {
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

    test('should not execute a script payload entered in the Mobile number field', async ({ page }) => {
        let dialogTriggered = false;
        page.on('dialog', async dialog => { dialogTriggered = true; await dialog.dismiss(); });
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).pressSequentially('<script>alert(1)</script>');
        expect(dialogTriggered).toBe(false);
    });

    test('should treat SQL-injection-style Company number input as an invalid credential and not crash the page', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill("' OR '1'='1");
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(FORGOT_URL, { timeout: 10000 });
        await assertToast(page);
    });

    test('should not expose technical details (stack trace, SQL, DB errors) in the error toast', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('INVALID');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill('500000000');
        await page.getByRole('button', { name: 'Next' }).click();
        const detail = page.locator('.toast-snackbar__detail');
        await expect(detail).toBeVisible({ timeout: 10000 });
        const text = await detail.textContent() ?? '';
        expect(text).not.toMatch(/stack|exception|sql|database|null pointer|traceback|internal server error/i);
    });

    test('should not expose the New Password form when the change-password URL is opened directly without completing step 1', async ({ page }) => {
        await page.goto(FORGOT_URL.replace('forgot-password', 'change-password'), { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(page.getByRole('textbox', { name: 'New Password' })).not.toBeVisible({ timeout: 10000 });
    });

    test('should send the credential-check request as POST with data in the body, not the URL', async ({ page }) => {
        let capturedUrl    = '';
        let capturedMethod = '';
        page.on('request', req => {
            if (req.url().includes('/auth/passwords/forget')) {
                capturedUrl    = req.url();
                capturedMethod = req.method();
            }
        });
        await mockForgetPasswordSuccess(page);
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL(/change-password/, { timeout: 15000 });
        expect(capturedMethod).toBe('POST');
        expect(capturedUrl).not.toContain(VALID_COMPANY);
        expect(capturedUrl).not.toContain(VALID_MOBILE);
    });

    test('should give a generic error and not reveal whether the company or mobile number was the invalid part', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill('WRONGCOMPANY');
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();
        const detail = page.locator('.toast-snackbar__detail');
        await expect(detail).toBeVisible({ timeout: 10000 });
        const text = await detail.textContent() ?? '';
        expect(text).not.toMatch(/company number (is )?(invalid|not found|does not exist)/i);
        expect(text).not.toMatch(/mobile (number )?(is )?(invalid|not found|does not exist)/i);
    });
});
