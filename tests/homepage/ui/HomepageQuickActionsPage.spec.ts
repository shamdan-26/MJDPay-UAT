import { test, expect, Page } from '@playwright/test';
import { HOME_URL, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Page Elements – Quick actions', () => {
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

    test('should display the Quick actions section heading', async () => {
        await expect(dashboard.quickActionsHeading).toBeVisible({ timeout: 10000 });
    });

    test('should display the "Shortcuts to common tasks" subtitle in Quick actions', async () => {
        await expect(dashboard.quickActionsSubtitle).toBeVisible({ timeout: 10000 });
    });

    test('should display the Topup quick action card with its description', async () => {
        await expect(dashboard.quickActionTopupCard).toBeVisible({ timeout: 10000 });
    });

    test('should display the Wallet transfer quick action card with its description', async () => {
        await expect(dashboard.quickActionWalletTransferCard).toBeVisible({ timeout: 10000 });
    });

    test('should display the Cashout quick action card with its description', async () => {
        await expect(dashboard.quickActionCashoutCard).toBeVisible({ timeout: 10000 });
    });

    test('should display the Receive payment quick action card with its description', async () => {
        await expect(dashboard.quickActionReceivePaymentCard).toBeVisible({ timeout: 10000 });
    });
});
