import { test, expect, Page } from '@playwright/test';
import { HOME_URL, HOME_URL_PATTERN, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pages/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Sidebar navigation', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeAll(async ({ browser }) => {
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

    test('should navigate to Transactions page when the Transactions link is clicked', async () => {
        await dashboard.transactionsLink.click();
        await expect(page).toHaveURL(/\/business\/main\/transactions/);
    });

    test('should return to homepage when Home link is clicked from another page', async () => {
        await dashboard.transactionsLink.click();
        await expect(page).toHaveURL(/\/business\/main\/transactions/);
        await dashboard.homeLink.click();
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should navigate to Topup page when the Topup sidebar link is clicked', async () => {
        await dashboard.topupSidebarLink.click();
        await expect(page).toHaveURL(/top-up/i, { timeout: 10000 });
    });

    test('should expand the Transfer submenu and reveal Cashout link', async () => {
        await dashboard.transferSidebarItem.click();
        const cashoutLink = page.locator('#sideNav-sidenav').getByRole('link', { name: /^cashout$/i });
        await expect(cashoutLink).toBeVisible({ timeout: 5000 });
    });

    test('should show Wallet Transfer sub-link when Transfer submenu is expanded', async () => {
        await dashboard.transferSidebarItem.click();
        const walletTransferLink = page.locator('#sideNav-sidenav').getByRole('link', { name: /wallet\s*transfer/i });
        await expect(walletTransferLink).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to Bills page when the Bills sidebar link is clicked', async () => {
        await dashboard.billsSidebarLink.click();
        await expect(page).toHaveURL(/bills/i, { timeout: 10000 });
    });

    test('should navigate to Payment Links page when the sidebar link is clicked', async () => {
        await dashboard.paymentLinksLink.click();
        await expect(page).toHaveURL(/payment.?links/i, { timeout: 10000 });
    });

    test('should navigate to Sub-Wallets page when the sidebar link is clicked', async () => {
        await dashboard.subWalletsSidebarLink.click();
        await expect(page).toHaveURL(/sub.wallets?/i, { timeout: 10000 });
    });

    test('should expand the Manage Accounts submenu when clicked', async () => {
        await expect(dashboard.accountsPanel).toBeVisible();
        await dashboard.accountsPanel.click();
        await expect(dashboard.accountsSubmenu).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to Manage Products page when the sidebar link is clicked', async () => {
        await dashboard.manageProductsLink.click();
        await expect(page).toHaveURL(/products-management/i, { timeout: 10000 });
    });

    test('should navigate to Groups & Roles page when the sidebar link is clicked', async () => {
        await dashboard.groupsRolesLink.click();
        await expect(page).toHaveURL(/group|role/i, { timeout: 10000 });
    });

    test('should navigate to Card Management page when the sidebar link is clicked', async () => {
        await dashboard.cardManagementLink.click();
        await expect(page).toHaveURL(/card/i, { timeout: 10000 });
    });
});
