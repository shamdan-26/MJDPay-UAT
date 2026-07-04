import { test, expect, Page } from '@playwright/test';
import { HOME_URL, BASE_ORIGIN, ACCOUNT_2_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Profile menu', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext({ storageState: ACCOUNT_2_STORAGE_STATE });
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        page = await context.newPage();
        dashboard = new DashboardPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2500);
        await waitForToastClear(page, 800, 5000);
    });

    test('should display the logout option inside the profile menu', async () => {
        await dashboard.openProfileMenu();
        await expect(dashboard.logoutItem).toBeVisible();
    });

    test('should display a profile or settings option inside the profile menu', async () => {
        await dashboard.openProfileMenu();
        const fallback = page.getByRole('menuitem', { name: /profile|settings?|account/i }).first();
        const visible  = await dashboard.profileOrSettingsItem.isVisible().catch(() => false)
                      || await fallback.isVisible().catch(() => false);
        expect(visible, 'Profile or Settings item should appear in the account menu').toBe(true);
    });
});
