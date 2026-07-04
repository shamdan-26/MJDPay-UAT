import { test, expect, Page } from '@playwright/test';
import { HOME_URL, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pages/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Page Elements – Last 10 Transactions', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeAll(async ({ browser }) => {
        // Uses account 1's storage state: these assertions need real
        // transaction history to display, unlike the secondary test account.
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

    test('should display the last transactions container', async () => {
        await expect(dashboard.lastTransactionsContainer).toBeVisible({ timeout: 10000 });
    });

    test('should display at most 10 rows in the last transactions table', async () => {
        await expect(dashboard.lastTransactionsContainer).toBeVisible({ timeout: 10000 });
        // The widget renders as an ngx-datatable, not a semantic <table>/<tr>.
        const rows  = dashboard.lastTransactionsContainer.locator('datatable-body-row');
        await rows.first().waitFor({ state: 'visible', timeout: 10000 });
        const count = await rows.count();
        expect(count, 'Transaction table should show at most 10 rows').toBeLessThanOrEqual(10);
    });

    test('should display transaction table column headers', async () => {
        const table = dashboard.lastTransactionsContainer;
        await expect(table).toBeVisible({ timeout: 10000 });
        // ngx-datatable renders column headers as <datatable-header-cell>, not <thead>/<tr>.
        const headerCells = table.locator('datatable-header-cell');
        await expect(headerCells.first()).toBeVisible({ timeout: 10000 });
        const texts = await headerCells.allTextContents();
        expect(texts.join(' '), 'Table should have column headers').toMatch(/transaction|amount|date|status/i);
    });

    test('should display the View All link in the transactions section', async () => {
        await expect(dashboard.transactionViewAllLink).toBeVisible({ timeout: 10000 });
    });

    test('should display a total row count below the transactions table', async () => {
        await expect(dashboard.transactionTotalText).toBeVisible({ timeout: 10000 });
    });
});
