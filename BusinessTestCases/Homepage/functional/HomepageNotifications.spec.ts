import { test, expect, Page } from '../HomepageFixtures';
import { refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/Shared/DashboardPage';
import { HomepageHeaderPage } from '../../pageElements/Homepage/HomepageHeaderPage';

test.describe('Homepage – Notifications panel', () => {
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

    test('should open notifications panel when notifications icon is clicked', async () => {
        await dashboard.notificationsIcon.click();
        await expect(header.notificationsPanel).toBeVisible();
        await expect(header.notificationsHeading).toBeVisible();
    });

    test('should close the notifications panel when the icon is clicked a second time', async () => {
        await dashboard.notificationsIcon.click();
        await expect(header.notificationsHeading).toBeVisible();
        await dashboard.notificationsIcon.click();
        await expect(header.notificationsHeading).not.toBeVisible();
    });
});
