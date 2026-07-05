import { test, expect, Page } from '@playwright/test';
import { HOME_URL_PATTERN, createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';

test.describe('Homepage – Logo', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, dashboard } = await createHomepageSession(browser, 'ACCOUNT_2'));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should keep the user within the app domain when the sidebar logo is clicked', async () => {
        await dashboard.logo.click();
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });
});
