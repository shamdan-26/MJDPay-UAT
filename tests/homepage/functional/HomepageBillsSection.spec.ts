import { test, expect, Page } from '@playwright/test';
import { HOME_URL, HOME_URL_PATTERN, BASE_ORIGIN, ACCOUNT_2_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pages/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Bills section interactions', () => {
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

    test('should switch to Cards view when the Cards toggle is clicked', async () => {
        await expect(dashboard.billsCardsToggle).toBeVisible();
        await dashboard.billsCardsToggle.click();
        await page.waitForTimeout(400);
        await expect(dashboard.billsCardsToggle).toBeEnabled();
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should switch back to Chart view when the Chart toggle is clicked', async () => {
        await dashboard.billsCardsToggle.click();
        await page.waitForTimeout(300);
        await dashboard.billsChartToggle.click();
        await page.waitForTimeout(400);
        await expect(dashboard.billsChartToggle).toBeEnabled();
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should navigate to Bills page when the View All link in Bills overview is clicked', async () => {
        await dashboard.billsViewAllLink.click();
        await expect(page).toHaveURL(/bills/i, { timeout: 10000 });
    });
});
