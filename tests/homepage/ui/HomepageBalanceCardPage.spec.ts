import { test, expect, Page } from '@playwright/test';
import { HOME_URL, BASE_ORIGIN, ACCOUNT_2_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Page Elements – Balance card', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeAll(async ({ browser }) => {
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

    test('should display the "Current Balance" label', async () => {
        await expect(dashboard.currentBalanceLabel).toBeVisible({ timeout: 10000 });
    });

    test('should display the wallet balance container', async () => {
        await expect(dashboard.walletBalanceSar).toBeVisible({ timeout: 10000 });
    });

    test('should display the balance visibility toggle button', async () => {
        await expect(dashboard.balanceVisibilityToggle).toBeVisible({ timeout: 10000 });
    });

    test('should display the Wallet QR button', async () => {
        await expect(dashboard.walletQrButton).toBeVisible({ timeout: 10000 });
    });

    test('should display the Wallet Settings button', async () => {
        await expect(dashboard.walletSettingsButton).toBeVisible({ timeout: 10000 });
    });
});
