import { test, expect, Page } from '@playwright/test';
import { createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/homepage/DashboardPage';
import { HomepageHeaderPage } from '../../pageElements/homepage/HomepageHeaderPage';

test.describe('Homepage – Profile menu', () => {
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

    test('should display the logout option inside the profile menu', async () => {
        await dashboard.openProfileMenu();
        await expect(dashboard.logoutItem).toBeVisible();
    });

    test('should display a profile or settings option inside the profile menu', async () => {
        await dashboard.openProfileMenu();
        await expect(header.profileOrSettingsItem).toBeVisible();
    });
});
