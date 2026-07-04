import { test, expect, Page } from '@playwright/test';
import { HOME_URL, HOME_URL_PATTERN, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Session persistence', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext({ storageState: ACCOUNT_1_STORAGE_STATE });
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        page = await context.newPage();
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2500);
        await waitForToastClear(page, 800, 5000);
    });

    test('should stay on homepage when page is refreshed', async () => {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should redirect to login when accessing home URL while unauthenticated', async ({ browser }) => {
        const freshPage = await browser.newPage();
        await freshPage.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(freshPage).toHaveURL(/auth\/login/);
        await freshPage.close();
    });
});
