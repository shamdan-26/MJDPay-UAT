import { test, expect, Page } from '../HomepageFixtures';
import { ASSERTION_TIMEOUT_MS, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/Shared/DashboardPage';
import { HomepageSidebarPage } from '../../pageElements/Shared/HomepageSidebarPage';

test.describe('Homepage – Page Elements – Sidebar navigation', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;
    let sidebar: HomepageSidebarPage;

    test.beforeEach(async ({ homepagePage, dashboard: d, sidebar: s }) => {
        page = homepagePage;
        dashboard = d;
        sidebar = s;
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

    test('should display the Cashout and Wallet Transfer sub-links when Transfer is expanded', async () => {
        await sidebar.transferSidebarItem.click();
        await expect(sidebar.cashoutSidebarLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
        await expect(sidebar.walletTransferSidebarLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the International Transfer sub-link marked "Soon" when Transfer is expanded', async () => {
        await sidebar.transferSidebarItem.click();
        await expect(sidebar.internationalTransferSidebarLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
        await expect(sidebar.internationalTransferSidebarLink).toContainText(/soon/i);
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

    test('should display the SADAD item in the sidebar marked "Soon"', async () => {
        await expect(sidebar.sadadSidebarLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
        await expect(sidebar.sadadSidebarLink).toContainText(/soon/i);
    });

    test('should display the Manage Accounts item in the sidebar', async () => {
        await expect(sidebar.accountsPanel).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Manage Users and Manage Beneficiary sub-links when Manage Accounts is expanded', async () => {
        await sidebar.accountsPanel.click();
        await expect(sidebar.accountsSubmenu).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
        await expect(sidebar.manageUsersSidebarLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
        await expect(sidebar.manageBeneficiarySidebarLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
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
