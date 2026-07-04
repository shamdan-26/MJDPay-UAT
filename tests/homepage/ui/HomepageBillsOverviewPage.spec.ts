import { test, expect, Page } from '@playwright/test';
import { HOME_URL, BASE_ORIGIN, ACCOUNT_2_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pages/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Page Elements – Bills overview', () => {
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

    test('should display the Bills overview section heading', async () => {
        await expect(dashboard.billsOverviewHeading).toBeVisible({ timeout: 10000 });
    });

    test('should display the Chart toggle button in Bills overview', async () => {
        await expect(dashboard.billsChartToggle).toBeVisible({ timeout: 10000 });
    });

    test('should display the Cards toggle button in Bills overview', async () => {
        await expect(dashboard.billsCardsToggle).toBeVisible({ timeout: 10000 });
    });

    test('should display the Paid category label in Bills overview', async () => {
        await expect(dashboard.billsPaidLabel).toBeVisible({ timeout: 10000 });
    });

    test('should display the Unpaid category label in Bills overview', async () => {
        await expect(dashboard.billsUnpaidLabel).toBeVisible({ timeout: 10000 });
    });

    test('should display the View All link in the Bills overview section', async () => {
        await expect(dashboard.billsViewAllLink).toBeVisible({ timeout: 10000 });
    });
});
