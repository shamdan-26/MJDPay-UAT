import { test, expect, Page } from '@playwright/test';
import { HOME_URL, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pages/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Page Elements – Greeting section', () => {
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

    test('should display the "Home" page heading', async () => {
        await expect(dashboard.pageHeading).toBeVisible({ timeout: 10000 });
    });

    test('should display a time-based greeting message', async () => {
        await expect(dashboard.greetingText).toBeVisible({ timeout: 10000 });
    });

    test('should display the wallet status subtitle under the greeting', async () => {
        await expect(dashboard.greetingSubtitle).toBeVisible({ timeout: 10000 });
    });

    test('should display the Last Login date and time', async () => {
        await expect(dashboard.lastLoginText).toBeVisible({ timeout: 10000 });
    });
});
