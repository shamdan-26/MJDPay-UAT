import { test, expect, Page } from '@playwright/test';
import { HOME_URL, BASE_ORIGIN, ACCOUNT_2_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pages/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Transactions empty state', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeAll(async ({ browser }) => {
        // Account 2's storage state is a freshly-registered account with no
        // transaction history — used deliberately to exercise the "no
        // transactions yet" empty state.
        const context = await browser.newContext({ storageState: ACCOUNT_2_STORAGE_STATE });
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        page = await context.newPage();
        dashboard = new DashboardPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2500);
        await waitForToastClear(page, 800, 5000);
    });

    test('should show the empty-state message when the account has no transactions', async () => {
        await expect(dashboard.transactionsEmptyTitle).toHaveText(/no transactions yet/i, { timeout: 15000 });
        await expect(dashboard.transactionsEmptyDescription)
            .toContainText(/once money moves through your wallet/i);
    });

    test('should not display a transaction total count when there are no transactions', async () => {
        await expect(dashboard.transactionsEmptyState).toBeVisible({ timeout: 15000 });
        await expect(dashboard.transactionTotalText).not.toBeVisible();
    });

    test('should not display a View All link in transactions when there are no transactions', async () => {
        await expect(dashboard.transactionsEmptyState).toBeVisible({ timeout: 15000 });
        await expect(dashboard.transactionViewAllLink).not.toBeVisible();
    });
});
