import { test, expect, Page } from '../HomepageFixtures';
import { ASSERTION_TIMEOUT_MS, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';

test.describe('Homepage – Page Elements – Header / top bar', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeEach(async ({ homepagePage, dashboard: d }) => {
        page = homepagePage;
        dashboard = d;
        await refreshHomepage(page);
    });

    test('should display the profile trigger in the header', async () => {
        await expect(dashboard.profileTrigger).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the notifications icon in the header', async () => {
        await expect(dashboard.notificationsIcon).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });
});
