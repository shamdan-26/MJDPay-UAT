import { test, expect, Page } from '@playwright/test';

const env            = process.env['ENV'] ?? 'dev';
const BASE_URL       = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
const URL            = `${BASE_URL}/business/auth/login`;
const VALID_COMPANY  = process.env['UAT_COMPANY'] ?? 'L3999';
const VALID_MOBILE   = process.env['UAT_MOBILE']  ?? '500318143';
const VALID_PASSWORD = process.env['UAT_PASSWORD'] ?? 'Aa#1234567';

async function fillAndSubmitLogin(page: Page) {
    await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
    await page.locator('input[aria-label="Password"]').click();
    await page.locator('input[aria-label="Password"]').pressSequentially(VALID_PASSWORD, { delay: 50 });
    if (env === 'dev') {
        await page.locator('#btn_login').click();
    } else {
        await page.getByRole('button', { name: 'Log In' }).click();
    }

}

test.describe('Login Validation Popup', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: BASE_URL });
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });

    // ── Popup appearance ──────────────────────────────────────────────────────

    test('should show the validation popup after submitting valid credentials', async ({ page }) => {
        await fillAndSubmitLogin(page);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 10000 });
    });

    test('should show the popup subtitle text', async ({ page }) => {
        await fillAndSubmitLogin(page);
        await expect(page.getByText("We're preparing a secure session for this device.")).toBeVisible({ timeout: 10000 });
    });

    test('should NOT show the validation popup when login fails with wrong password', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.locator('input[aria-label="Password"]').fill('WrongPass@99');
        await page.getByRole('button', { name: 'Log In' }).click();
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 5000 });
    });

    // ── Three steps visibility ────────────────────────────────────────────────

    test('should display all three validation steps', async ({ page }) => {
        await fillAndSubmitLogin(page);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Verifying your credentials')).toBeVisible();
        await expect(page.getByText('Preparing this device')).toBeVisible();
        await expect(page.getByText('Securing your session')).toBeVisible();
    });

    test('should show step 1 "Verifying your credentials"', async ({ page }) => {
        await fillAndSubmitLogin(page);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Verifying your credentials')).toBeVisible();
    });

    test('should show step 2 "Preparing this device"', async ({ page }) => {
        await fillAndSubmitLogin(page);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Preparing this device')).toBeVisible();
    });

    test('should show step 3 "Securing your session"', async ({ page }) => {
        await fillAndSubmitLogin(page);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Securing your session')).toBeVisible();
    });

    // ── Step completion (sequential checkmarks) ───────────────────────────────

    test('should mark step 1 as complete with a checkmark before step 3 finishes', async ({ page }) => {
        await fillAndSubmitLogin(page);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 10000 });
        // Step 1 completes first — its checkmark icon should appear
        const step1 = page.locator('li, div').filter({ hasText: 'Verifying your credentials' });
        await expect(step1.locator('svg, [class*="check"], [class*="success"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('should mark step 2 as complete with a checkmark before step 3 finishes', async ({ page }) => {
        await fillAndSubmitLogin(page);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 10000 });
        const step2 = page.locator('li, div').filter({ hasText: 'Preparing this device' });
        await expect(step2.locator('svg, [class*="check"], [class*="success"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show a spinner on step 3 while it is in progress', async ({ page }) => {
        await fillAndSubmitLogin(page);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 10000 });
        // At some point during the flow, step 3 shows a spinner
        const step3 = page.locator('li, div').filter({ hasText: 'Securing your session' });
        await expect(step3.locator('[class*="spin"], [class*="loader"], circle').first()).toBeVisible({ timeout: 5000 });
    });

    // ── Popup dismissal / transition ──────────────────────────────────────────

    test('should dismiss the popup and proceed to OTP after all steps complete', async ({ page }) => {
        await fillAndSubmitLogin(page);
        await expect(page.getByText('Just a moment...')).toBeVisible({ timeout: 10000 });
        // Popup should disappear once all steps are done
        await expect(page.getByText('Just a moment...')).not.toBeVisible({ timeout: 20000 });
        // Should have navigated away from login page (towards OTP)
        await expect(page).not.toHaveURL(URL);
    });
});
