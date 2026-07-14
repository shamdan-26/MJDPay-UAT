import { test, expect, Page } from '../HomepageFixtures';
import { HOME_URL, HOME_URL_PATTERN, refreshHomepage } from '../HomePageHelper';

test.describe('Homepage – Session persistence', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeEach(async ({ homepagePage }) => {
        page = homepagePage;
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
