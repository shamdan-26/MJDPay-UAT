import { test, expect, Page } from '@playwright/test';
import { ASSERTION_TIMEOUT_MS, createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';

test.describe('Homepage – Page Elements – Logo', () => {
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

    test('should display the MJD Pay logo in the sidebar', async () => {
        await expect(dashboard.logo).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });
});
