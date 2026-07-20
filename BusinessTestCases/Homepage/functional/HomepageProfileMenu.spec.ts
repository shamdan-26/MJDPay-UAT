import { test, expect, Page } from '../HomepageFixtures';
import { refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/Shared/DashboardPage';
import { HomepageHeaderPage } from '../../pageElements/Homepage/HomepageHeaderPage';

test.describe('Homepage – Profile menu', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;
    let header: HomepageHeaderPage;

    test.beforeEach(async ({ homepagePage, dashboard: d, header: h }) => {
        page = homepagePage;
        dashboard = d;
        header = h;
        await refreshHomepage(page);
    });

    test('should display the logout option inside the profile menu', async () => {
        await dashboard.openProfileMenu();
        await expect(dashboard.logoutItem).toBeVisible();
    });

    test('should display a profile or settings option inside the profile menu', async () => {
        await dashboard.openProfileMenu();
        await expect(header.profileOrSettingsItem).toBeVisible();
    });
});
