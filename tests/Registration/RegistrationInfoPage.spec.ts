import { test, expect, Page } from '@playwright/test';
import {
    REGISTER_URL,
    generateKSAMobile,
    fillOTP,
} from './helpers';

test.describe('Registration – Info Page', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
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

    // ── Page content ──────────────────────────────────────────────────────────

    test('should display the registration info form heading', async () => {
        await expect(page.getByText('Tell us about your business')).toBeVisible();
    });

    // ── CRN field ─────────────────────────────────────────────────────────────

    test('should display the CRN field label', async () => {
        await expect(page.getByText('unified number').first()).toBeVisible();
    });

    test('should display the CRN input', async () => {
        await expect(page.getByRole('textbox', { name: 'unified number' })).toBeVisible();
    });

    // ── Iqama field ───────────────────────────────────────────────────────────

    test('should display the Iqama field label', async () => {
        await expect(page.getByText('National ID/Iqama').first()).toBeVisible();
    });

    test('should display the Iqama input', async () => {
        await expect(page.getByRole('textbox', { name: 'National ID/Iqama' })).toBeVisible();
    });

    // ── Email field ───────────────────────────────────────────────────────────

    test('should display the Email field label', async () => {
        await expect(page.getByText(/Email/i).first()).toBeVisible();
    });

    test('should display the Email input', async () => {
        await expect(page.getByRole('textbox', { name: /Email/i })).toBeVisible();
    });

    // ── Profile Type radio group ──────────────────────────────────────────────

    test('should display the Profile Type options', async () => {
        await expect(page.getByRole('radiogroup', { name: 'Profile Type' })).toBeVisible();
    });

    // ── Next / Submit button ──────────────────────────────────────────────────

    test('should display the Next button', async () => {
        await expect(
            page.getByRole('button', { name: /next|submit|continue/i }).first()
        ).toBeVisible();
    });

    test('should have the Next button disabled when required fields are empty', async () => {
        await expect(
            page.getByRole('button', { name: /next|submit|continue/i }).first()
        ).toBeDisabled();
    });
});
