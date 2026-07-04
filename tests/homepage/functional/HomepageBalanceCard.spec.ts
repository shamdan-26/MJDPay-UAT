import { test, expect, Page } from '@playwright/test';
import { HOME_URL, HOME_URL_PATTERN, BASE_ORIGIN, ACCOUNT_2_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pages/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Balance card interactions', () => {
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

    test('should change the balance display when the visibility toggle is clicked', async () => {
        const before = await dashboard.balanceAmountText.textContent();
        console.log('balance before toggle:', before);
        await dashboard.balanceVisibilityToggle.click();
        await page.waitForTimeout(400);
        const after = await dashboard.balanceAmountText.textContent();
        expect(after).not.toEqual(before);
    });

    test('should restore the balance display when the visibility toggle is clicked a second time', async () => {
        const before = await dashboard.balanceAmountText.textContent() ?? '';
        console.log('balance before toggle:', before);

        await dashboard.balanceVisibilityToggle.click();
        await expect(dashboard.balanceAmountText, 'Balance display should change after the first toggle')
            .not.toHaveText(before, { timeout: 5000 });

        await dashboard.balanceVisibilityToggle.click();
        await expect(dashboard.balanceAmountText, 'Balance display should be restored to its original value after two toggles')
            .toHaveText(before, { timeout: 5000 });
    });

    test('should open a QR dialog or navigate when the Wallet QR button is clicked', async () => {
        await dashboard.walletQrButton.click();
        await expect(page).toHaveURL(/\/business\/main\/home\/wallet-links/, { timeout: 10000 });
    });

    test('should navigate away from the homepage when Wallet Settings is clicked', async () => {
        await dashboard.walletSettingsButton.click();
        await expect(page).not.toHaveURL(HOME_URL_PATTERN, { timeout: 10000 });
    });
});
