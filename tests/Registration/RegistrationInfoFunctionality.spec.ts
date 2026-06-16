import { test, expect, Page } from '@playwright/test';
import {
    REGISTER_URL,
    VALID_EMAIL,
    generateKSAMobile,
    generateCRN,
    generateIqama,
    fillOTP,
} from './helpers';

test.describe('Registration – Info Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let crn: string;
    let iqama: string;

    test.beforeAll(async ({ browser }) => {
        crn   = generateCRN();
        iqama = generateIqama();
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        page = await context.newPage();
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.getByRole('textbox', { name: 'Mobile number' }).fill(generateKSAMobile());
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'next' }).click();

        await page.waitForTimeout(5000);
        await page.getByRole('heading', { name: 'Enter OTP' }).waitFor({ state: 'visible', timeout: 20000 });
        await page.getByRole('textbox', { name: 'One time password input' }).first()
            .waitFor({ state: 'visible', timeout: 10000 });
        await fillOTP(page);
        const verifyBtn = page.getByRole('button', { name: 'Verify' });
        await expect(verifyBtn).toBeEnabled({ timeout: 10000 });
        await verifyBtn.click();
        await page.waitForTimeout(3000);

        await page.getByText('Tell us about your business')
            .waitFor({ state: 'visible', timeout: 20000 });
    });

    test.afterAll(async () => {
        await page.close();
    });

    // ── CRN field ─────────────────────────────────────────────────────────────

    test('should accept a valid Saudi CRN', async () => {
        const input = page.getByRole('textbox', { name: 'unified number' });
        await input.fill(crn);
        await expect(input).toHaveValue(crn);
    });

    test('should reject a CRN shorter than 10 digits', async () => {
        const input = page.getByRole('textbox', { name: 'unified number' });
        await input.fill('101023456');
        await input.blur();
        await expect(page.locator('[class*="error"], [class*="invalid"], [id*="error"]').first())
            .toBeVisible({ timeout: 5000 });
    });

    test('should not allow more than 15 digits in the CRN field', async () => {
        const input = page.getByRole('textbox', { name: 'unified number' });
        await input.pressSequentially('10102345678');
        const value = await input.inputValue();
        expect(value.length).toBeLessThanOrEqual(15);
    });

    // ── Iqama field ───────────────────────────────────────────────────────────

    test('should accept a valid Iqama number', async () => {
        const input = page.getByRole('textbox', { name: 'National ID/Iqama' });
        await input.fill(iqama);
        await expect(input).toHaveValue(iqama);
    });

    test('should reject an Iqama shorter than 10 digits', async () => {
        const input = page.getByRole('textbox', { name: 'National ID/Iqama' });
        await input.fill('212345678');
        await input.blur();
        await expect(page.locator('[class*="error"], [class*="invalid"], [id*="error"]').first())
            .toBeVisible({ timeout: 5000 });
    });

    test('should not allow more than 10 digits in the Iqama field', async () => {
        const input = page.getByRole('textbox', { name: 'National ID/Iqama' });
        await input.pressSequentially('21234567890');
        const value = await input.inputValue();
        expect(value.length).toBeLessThanOrEqual(10);
    });

    // ── Email field ───────────────────────────────────────────────────────────

    test('should accept a valid email address', async () => {
        const input = page.getByRole('textbox', { name: /Email/i });
        await input.fill(VALID_EMAIL);
        await expect(input).toHaveValue(VALID_EMAIL);
    });

    test('should reject an invalid email format', async () => {
        const input = page.getByRole('textbox', { name: /Email/i });
        await input.fill('not-an-email');
        await input.blur();
        await expect(page.locator('[class*="error"], [class*="invalid"], [id*="error"]').first())
            .toBeVisible({ timeout: 5000 });
    });

    // ── Profile Type radio group ──────────────────────────────────────────────

    test('should be able to select a Profile Type option', async () => {
        const options = page.getByRole('radiogroup', { name: 'Profile Type' }).getByRole('radio');
        const count   = await options.count();
        const pick    = options.nth(Math.floor(Math.random() * count));
        await pick.click();
        await expect(pick).toBeChecked();
    });

    // ── Next / Submit button ──────────────────────────────────────────────────

    test('should enable Next button when all required fields are filled', async () => {
        const options = page.getByRole('radiogroup', { name: 'Profile Type' }).getByRole('radio');
        await options.nth(Math.floor(Math.random() * await options.count())).click();
        await page.getByRole('textbox', { name: 'unified number' }).fill(crn);
        await page.getByRole('textbox', { name: 'National ID/Iqama' }).fill(iqama);
        await page.getByRole('textbox', { name: /Email/i }).fill(VALID_EMAIL);
        await expect(
            page.getByRole('button', { name: 'next' })
        ).toBeEnabled({ timeout: 5000 });
    });
});
