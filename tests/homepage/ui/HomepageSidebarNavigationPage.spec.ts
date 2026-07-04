import { test, expect, Page } from '@playwright/test';
import { HOME_URL, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Page Elements – Sidebar navigation', () => {
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

    test('should display the sidebar navigation container', async () => {
        await expect(dashboard.navigation).toBeVisible({ timeout: 10000 });
    });

    test('should display the Home link in the sidebar', async () => {
        await expect(dashboard.homeLink).toBeVisible({ timeout: 10000 });
    });

    test('should highlight the Home nav item as active on the homepage', async () => {
        await expect(dashboard.homeLink).toBeVisible({ timeout: 10000 });
        const classes      = await dashboard.homeLink.getAttribute('class') ?? '';
        const ariaCurrent  = await dashboard.homeLink.getAttribute('aria-current');
        const isActive     = classes.split(' ').includes('active') || ariaCurrent === 'page';
        expect(isActive, 'Home link should be marked as active').toBe(true);
    });

    test('should display the Transactions link in the sidebar', async () => {
        await expect(dashboard.transactionsLink).toBeVisible({ timeout: 10000 });
    });

    test('should display the Topup link in the sidebar', async () => {
        await expect(dashboard.topupSidebarLink).toBeVisible({ timeout: 10000 });
    });

    test('should display the Transfer item in the sidebar', async () => {
        await expect(dashboard.transferSidebarItem).toBeVisible({ timeout: 10000 });
    });

    test('should display the Bills link in the sidebar', async () => {
        await expect(dashboard.billsSidebarLink).toBeVisible({ timeout: 10000 });
    });

    test('should display the Payment Links item in the sidebar', async () => {
        await expect(dashboard.paymentLinksLink).toBeVisible({ timeout: 10000 });
    });

    test('should display the Sub-Wallets link in the sidebar', async () => {
        await expect(dashboard.subWalletsSidebarLink).toBeVisible({ timeout: 10000 });
    });

    test('should display the Manage Accounts item in the sidebar', async () => {
        await expect(dashboard.accountsPanel).toBeVisible({ timeout: 10000 });
    });

    test('should display the Manage Products link in the sidebar', async () => {
        await expect(dashboard.manageProductsLink).toBeVisible({ timeout: 10000 });
    });

    test('should display the Groups & Roles link in the sidebar', async () => {
        await expect(dashboard.groupsRolesLink).toBeVisible({ timeout: 10000 });
    });

    test('should display the Card Management link in the sidebar', async () => {
        await expect(dashboard.cardManagementLink).toBeVisible({ timeout: 10000 });
    });

    test('should display the logged-in company name in the sidebar', async () => {
        await expect(dashboard.brandName).toBeVisible({ timeout: 10000 });
    });
});
