import { test, expect, Page, chromium, type Browser } from '@playwright/test';
import { goToInfoStep } from './helpers';

test.describe('Registration â€“ Info Page', () => {
    test.describe.configure({ mode: 'serial' });

    let browser: Browser;
    let page: Page;

    test.beforeAll(async () => {
        browser = await chromium.launch();
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        page = await context.newPage();
        await goToInfoStep(page);
    }, 120_000);

    test.afterAll(async () => {
        await page.close();
        await browser.close();
    });

    // â”€â”€ Page content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the registration info form heading', async () => {
        await expect(page.getByText('Tell us about your business')).toBeVisible();
    });

    // â”€â”€ CRN field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the CRN field label', async () => {
        await expect(page.getByText('unified number').first()).toBeVisible();
    });

    test('should display the CRN input', async () => {
        await expect(page.getByRole('textbox', { name: 'unified number' })).toBeVisible();
    });

    // â”€â”€ Iqama field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Iqama field label', async () => {
        await expect(page.getByText('National ID/Iqama').first()).toBeVisible();
    });

    test('should display the Iqama input', async () => {
        await expect(page.getByRole('textbox', { name: 'National ID/Iqama' })).toBeVisible();
    });

    // â”€â”€ Email field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Email field label', async () => {
        await expect(page.getByText(/Email/i).first()).toBeVisible();
    });

    test('should display the Email input', async () => {
        await expect(page.getByRole('textbox', { name: /Email/i })).toBeVisible();
    });

    // â”€â”€ Profile Type radio group â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Profile Type options', async () => {
        await expect(page.getByRole('radiogroup', { name: 'Profile Type' })).toBeVisible();
    });

    // â”€â”€ Next / Submit button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
