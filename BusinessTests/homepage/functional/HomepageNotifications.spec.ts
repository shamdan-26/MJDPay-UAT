import { test, expect, Page } from '@playwright/test';
import { createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/homepage/DashboardPage';
import { HomepageHeaderPage } from '../../pageElements/homepage/HomepageHeaderPage';

test.describe('Homepage – Notifications panel', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;
    let header: HomepageHeaderPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, dashboard, header } = await createHomepageSession(browser));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
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
