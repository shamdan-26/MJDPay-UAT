import { test, expect, Page } from '../HomepageFixtures';
import { ASSERTION_TIMEOUT_MS, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { HomepageGreetingPage } from '../../pageElements/HomepageGreetingPage';

test.describe('Homepage – Page Elements – Greeting section', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;
    let greeting: HomepageGreetingPage;

    test.beforeEach(async ({ homepagePage, dashboard: d, greeting: g }) => {
        page = homepagePage;
        dashboard = d;
        greeting = g;
        await refreshHomepage(page);
    });

    test('should display the "Home" page heading', async () => {
        await expect(greeting.pageHeading).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display a time-based greeting message', async () => {
        await expect(greeting.greetingText).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the wallet status subtitle under the greeting', async () => {
        await expect(greeting.greetingSubtitle).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Last Login date and time', async () => {
        await expect(dashboard.lastLoginText).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });
});
