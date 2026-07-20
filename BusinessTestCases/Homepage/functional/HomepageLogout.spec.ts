import { test, expect, Page } from '../HomepageFixtures';
import { refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/Shared/DashboardPage';

test.describe('Homepage – Logout', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeEach(async ({ homepagePage, dashboard: d }) => {
        page = homepagePage;
        dashboard = d;
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
