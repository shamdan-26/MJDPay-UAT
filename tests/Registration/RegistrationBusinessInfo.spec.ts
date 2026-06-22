import { test, expect } from '@playwright/test';
import { generateFreshKSAMobile, fillOTP, REGISTER_URL } from './helpers';

const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';

async function goToBusinessInfoStep(page: any, context: any) {
    await context.grantPermissions(['geolocation'], { origin: BASE_URL });
    await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Step 1 – enter a fresh mobile number not previously registered
    const mobileInput = page.getByRole('textbox', { name: /mobile number/i });
    await mobileInput.waitFor({ state: 'visible', timeout: 10000 });
    await mobileInput.fill(generateFreshKSAMobile());
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(3000);

    // Step 2 – OTP is optional based on system configuration
    const otpVisible = await page.getByRole('heading', { name: /enter otp/i })
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => true)
        .catch(() => false);

    if (otpVisible) {
        await page.getByRole('textbox', { name: /one time password input/i }).first().waitFor({ state: 'visible', timeout: 10000 });
        await fillOTP(page, '000000');
        const verifyBtn = page.getByRole('button', { name: 'Verify' });
        if (await verifyBtn.isVisible().catch(() => false)) {
            await verifyBtn.click();
        }
    }

    // Wait for Business Info step
    await page.getByRole('textbox', { name: /email/i }).waitFor({ state: 'visible', timeout: 15000 });
}

test.describe('Registration – Business Info Step (Tab 1 of 3)', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await goToBusinessInfoStep(page, context);
    });

    // ── Step header ───────────────────────────────────────────────────────────

    test('should display the "Create Account" heading', async ({ page }) => {
        await expect(page.getByText('Create Account')).toBeVisible();
    });

    test('should display the "Tell us about your business" sub-heading', async ({ page }) => {
        await expect(page.getByText(/tell us about your business/i)).toBeVisible();
    });

    test('should display the step indicator "Step 1 of 3"', async ({ page }) => {
        await expect(page.getByText(/step 1 of 3/i)).toBeVisible();
    });

    test('should display the progress tabs: Business Info, Financial & Business, Verification & Uploads', async ({ page }) => {
        await expect(page.getByRole('tab', { name: /business info/i })).toBeVisible();
        await expect(page.getByRole('tab', { name: /financial/i })).toBeVisible();
        await expect(page.getByRole('tab', { name: /verification/i })).toBeVisible();
    });

    // ── Profile Type ──────────────────────────────────────────────────────────

    test('should display the Profile Type field', async ({ page }) => {
        await expect(page.getByText('Profile Type')).toBeVisible();
    });

    test('should display the Merchant option with description', async ({ page }) => {
        await expect(page.getByText('Merchant')).toBeVisible();
        await expect(page.getByText(/accept payments/i)).toBeVisible();
    });

    test('should display the Biller option with description', async ({ page }) => {
        await expect(page.getByText('Biller')).toBeVisible();
        await expect(page.getByText(/issue and collect bills/i)).toBeVisible();
    });

    test('should allow selecting Merchant profile type', async ({ page }) => {
        await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
        await expect(page.getByRole('radio').filter({ hasText: /merchant/i })).toBeChecked();
    });

    test('should allow selecting Biller profile type', async ({ page }) => {
        await page.getByRole('radio').filter({ hasText: /biller/i }).click();
        await expect(page.getByRole('radio').filter({ hasText: /biller/i })).toBeChecked();
    });

    test('should only allow one profile type to be selected at a time', async ({ page }) => {
        await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
        await page.getByRole('radio').filter({ hasText: /biller/i }).click();
        await expect(page.getByRole('radio').filter({ hasText: /merchant/i })).not.toBeChecked();
        await expect(page.getByRole('radio').filter({ hasText: /biller/i })).toBeChecked();
    });

    // ── Unified Number ────────────────────────────────────────────────────────

    test('should display the Unified Number field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /unified number/i })).toBeVisible();
    });

    test('should show the correct placeholder for Unified Number', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /unified number/i }))
            .toHaveAttribute('placeholder', /1023456789/i);
    });

    test('should accept input in the Unified Number field', async ({ page }) => {
        await page.getByRole('textbox', { name: /unified number/i }).fill('1023456789');
        await expect(page.getByRole('textbox', { name: /unified number/i })).toHaveValue('1023456789');
    });

    // ── National ID / Iqama ───────────────────────────────────────────────────

    test('should display the National ID/Iqama field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /national id|iqama/i })).toBeVisible();
    });

    test('should show the correct placeholder for National ID/Iqama', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /national id|iqama/i }))
            .toHaveAttribute('placeholder', /1012345678/i);
    });

    test('should accept input in the National ID/Iqama field', async ({ page }) => {
        await page.getByRole('textbox', { name: /national id|iqama/i }).fill('1012345678');
        await expect(page.getByRole('textbox', { name: /national id|iqama/i })).toHaveValue('1012345678');
    });

    // ── Email ─────────────────────────────────────────────────────────────────

    test('should display the Email field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    });

    test('should show the correct placeholder for Email', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /email/i }))
            .toHaveAttribute('placeholder', /example@email\.com/i);
    });

    test('should accept a valid email address', async ({ page }) => {
        await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
        await expect(page.getByRole('textbox', { name: /email/i })).toHaveValue('test@example.com');
    });

    test('should show a validation error for an invalid email format', async ({ page }) => {
        await page.getByRole('textbox', { name: /email/i }).fill('notanemail');
        await page.getByRole('button', { name: /next/i }).click();
        await expect(page.locator('[class*="error"], [role="alert"]').first()).toBeVisible({ timeout: 5000 });
    });

    // ── Next button ───────────────────────────────────────────────────────────

    test('should display the Next button', async ({ page }) => {
        await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
    });

    test('should keep Next disabled when required fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    test('should enable Next when all required fields are filled', async ({ page }) => {
        await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
        await page.getByRole('textbox', { name: /unified number/i }).fill('1023456789');
        await page.getByRole('textbox', { name: /national id|iqama/i }).fill('1012345678');
        await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
        await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
    });

    test('should proceed to the Financial & Business step when Next is clicked with valid data', async ({ page }) => {
        await page.getByRole('radio').filter({ hasText: /merchant/i }).click();
        await page.getByRole('textbox', { name: /unified number/i }).fill('1023456789');
        await page.getByRole('textbox', { name: /national id|iqama/i }).fill('1012345678');
        await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
        await page.getByRole('button', { name: /next/i }).click();
        await expect(page.getByRole('tab', { name: /financial/i })).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    });

    // ── Footer links ──────────────────────────────────────────────────────────

    test('should display "Already have an account?" text', async ({ page }) => {
        await expect(page.getByText(/already have an account/i)).toBeVisible();
    });

    test('should display the Log In link', async ({ page }) => {
        await expect(page.getByRole('link', { name: /log in/i }).or(page.getByText('Log In'))).toBeVisible();
    });

    test('should display Terms & Conditions link', async ({ page }) => {
        await expect(page.getByText(/terms & conditions/i)).toBeVisible();
    });

    test('should display Privacy Policy link', async ({ page }) => {
        await expect(page.getByText(/privacy policy/i)).toBeVisible();
    });
});
