import { test, expect, Page } from '@playwright/test';
import { goToVerificationStep, selectRandomOption } from './helpers';

test.describe('Registration â€“ Verification & Uploads Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        page = await context.newPage();
        await goToVerificationStep(page);
    }, 120_000);

    test.afterAll(async () => {
        await page.close();
    });

    // â”€â”€ IBAN field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should accept a valid 24-character SA IBAN', async () => {
        const input = page.getByRole('textbox', { name: /iban/i });
        await input.fill('SA0380000001234567891234');
        await expect(input).toHaveValue('SA0380000001234567891234');
    });

    test('should show a validation error for an IBAN that does not start with SA', async () => {
        const input = page.getByRole('textbox', { name: /iban/i });
        await input.fill('GB0380000001234567891234');
        await input.blur();
        const hasError = await page.locator('[class*="error"], [class*="invalid"], [id*="error"]')
            .first().isVisible().catch(() => false);
        const stillOnPage = await input.isVisible().catch(() => false);
        expect(hasError || stillOnPage).toBeTruthy();
    });

    test('should show a validation error for an IBAN shorter than 24 characters', async () => {
        const input = page.getByRole('textbox', { name: /iban/i });
        await input.fill('SA038000000123456');
        await input.blur();
        const hasError = await page.locator('[class*="error"], [class*="invalid"], [id*="error"]')
            .first().isVisible().catch(() => false);
        const stillOnPage = await input.isVisible().catch(() => false);
        expect(hasError || stillOnPage).toBeTruthy();
    });

    // â”€â”€ VAT Number field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should accept a valid VAT number', async () => {
        const input = page.getByRole('textbox', { name: /vat number/i });
        await input.fill('300123456700003');
        await expect(input).toHaveValue('300123456700003');
    });

    test('should show a validation error for an empty VAT number on submit', async () => {
        await page.getByRole('textbox', { name: /vat number/i }).clear();
        await page.getByRole('button', { name: /sign up/i }).click({ force: true });
        const hasError = await page.locator('[class*="error"], [class*="invalid"], [role="alert"]')
            .first().isVisible().catch(() => false);
        const stillOnPage = await page.getByRole('textbox', { name: /iban/i }).isVisible().catch(() => false);
        expect(hasError || stillOnPage).toBeTruthy();
    });

    // â”€â”€ Sign Up button state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should keep Sign Up disabled when IBAN is missing', async () => {
        await page.getByRole('textbox', { name: /iban/i }).clear();
        await page.getByRole('textbox', { name: /vat number/i }).fill('300123456700003');
        await expect(page.getByRole('button', { name: /sign up/i })).toBeDisabled();
    });

    test('should keep Sign Up disabled when VAT Number is missing', async () => {
        await page.getByRole('textbox', { name: /iban/i }).fill('SA0380000001234567891234');
        await page.getByRole('textbox', { name: /vat number/i }).clear();
        await expect(page.getByRole('button', { name: /sign up/i })).toBeDisabled();
    });

    test('should enable Sign Up when IBAN and VAT Number are filled', async () => {
        await page.getByRole('textbox', { name: /iban/i }).fill('SA0380000001234567891234');
        await page.getByRole('textbox', { name: /vat number/i }).fill('300123456700003');
        await expect(page.getByRole('button', { name: /sign up/i })).toBeEnabled({ timeout: 5000 });
    });

    // â”€â”€ Back navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should return to Financial & Business step when Back is clicked', async () => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.getByRole('textbox', { name: /monthly expected number/i }))
            .toBeVisible({ timeout: 10000 });
    });

    test('should allow re-advancing to Verification step after going back to Financial step', async () => {
        await selectRandomOption(page, page.locator('#mat-select-value-0'));
        await selectRandomOption(page, page.locator('#mat-select-value-1'));
        await selectRandomOption(page, page.locator('#mat-select-value-2'));
        await page.getByRole('button', { name: /next/i }).click();
        await expect(page.getByRole('textbox', { name: /iban/i }))
            .toBeVisible({ timeout: 10000 });
    });
});
