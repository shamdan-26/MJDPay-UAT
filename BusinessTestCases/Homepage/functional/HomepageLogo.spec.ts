import { test, expect, Page } from '../HomepageFixtures';
import { HOME_URL_PATTERN, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';

test.describe('Homepage – Logo', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeEach(async ({ homepagePage, dashboard: d }) => {
        page = homepagePage;
        dashboard = d;
        await refreshHomepage(page);
    });

    test('should keep the user within the app domain when the sidebar logo is clicked', async () => {
        await dashboard.logo.click();
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });
});
