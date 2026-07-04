import { test, expect, Page } from '@playwright/test';
import { HOME_URL, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pages/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Transactions section', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeAll(async ({ browser }) => {
        // Uses account 1's storage state: it has real transaction
        // history, unlike the secondary test account.
        const context = await browser.newContext({ storageState: ACCOUNT_1_STORAGE_STATE });
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

    test('should display the last transactions container with content', async () => {
        await expect(dashboard.lastTransactionsContainer).toBeVisible();
    });

    test('should navigate to Transactions when the View All link in transactions is clicked', async () => {
        await expect(dashboard.transactionViewAllLink).toBeVisible({ timeout: 10000 });
        await dashboard.transactionViewAllLink.click();
        await expect(page).toHaveURL(/\/business\/main\/transactions/, { timeout: 10000 });
    });

    test('should display the total transaction count in the transactions section', async () => {
        await expect(dashboard.transactionTotalText).toBeVisible({ timeout: 10000 });
    });
});
