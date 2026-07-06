import { test, expect, Page } from '@playwright/test';
import { createHomepageSession, refreshHomepage, HOME_URL_PATTERN } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/homepage/DashboardPage';
import { HomepageSidebarPage } from '../../pageElements/homepage/HomepageSidebarPage';

test.describe('Homepage – Sidebar navigation', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;
    let sidebar: HomepageSidebarPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, dashboard, sidebar } = await createHomepageSession(browser));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should navigate to Transactions page when the Transactions link is clicked', async () => {
        await dashboard.transactionsLink.click();
        await expect(page).toHaveURL(/\/business\/main\/transactions/);
    });

    test('should return to homepage when Home link is clicked from another page', async () => {
        await dashboard.transactionsLink.click();
        await expect(page).toHaveURL(/\/business\/main\/transactions/);
        await dashboard.homeLink.click();
        await expect(page).toHaveURL(/\/business\/main\/home/);
    });

    test('should highlight the Home nav item as active on the homepage', async () => {
        await expect(dashboard.homeLink).toBeVisible({ timeout: 10000 });
        const classes     = await dashboard.homeLink.getAttribute('class') ?? '';
        const ariaCurrent = await dashboard.homeLink.getAttribute('aria-current');
        const isActive    = classes.split(' ').includes('active') || ariaCurrent === 'page';
        expect(isActive, 'Home link should be marked as active').toBe(true);
    });

    test('should navigate to Topup page when the Topup sidebar link is clicked', async () => {
        await sidebar.topupSidebarLink.click();
        await expect(page).toHaveURL(/top-up/i, { timeout: 10000 });
    });

    test('should expand the Transfer submenu and reveal Cashout link', async () => {
        await sidebar.transferSidebarItem.click();
        await expect(sidebar.cashoutSidebarLink).toBeVisible({ timeout: 5000 });
    });

    test('should show Wallet Transfer sub-link when Transfer submenu is expanded', async () => {
        await sidebar.transferSidebarItem.click();
        await expect(sidebar.walletTransferSidebarLink).toBeVisible({ timeout: 5000 });
    });

    test('should not navigate away when the "Soon" International Transfer sub-link is clicked', async () => {
        await sidebar.transferSidebarItem.click();
        await expect(sidebar.internationalTransferSidebarLink).toBeVisible({ timeout: 5000 });
        await sidebar.internationalTransferSidebarLink.click({ force: true }).catch(() => {});
        await expect(page).toHaveURL(HOME_URL_PATTERN, { timeout: 5000 });
    });

    test('should navigate to Bills page when the Bills sidebar link is clicked', async () => {
        await sidebar.billsSidebarLink.click();
        await expect(page).toHaveURL(/bills/i, { timeout: 10000 });
    });

    test('should navigate to Payment Links page when the sidebar link is clicked', async () => {
        await sidebar.paymentLinksLink.click();
        await expect(page).toHaveURL(/payment.?links/i, { timeout: 10000 });
    });

    test('should navigate to Sub-Wallets page when the sidebar link is clicked', async () => {
        await sidebar.subWalletsSidebarLink.click();
        await expect(page).toHaveURL(/sub.wallets?/i, { timeout: 10000 });
    });

    test('should not navigate away when the "Soon" SADAD item is clicked', async () => {
        await expect(sidebar.sadadSidebarLink).toBeVisible();
        await sidebar.sadadSidebarLink.click({ force: true }).catch(() => {});
        await expect(page).toHaveURL(HOME_URL_PATTERN, { timeout: 5000 });
    });

    test('should expand the Manage Accounts submenu when clicked', async () => {
        await expect(sidebar.accountsPanel).toBeVisible();
        await sidebar.accountsPanel.click();
        await expect(sidebar.accountsSubmenu).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to Manage Users page when the sidebar sub-link is clicked', async () => {
        await sidebar.accountsPanel.click();
        await sidebar.manageUsersSidebarLink.click();
        await expect(page).toHaveURL(/users/i, { timeout: 10000 });
    });

    test('should navigate to Manage Beneficiary page when the sidebar sub-link is clicked', async () => {
        await sidebar.accountsPanel.click();
        await sidebar.manageBeneficiarySidebarLink.click();
        await expect(page).toHaveURL(/beneficiar/i, { timeout: 10000 });
    });

    test('should navigate to Manage Products page when the sidebar link is clicked', async () => {
        await sidebar.manageProductsLink.click();
        await expect(page).toHaveURL(/products-management/i, { timeout: 10000 });
    });

    test('should navigate to Groups & Roles page when the sidebar link is clicked', async () => {
        await sidebar.groupsRolesLink.click();
        await expect(page).toHaveURL(/group|role/i, { timeout: 10000 });
    });

    test('should navigate to Card Management page when the sidebar link is clicked', async () => {
        await sidebar.cardManagementLink.click();
        await expect(page).toHaveURL(/card/i, { timeout: 10000 });
    });
});
