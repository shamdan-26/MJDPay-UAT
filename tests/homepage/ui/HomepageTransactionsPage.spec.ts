import { test, expect, Page } from '@playwright/test';
import { ASSERTION_TIMEOUT_MS, createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { HomepageTransactionsPage } from '../../pageElements/homepage/HomepageTransactionsPage';

test.describe('Homepage – Page Elements – Last 10 Transactions', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;
    let transactions: HomepageTransactionsPage;

    test.beforeAll(async ({ browser }) => {
        // Uses account 1's storage state: these assertions need real
        // transaction history to display, unlike the secondary test account.
        ({ page, dashboard, transactions } = await createHomepageSession(browser, 'ACCOUNT_1'));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should display the last transactions container', async () => {
        await expect(dashboard.lastTransactionsContainer).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display at most 10 rows in the last transactions table', async () => {
        await expect(dashboard.lastTransactionsContainer).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
        await transactions.transactionRows.first().waitFor({ state: 'visible', timeout: ASSERTION_TIMEOUT_MS });
        const count = await transactions.transactionRows.count();
        expect(count, 'Transaction table should show at most 10 rows').toBeLessThanOrEqual(10);
    });

    test('should display transaction table column headers', async () => {
        await expect(dashboard.lastTransactionsContainer).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
        await expect(transactions.transactionHeaderCells.first()).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
        const texts = await transactions.transactionHeaderCells.allTextContents();
        expect(texts.join(' '), 'Table should have column headers').toMatch(/transaction|amount|date|status/i);
    });

    test('should display the View All link in the transactions section', async () => {
        await expect(transactions.transactionViewAllLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display a total row count below the transactions table', async () => {
        await expect(transactions.transactionTotalText).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });
});
