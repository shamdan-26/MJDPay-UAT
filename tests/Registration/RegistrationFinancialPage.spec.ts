import { test, expect, Page } from '@playwright/test';
import { goToFinancialStep } from './helpers';

test.describe('Registration â€“ Financial & Business Page', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120_000);

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
    });

    test.afterAll(async () => {
        await page.close();
    });

    // â”€â”€ Tab indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should show the Financial & Business step fields on arrival', async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected number/i })).toBeVisible();
    });

    test('should display all four step indicators', async () => {
        await expect(page.getByText(/business info/i).first()).toBeVisible();
        await expect(page.getByText(/nafath/i).first()).toBeVisible();
        await expect(page.getByText(/products/i).first()).toBeVisible();
        await expect(page.getByText(/contract/i).first()).toBeVisible();
    });

    // â”€â”€ Monthly Expected Number Of Bills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Monthly Expected Number Of Bills label', async () => {
        await expect(page.getByText(/monthly expected number of bills/i).first()).toBeVisible();
    });

    test('should display the Monthly Expected Number Of Bills input', async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected number/i })).toBeVisible();
    });

    test('should show the correct placeholder for Monthly Expected Number Of Bills', async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected number/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // â”€â”€ Monthly Expected Sum Of Bills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Monthly Expected Sum Of Bills label', async () => {
        await expect(page.getByText(/monthly expected sum of bills/i).first()).toBeVisible();
    });

    test('should display the Monthly Expected Sum Of Bills input', async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected sum/i })).toBeVisible();
    });

    test('should show the correct placeholder for Monthly Expected Sum Of Bills', async () => {
        await expect(page.getByRole('textbox', { name: /monthly expected sum/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // â”€â”€ Expected Monthly Withdrawal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Expected Monthly Withdrawal label', async () => {
        await expect(page.getByText(/expected monthly withdrawal/i).first()).toBeVisible();
    });

    test('should display the Expected Monthly Withdrawal input', async () => {
        await expect(page.getByRole('textbox', { name: /monthly withdrawal/i })).toBeVisible();
    });

    test('should show the correct placeholder for Expected Monthly Withdrawal', async () => {
        await expect(page.getByRole('textbox', { name: /monthly withdrawal/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // â”€â”€ Expected Monthly Deposit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Expected Monthly Deposit label', async () => {
        await expect(page.getByText(/expected monthly deposit/i).first()).toBeVisible();
    });

    test('should display the Expected Monthly Deposit input', async () => {
        await expect(page.getByRole('textbox', { name: /monthly deposit/i })).toBeVisible();
    });

    test('should show the correct placeholder for Expected Monthly Deposit', async () => {
        await expect(page.getByRole('textbox', { name: /monthly deposit/i }))
            .toHaveAttribute('placeholder', /2000/i);
    });

    // â”€â”€ Banks dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Banks dropdown label', async () => {
        await expect(page.getByText(/banks/i).first()).toBeVisible();
    });

    /* test('should display the Banks dropdown', async () => {
        await expect(page.getByRole('combobox', { name: /banks/i })).toBeVisible();
    }); */

    // â”€â”€ Industries dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Industries dropdown label', async () => {
        await expect(page.getByText(/industries/i).first()).toBeVisible();
    });

        /* test('should display the Industries dropdown', async () => {
            await expect(page.getByRole('combobox', { name: /industries/i })).toBeVisible();
        }); */

    // â”€â”€ Annual Income dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Annual Income dropdown label', async () => {
        await expect(page.getByText(/annual income/i).first()).toBeVisible();
    });

    /* test('should display the Annual Income dropdown', async () => {
        await expect(page.getByRole('combobox', { name: /annual income/i })).toBeVisible();
    }); */

    // â”€â”€ Navigation buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    test('should display the Back button', async () => {
        await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
    });

    test('should display the Next button', async () => {
        await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
    });

    test('should have Next button disabled when required fields are empty', async () => {
        await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
    });
});
