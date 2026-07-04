import { test, expect, Page } from '@playwright/test';
import { HOME_URL, HOME_URL_PATTERN, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Page Elements – URL & title', () => {
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

    test('should redirect to homepage after successful login', async () => {
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should have the correct page title', async () => {
        await expect(page).toHaveTitle('EMI - Business');
    });
});
