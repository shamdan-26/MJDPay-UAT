import { test, expect, Page } from '@playwright/test';
import { ASSERTION_TIMEOUT_MS, createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/homepage/DashboardPage';

test.describe('Homepage – Page Elements – Header / top bar', () => {
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

    test('should display the profile trigger in the header', async () => {
        await expect(dashboard.profileTrigger).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the notifications icon in the header', async () => {
        await expect(dashboard.notificationsIcon).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });
});
