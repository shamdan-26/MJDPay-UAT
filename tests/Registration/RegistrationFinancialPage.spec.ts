import { test, expect, Page } from '@playwright/test';
import { goToFinancialStep } from './helpers';

test.describe('Registration – Financial & Business Page', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: 'https://dev.majdpay.com' });
        page = await context.newPage();
        await goToFinancialStep(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    // ── Tab indicator ─────────────────────────────────────────────────────────

    test('should show the Financial & Business tab as active', async () => {
        await expect(page.getByRole('tab', { name: /financial/i }))
            .toHaveAttribute('aria-selected', 'true');
    });

    test('should display all three progress tabs', async () => {
        await expect(page.getByRole('tab', { name: /business info/i })).toBeVisible();
        await expect(page.getByRole('tab', { name: /financial/i })).toBeVisible();
        await expect(page.getByRole('tab', { name: /verification/i })).toBeVisible();
    });

    // ── Monthly Expected Number Of Bills ──────────────────────────────────────

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

    // ── Monthly Expected Sum Of Bills ─────────────────────────────────────────

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

    // ── Expected Monthly Withdrawal ───────────────────────────────────────────

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

    // ── Expected Monthly Deposit ──────────────────────────────────────────────

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

    // ── Banks dropdown ────────────────────────────────────────────────────────

    test('should display the Banks dropdown label', async () => {
        await expect(page.getByText(/banks/i).first()).toBeVisible();
    });

    test('should display the Banks dropdown', async () => {
        await expect(page.getByRole('combobox', { name: /banks/i })).toBeVisible();
    });

    // ── Industries dropdown ───────────────────────────────────────────────────

    test('should display the Industries dropdown label', async () => {
        await expect(page.getByText(/industries/i).first()).toBeVisible();
    });

    test('should display the Industries dropdown', async () => {
        await expect(page.getByRole('combobox', { name: /industries/i })).toBeVisible();
    });

    // ── Annual Income dropdown ────────────────────────────────────────────────

    test('should display the Annual Income dropdown label', async () => {
        await expect(page.getByText(/annual income/i).first()).toBeVisible();
    });

    test('should display the Annual Income dropdown', async () => {
        await expect(page.getByRole('combobox', { name: /annual income/i })).toBeVisible();
    });

    // ── Navigation buttons ────────────────────────────────────────────────────

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
