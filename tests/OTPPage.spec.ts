import { test, expect } from '@playwright/test';

const FORGOT_URL    = 'https://uat.majdpay.com/business/auth/forgot-password';
const VALID_COMPANY = 'L3999';
const VALID_MOBILE  = '500318143';

test.describe('OTP Dialog - Change Password', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });

        // Mock step-1 API to bypass device-fingerprint check and reach the new-password page
        await page.route('**/auth/passwords/forget', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
        );

        await page.goto(FORGOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Step 1 – fill company and mobile, click Next
        await page.getByRole('textbox', { name: 'Company number' }).fill(VALID_COMPANY);
        await page.getByRole('textbox', { name: 'Mobile number' }).fill(VALID_MOBILE);
        await page.getByRole('button', { name: 'Next' }).click();

        // Step 2 – fill matching passwords and submit to trigger OTP dialog
        await page.getByRole('textbox', { name: 'New Password' }).waitFor({ state: 'visible', timeout: 15000 });
        await page.getByRole('textbox', { name: 'New Password' }).fill('Aa#1234567');
        await page.getByRole('textbox', { name: 'Confirm password' }).fill('Aa#1234567');
        await page.getByRole('button', { name: 'reset password' }).click();

        // Wait for the OTP dialog to appear
        await page.locator("//div[@class='my-modal-container']").waitFor({ state: 'visible', timeout: 15000 });
    });

    // ── Dialog elements ───────────────────────────────────────────────────────

    test('should display the OTP dialog', async ({ page }) => {
        await expect(page.locator("//div[@class='my-modal-container']")).toBeVisible();
    });

    test('should display the "Enter OTP" title', async ({ page }) => {
        await expect(page.locator("//div[@class='my-modal-container']").getByText('Enter OTP')).toBeVisible();
    });

    test('should display the instruction message', async ({ page }) => {
        await expect(page.locator("//div[@class='my-modal-container']").getByText('A Code Has Been Sent To You, In Order To Continue With The Change Password Process.')).toBeVisible();
    });

    test('should display 4 OTP input boxes', async ({ page }) => {
        const otpInputs = page.locator("//div[@class='my-modal-container']").locator('input');
        await expect(otpInputs).toHaveCount(4);
    });

    test('should display the countdown timer', async ({ page }) => {
        await expect(page.locator("//div[@class='my-modal-container']").getByText(/Code Ends/)).toBeVisible();
    });

    test('should display the resend option', async ({ page }) => {
        await expect(page.locator("//div[@class='my-modal-container']").getByText("Didn't Receive Code?")).toBeVisible();
        await expect(page.locator("//div[@class='my-modal-container']").getByText('Click to resend')).toBeVisible();
    });

    test('should display the Cancel button', async ({ page }) => {
        await expect(page.locator("//div[@class='my-modal-container']").getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('should display the Confirm button', async ({ page }) => {
        await expect(page.locator("//div[@class='my-modal-container']").getByRole('button', { name: 'Confirm' })).toBeVisible();
    });

    // ── OTP input ─────────────────────────────────────────────────────────────

    test('should accept input in the OTP boxes', async ({ page }) => {
        const inputs = page.locator("//div[@class='my-modal-container']").locator('input');
        await inputs.nth(0).fill('1');
        await inputs.nth(1).fill('2');
        await inputs.nth(2).fill('3');
        await inputs.nth(3).fill('4');
        await expect(inputs.nth(0)).toHaveValue('1');
        await expect(inputs.nth(3)).toHaveValue('4');
    });

    test('should keep Confirm button disabled when OTP boxes are empty', async ({ page }) => {
        await expect(page.locator("//div[@class='my-modal-container']").getByRole('button', { name: 'Confirm' })).toBeDisabled();
    });

    // ── Cancel ────────────────────────────────────────────────────────────────

    test('should close the OTP dialog when Cancel is clicked', async ({ page }) => {
        await page.locator("//div[@class='my-modal-container']").getByRole('button', { name: 'Cancel' }).click();
        await expect(page.locator("//div[@class='my-modal-container']")).not.toBeVisible();
    });

});
