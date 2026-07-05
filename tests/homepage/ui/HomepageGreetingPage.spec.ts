import { test, expect, Page } from '@playwright/test';
import { ASSERTION_TIMEOUT_MS, createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/homepage/DashboardPage';
import { HomepageGreetingPage } from '../../pageElements/homepage/HomepageGreetingPage';

test.describe('Homepage – Page Elements – Greeting section', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;
    let greeting: HomepageGreetingPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, dashboard, greeting } = await createHomepageSession(browser));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
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
