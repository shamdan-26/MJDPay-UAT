import { test, expect, Page } from '@playwright/test';
import {
    VALID_EMAIL,
    generateCRN,
    generateIqama,
    goToFinancialStep,
    selectRandomOption,
} from './helpers';

test.describe('Registration â€“ Financial & Business Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        page = await context.newPage();
        await goToFinancialStep(page, {
            mobile:      '508698531',
            crn:         '1011010343',
            nationalId:  '1890603812',
            profileType: 'merchant',
        });
    }, 120_000);

    test.afterAll(async () => {
        await page.close();
    });

    // â”€â”€ Monthly Expected Number Of Bills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should accept numeric input for Monthly Expected Number Of Bills', async () => {
        const input = page.getByRole('textbox', { name: /monthly expected number/i });
        await input.fill('1500');
        await expect(input).toHaveValue('1500');
    });

  /*   test('should not allow non-numeric input in Monthly Expected Number Of Bills', async () => {
        await page.pause();
        const input = page.getByRole('textbox', { name: /monthly expected number/i });
        await input.fill('abc');
        const value = await input.inputValue();
        expect(value).toMatch(/^\d*$/);
    }); */

    // â”€â”€ Monthly Expected Sum Of Bills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should accept numeric input for Monthly Expected Sum Of Bills', async () => {
        const input = page.getByRole('textbox', { name: /monthly expected sum/i });
        await input.fill('50000');
        await expect(input).toHaveValue('50000');
    });

    // â”€â”€ Expected Monthly Withdrawal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should accept numeric input for Expected Monthly Withdrawal', async () => {
        const input = page.getByRole('textbox', { name: /monthly withdrawal/i });
        await input.fill('10000');
        await expect(input).toHaveValue('10000');
    });

    // â”€â”€ Expected Monthly Deposit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should accept numeric input for Expected Monthly Deposit', async () => {
        const input = page.getByRole('textbox', { name: /monthly deposit/i });
        await input.fill('20000');
        await expect(input).toHaveValue('20000');
    });

    // â”€â”€ Banks dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should open the Banks dropdown when clicked', async () => {
        await page.getByRole('combobox', { name: /banks/i }).click();
        const option = page.locator('[role="option"]:visible, .ng-option:visible').first();
        await expect(option).toBeVisible({ timeout: 5000 });
        await option.click();
    });

    test('should reflect the selected bank in the Banks dropdown', async () => {
        const dropdown = page.getByRole('combobox', { name: /banks/i });
        const selected = await dropdown.textContent();
        expect(selected?.trim()).not.toMatch(/select option/i);
    });

    // â”€â”€ Industries dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should open the Industries dropdown when clicked', async () => {
        await page.getByRole('combobox', { name: /industries/i }).click();
        const option = page.locator('[role="option"]:visible, .ng-option:visible').first();
        await expect(option).toBeVisible({ timeout: 5000 });
        await option.click();
    });

    test('should reflect the selected industry in the Industries dropdown', async () => {
        const dropdown = page.getByRole('combobox', { name: /industries/i });
        const selected = await dropdown.textContent();
        expect(selected?.trim()).not.toMatch(/select option/i);
    });

    // â”€â”€ Annual Income dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should open the Annual Income dropdown when clicked', async () => {
        await page.getByRole('combobox', { name: /annual income/i }).click();
        const option = page.locator('[role="option"]:visible, .ng-option:visible').first();
        await expect(option).toBeVisible({ timeout: 5000 });
        await option.click();
    });

    test('should reflect the selected income in the Annual Income dropdown', async () => {
        const dropdown = page.getByRole('combobox', { name: /annual income/i });
        const selected = await dropdown.textContent();
        expect(selected?.trim()).not.toMatch(/select option/i);
    });

    // â”€â”€ Next button state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should enable Next when all required fields and dropdowns are filled', async () => {
        await page.getByRole('textbox', { name: /monthly expected number/i }).fill('1500');
        await page.getByRole('textbox', { name: /monthly expected sum/i }).fill('50000');
        await page.getByRole('textbox', { name: /monthly withdrawal/i }).fill('10000');
        await page.getByRole('textbox', { name: /monthly deposit/i }).fill('20000');
        await selectRandomOption(page, page.getByRole('combobox', { name: /banks/i }));
        await selectRandomOption(page, page.getByRole('combobox', { name: /industries/i }));
        await selectRandomOption(page, page.getByRole('combobox', { name: /annual income/i }));
        await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 });
    });

    // â”€â”€ Back navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should return to the Business Info step when Back is clicked', async () => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.getByRole('textbox', { name: /Email/i }))
            .toBeVisible({ timeout: 10000 });
    });

    test('should preserve data on Business Info tab after navigating back', async () => {
        await expect(page.getByRole('textbox', { name: /Email/i })).toHaveValue(VALID_EMAIL);
    });

    test('should allow re-advancing to Financial step after going back to Info step', async () => {
        await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 });
        await page.getByRole('button', { name: /next/i }).click();
        await expect(page.getByRole('textbox', { name: /monthly expected number/i }))
            .toBeVisible({ timeout: 10000 });
    });

    // â”€â”€ Forward navigation to Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should advance to Verification & Uploads step when Next is clicked with valid data', async () => {
        await page.getByRole('textbox', { name: /monthly expected number/i }).fill('1500');
        await page.getByRole('textbox', { name: /monthly expected sum/i }).fill('50000');
        await page.getByRole('textbox', { name: /monthly withdrawal/i }).fill('10000');
        await page.getByRole('textbox', { name: /monthly deposit/i }).fill('20000');
        await selectRandomOption(page, page.getByRole('combobox', { name: /banks/i }));
        await selectRandomOption(page, page.getByRole('combobox', { name: /industries/i }));
        await selectRandomOption(page, page.getByRole('combobox', { name: /annual income/i }));
        await page.getByRole('button', { name: /next/i }).click();
        await expect(page.getByRole('textbox', { name: /iban/i }))
            .toBeVisible({ timeout: 10000 });
    });
});
