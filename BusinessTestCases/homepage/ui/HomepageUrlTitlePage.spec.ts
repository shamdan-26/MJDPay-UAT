import { test, expect, Page } from '@playwright/test';
import { HOME_URL_PATTERN, createHomepageSession, refreshHomepage } from '../HomePageHelper';

test.describe('Homepage – Page Elements – URL & title', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
        ({ page } = await createHomepageSession(browser));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should redirect to homepage after successful login', async () => {
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should have the correct page title', async () => {
        await expect(page).toHaveTitle('EMI - Business');
    });
});
