import { test, expect, Page } from '../HomepageFixtures';
import { ASSERTION_TIMEOUT_MS, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';

test.describe('Homepage – Page Elements – Logo', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeEach(async ({ homepagePage, dashboard: d }) => {
        page = homepagePage;
        dashboard = d;
        await refreshHomepage(page);
    });

    test('should display the MJD Pay logo in the sidebar', async () => {
        await expect(dashboard.logo).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });
});
