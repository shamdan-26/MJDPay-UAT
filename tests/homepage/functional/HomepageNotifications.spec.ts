import { test, expect, Page } from '@playwright/test';
import { HOME_URL, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pages/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Notifications panel', () => {
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

    test('should open notifications panel when notifications icon is clicked', async () => {
        await page.pause();
        await dashboard.notificationsIcon.click();
        const panel = page.locator('[class*="notif"], [role="dialog"], [aria-label*="notif" i]').first();
        await expect(panel).toBeVisible();
        await expect(page.getByRole('heading', { name: /notifications?/i })).toBeVisible();
    });

    test('should close the notifications panel when the icon is clicked a second time', async () => {
        await dashboard.notificationsIcon.click();
        await expect(page.getByRole('heading', { name: /notifications?/i })).toBeVisible();
        await dashboard.notificationsIcon.click();
        await expect(page.getByRole('heading', { name: /notifications?/i })).not.toBeVisible();
    });
});
