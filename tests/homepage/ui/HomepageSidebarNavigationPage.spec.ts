import { test, expect, Page } from '@playwright/test';
import { ASSERTION_TIMEOUT_MS, createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/homepage/DashboardPage';
import { HomepageSidebarPage } from '../../pageElements/homepage/HomepageSidebarPage';

test.describe('Homepage – Page Elements – Sidebar navigation', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;
    let sidebar: HomepageSidebarPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, dashboard, sidebar } = await createHomepageSession(browser, 'ACCOUNT_1'));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should display the sidebar navigation container', async () => {
        await expect(dashboard.navigation).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Home link in the sidebar', async () => {
        await expect(dashboard.homeLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Transactions link in the sidebar', async () => {
        await expect(dashboard.transactionsLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Topup link in the sidebar', async () => {
        await expect(sidebar.topupSidebarLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Transfer item in the sidebar', async () => {
        await expect(sidebar.transferSidebarItem).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Bills link in the sidebar', async () => {
        await expect(sidebar.billsSidebarLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Payment Links item in the sidebar', async () => {
        await expect(sidebar.paymentLinksLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Sub-Wallets link in the sidebar', async () => {
        await expect(sidebar.subWalletsSidebarLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Manage Accounts item in the sidebar', async () => {
        await expect(sidebar.accountsPanel).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Manage Products link in the sidebar', async () => {
        await expect(sidebar.manageProductsLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Groups & Roles link in the sidebar', async () => {
        await expect(sidebar.groupsRolesLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Card Management link in the sidebar', async () => {
        await expect(sidebar.cardManagementLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the logged-in company name in the sidebar', async () => {
        await expect(dashboard.brandName).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });
});
