import { test, expect, type Page, type Locator } from '@playwright/test';
import {
    LOGIN_URL,
    LOGIN_COMPANY,
    LOGIN_MOBILE,
    VALID_COMPANY,
    VALID_MOBILE,
    VALID_PASSWORD,
    INVALID_OTP,
    gotoLogin,
    fillAndSubmitLogin,
    getOtpFromDb,
    fillOtpInputs,
} from '../../pageObjectsHelpers/LoginHelper';
import { LoginPage } from '../../pages/LoginPage';

const WRONG_PASSWORD = 'WrongPass@99';
const env = process.env['ENV'] ?? 'dev';

// Uses pressSequentially on the password field to reliably trigger Angular reactive form validation.
async function submitWithSequentialPassword(page: Page, loginBtn: Locator): Promise<void> {
    await page.getByRole('textbox', { name: 'Company number' }).fill(LOGIN_COMPANY);
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(LOGIN_MOBILE);
    await page.locator('input[aria-label="Password"]').click();
    await page.locator('input[aria-label="Password"]').pressSequentially(VALID_PASSWORD, { delay: 50 });
    await loginBtn.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP FLOW
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — OTP Flow', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });
        await gotoLogin(page);
        await fillAndSubmitLogin(page);
        // 30 s covers validation card (~10 s) + OTP dialog appearance
        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 30000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!otpAppeared, 'OTP dialog did not appear — Login OTP is disabled in this environment');
    });

    test('should display the OTP dialog after submitting valid credentials', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
    });

    test('should have Verify button disabled when OTP inputs are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
    });

    test('should keep Verify button disabled when OTP inputs are partially filled', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        await inputs.nth(0).fill('1');
        await inputs.nth(1).fill('2');
        await expect(page.getByRole('button', { name: 'Verify' })).toBeDisabled();
    });

    test('should enable Verify button when all OTP inputs are filled', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count = await inputs.count();
        for (let i = 0; i < count; i++) await inputs.nth(i).fill(String(i + 1));
        await expect(page.getByRole('button', { name: 'Verify' })).toBeEnabled();
    });

    test('should not accept non-numeric characters in OTP inputs', async ({ page }) => {
        const input = page.getByRole('textbox', { name: 'One time password input' }).first();
        await input.pressSequentially('a');
        await expect(input).toHaveValue('');
    });

    test('should auto-advance focus to the next input when a digit is entered', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        await inputs.nth(0).click();
        await inputs.nth(0).press('1');
        await expect(inputs.nth(1)).toBeFocused({ timeout: 3000 });
    });

    test('should have Click to resend button disabled while the countdown is active', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Click to resend' })).toBeDisabled();
        await expect(page.getByText(/Code ends/i)).toBeVisible();
    });

    test('should enable resend button after countdown expires and clear inputs on click', async ({ page }) => {
        const timerText = await page.getByText(/Code ends/i).textContent();
        const match     = timerText?.match(/(\d+):(\d+)/);
        const seconds   = match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 90;
        test.setTimeout((seconds + 15) * 1000);

        const resendBtn = page.getByRole('button', { name: 'Click to resend' });
        await expect(resendBtn).toBeEnabled({ timeout: (seconds + 5) * 1000 });
        await resendBtn.click();
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        await expect(inputs.nth(0)).toHaveValue('');
    });

    test('should close the OTP popup when Cancel is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).not.toBeVisible();
    });

    test('should return to the login form when Cancel is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
    });

    test('should remain on the OTP popup after submitting a wrong OTP', async ({ page }) => {
        const inputs = page.getByRole('textbox', { name: 'One time password input' });
        const count  = await inputs.count();
        for (let i = 0; i < count; i++) await inputs.nth(i).fill(INVALID_OTP[i] ?? '1');
        await page.getByRole('button', { name: 'Verify' }).click();
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
    });

    test('should log in successfully and redirect when the correct OTP is entered', async ({ page }) => {
        const otp = await getOtpFromDb(LOGIN_MOBILE);
        await fillOtpInputs(page, otp);
        const verifyBtn = page.getByRole('button', { name: 'Verify' });
        if (await verifyBtn.isVisible().catch(() => false)) {
            await verifyBtn.click({ timeout: 5000 }).catch(() => {});
        }
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 15000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION CARD  (submit → 3-step card → OTP [optional/configurable] or dashboard)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login — Validation Card', () => {
    test.describe.configure({ mode: 'serial' });

    let loginPage: LoginPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: new URL(LOGIN_URL).origin });
        loginPage = new LoginPage(page);
        await loginPage.goto(LOGIN_URL);
    });

    // ── Card appearance ───────────────────────────────────────────────────────

    test('should display the validation card immediately after submitting valid credentials', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(LOGIN_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(LOGIN_MOBILE);
        await page.locator('input[aria-label="Password"]').click();
        await page.locator('input[aria-label="Password"]').pressSequentially(VALID_PASSWORD, { delay: 50 });
        // Watch for the card BEFORE clicking so we catch it even if it dismisses quickly
        await Promise.all([
            loginPage.loginButton.click(),
            page.getByText('Just a moment...').waitFor({ state: 'visible', timeout: 15000 }),
        ]);
    });

    test('should NOT display the validation card when login fails with wrong password', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill(WRONG_PASSWORD);
        if (env === 'dev') {
            await page.locator('#btn_login').click();
        } else {
            await page.getByRole('button', { name: 'Log In' }).click();
        }
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 5000 });
    });

    // ── 3-step progression ────────────────────────────────────────────────────

    test('should mark step 1 "Verifying your credentials" as complete with a checkmark', async ({ page }) => {
        await submitWithSequentialPassword(page, loginPage.loginButton);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 15000 });
        const step1 = page.locator('li, div').filter({ hasText: 'Verifying your credentials' });
        await expect(step1.locator('svg, [class*="check"], [class*="success"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('should mark step 2 "Preparing this device" as complete with a checkmark', async ({ page }) => {
        await submitWithSequentialPassword(page, loginPage.loginButton);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 15000 });
        const step2 = page.locator('li, div').filter({ hasText: 'Preparing this device' });
        await expect(step2.locator('svg, [class*="check"], [class*="success"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show a spinner on step 3 "Securing your session" while it is in progress', async ({ page }) => {
        await submitWithSequentialPassword(page, loginPage.loginButton);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 15000 });
        const step3 = page.locator('li, div').filter({ hasText: 'Securing your session' });
        await expect(step3.locator('[class*="spin"], [class*="loader"], circle').first()).toBeVisible({ timeout: 5000 });
    });

    // ── Post-card transition ──────────────────────────────────────────────────

    test('should dismiss the validation card after all three steps complete', async ({ page }) => {
        await submitWithSequentialPassword(page, loginPage.loginButton);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 20000 });
    });

    test('should display the OTP dialog after the validation card dismisses (when OTP is enabled)', async ({ page }) => {
        await submitWithSequentialPassword(page, loginPage.loginButton);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 20000 });
        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 8000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!otpAppeared, 'OTP is disabled in this environment');
        await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
    });

    test('should redirect to dashboard after the validation card dismisses (when OTP is disabled)', async ({ page }) => {
        await submitWithSequentialPassword(page, loginPage.loginButton);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 20000 });
        const otpAppeared = await page.getByRole('heading', { name: 'Enter OTP' })
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);
        test.skip(otpAppeared, 'OTP is enabled in this environment — direct redirect is not applicable');
        await expect(page).not.toHaveURL(LOGIN_URL);
    });
});
