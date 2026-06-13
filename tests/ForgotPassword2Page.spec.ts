import { test, expect } from '@playwright/test';

const FORGOT_URL = 'https://uat.majdpay.com/business/auth/forgot-password';
const VALID_COMPANY = 'L3999';
const VALID_MOBILE  = '500318143';

const SUBMIT_BUTTON = 'Save';

test.describe('Forgot Password - Step 2 (New Password)', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        // Grant geolocation and navigate to step 1
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });

        // Mock the forgot-password API to bypass device-fingerprint check in UAT
        await page.route('**/auth/passwords/forget', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );

        await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Fill step 1 and proceed to step 2
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();

        // Wait for step 2 to appear (new password field)
        await page.waitForSelector('input[placeholder="Insert Password"]', { timeout: 15000 });
    });

    // ── Page elements ─────────────────────────────────────────────────────────

    test('should display the New Password field', async ({ page }) => {
        await expect(page.locator('input[placeholder="Insert Password"]')).toBeVisible();
    });

    test('should display the Confirm Password field', async ({ page }) => {
        await expect(page.locator('input[placeholder="Confirm Password"]')).toBeVisible();
    });

    test('should have New Password field masked by default', async ({ page }) => {
        await expect(page.locator('input[placeholder="Insert Password"]')).toHaveAttribute('type', 'password');
    });

    test('should have Confirm Password field masked by default', async ({ page }) => {
        await expect(page.locator('input[placeholder="Confirm Password"]')).toHaveAttribute('type', 'password');
    });

    test('should display the submit button', async ({ page }) => {
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeVisible();
    });

    // ── Show / hide password toggles ──────────────────────────────────────────

    test('should reveal New Password when show toggle is clicked', async ({ page }) => {
        const newPassInput = page.locator('input[placeholder="Insert Password"]');
        await newPassInput.fill('Aa#1234567');
        const toggle = newPassInput.locator('..').locator('button');
        await toggle.click();
        await expect(newPassInput).toHaveAttribute('type', 'text');
    });

    test('should reveal Confirm Password when show toggle is clicked', async ({ page }) => {
        const confirmInput = page.locator('input[placeholder="Confirm Password"]');
        await confirmInput.fill('Aa#1234567');
        const toggle = confirmInput.locator('..').locator('button');
        await toggle.click();
        await expect(confirmInput).toHaveAttribute('type', 'text');
    });

    // ── Button state ──────────────────────────────────────────────────────────

    test('should keep submit button disabled when both fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should keep submit button disabled when only New Password is filled', async ({ page }) => {
        await page.locator('input[placeholder="Insert Password"]').fill('Aa#1234567');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should keep submit button disabled when only Confirm Password is filled', async ({ page }) => {
        await page.locator('input[placeholder="Confirm Password"]').fill('Aa#1234567');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeDisabled();
    });

    test('should enable submit button when both passwords match', async ({ page }) => {
        await page.locator('input[placeholder="Insert Password"]').fill('Aa#1234567');
        await page.locator('input[placeholder="Confirm Password"]').fill('Aa#1234567');
        await expect(page.getByRole('button', { name: SUBMIT_BUTTON })).toBeEnabled();
    });

    // ── Password validation ───────────────────────────────────────────────────

    test('should show an error or keep button disabled when passwords do not match', async ({ page }) => {
        await page.locator('input[placeholder="Insert Password"]').fill('Aa#1234567');
        await page.locator('input[placeholder="Confirm Password"]').fill('DifferentPass#1');
        const submitBtn = page.getByRole('button', { name: SUBMIT_BUTTON });
        const isDisabled = await submitBtn.isDisabled();
        if (!isDisabled) {
            await submitBtn.click();
            // Should either stay on the same view or show a validation error
            await expect(page.locator('body')).not.toContainText('success');
        } else {
            await expect(submitBtn).toBeDisabled();
        }
    });

    test('should accept input in the New Password field', async ({ page }) => {
        await page.locator('input[placeholder="Insert Password"]').fill('Aa#1234567');
        await expect(page.locator('input[placeholder="Insert Password"]')).toHaveValue('Aa#1234567');
    });

    test('should accept input in the Confirm Password field', async ({ page }) => {
        await page.locator('input[placeholder="Confirm Password"]').fill('Aa#1234567');
        await expect(page.locator('input[placeholder="Confirm Password"]')).toHaveValue('Aa#1234567');
    });

    // ── OTP popup ─────────────────────────────────────────────────────────────

    test('should open the OTP popup when submit is clicked with matching passwords', async ({ page }) => {
        await page.locator('input[placeholder="Insert Password"]').fill('Aa#1234567');
        await page.locator('input[placeholder="Confirm Password"]').fill('Aa#1234567');
        await page.getByRole('button', { name: SUBMIT_BUTTON }).click();
        // OTP popup should appear — adjust the selector to match the actual OTP dialog
        await expect(page.locator('[role="dialog"], .otp-popup, [class*="otp"], [class*="modal"]').first()).toBeVisible({ timeout: 10000 });
    });

});
