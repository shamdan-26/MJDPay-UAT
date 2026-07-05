import { test, expect, Page } from '@playwright/test';
import { HOME_URL, HOME_URL_PATTERN, createHomepageSession, refreshHomepage } from '../HomePageHelper';

test.describe('Homepage – Session persistence', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
        ({ page } = await createHomepageSession(browser, 'ACCOUNT_1'));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
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
