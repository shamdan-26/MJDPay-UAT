import { test, expect, Page } from '@playwright/test';
import { createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/homepage/DashboardPage';

test.describe('Homepage – Logout', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, dashboard } = await createHomepageSession(browser));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    // Session-destroying — must remain last in this file.

    test('should show logout confirmation dialog from account menu', async () => {
        await dashboard.openProfileMenu();
        await dashboard.logoutItem.click();
        await expect(dashboard.proceedButton).toBeVisible();
    });

    test('should not be able to access homepage after logout', async () => {
        await dashboard.logout();
        await expect(page).toHaveURL(/auth\/login/);
    });
});
