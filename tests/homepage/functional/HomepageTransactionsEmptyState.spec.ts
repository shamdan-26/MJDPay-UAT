import { test, expect, Page } from '@playwright/test';
import { createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { HomepageTransactionsPage } from '../../pageElements/homepage/HomepageTransactionsPage';

test.describe('Homepage – Transactions empty state', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let transactions: HomepageTransactionsPage;

    test.beforeAll(async ({ browser }) => {
        // Account 2's storage state is a freshly-registered account with no
        // transaction history — used deliberately to exercise the "no
        // transactions yet" empty state.
        ({ page, transactions } = await createHomepageSession(browser, 'ACCOUNT_2'));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should show the empty-state message when the account has no transactions', async () => {
        await expect(transactions.transactionsEmptyTitle).toHaveText(/no transactions yet/i, { timeout: 15000 });
        await expect(transactions.transactionsEmptyDescription)
            .toContainText(/once money moves through your wallet/i);
    });

    test('should not display a transaction total count when there are no transactions', async () => {
        await expect(transactions.transactionsEmptyState).toBeVisible({ timeout: 15000 });
        await expect(transactions.transactionTotalText).not.toBeVisible();
    });

    test('should not display a View All link in transactions when there are no transactions', async () => {
        await expect(transactions.transactionsEmptyState).toBeVisible({ timeout: 15000 });
        await expect(transactions.transactionViewAllLink).not.toBeVisible();
    });
});
