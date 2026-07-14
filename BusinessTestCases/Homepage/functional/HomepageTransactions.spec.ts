import { test, expect, Page } from '@playwright/test';
import { createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { HomepageTransactionsPage } from '../../pageElements/HomepageTransactionsPage';

// Visibility-only assertions for this widget (container, total count) live in
// ui/HomepageTransactionsPage.spec.ts — this file owns interaction/behavior only.
test.describe('Homepage – Transactions section', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let transactions: HomepageTransactionsPage;

    test.beforeAll(async ({ browser }) => {
        // Uses account 1's storage state: it has real transaction
        // history, unlike the secondary test account.
        ({ page, transactions } = await createHomepageSession(browser, 'ACCOUNT_1'));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should navigate to Transactions when the View All link in transactions is clicked', async () => {
        await expect(transactions.transactionViewAllLink).toBeVisible({ timeout: 10000 });
        await transactions.transactionViewAllLink.click();
        await expect(page).toHaveURL(/\/business\/main\/transactions/, { timeout: 10000 });
    });
});
