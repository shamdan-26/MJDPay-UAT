import { test, expect } from '@playwright/test';
import { HOME_URL, HOME_URL_PATTERN, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Negative Scenarios', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: ACCOUNT_1_STORAGE_STATE });

    let dashboard: DashboardPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
        await waitForToastClear(page, 800, 5000);
        dashboard = new DashboardPage(page);
    });

    // ── API failure handling ──────────────────────────────────────────────────

    test('should remain on the homepage and not crash when the transactions API fails', async ({ page }) => {
        await page.route('**/transactions**', route =>
            route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Service unavailable' }) })
        );
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForToastClear(page);
        await expect(page).toHaveURL(HOME_URL_PATTERN);
        await expect(dashboard.lastTransactionsContainer).toBeVisible();
    });

    test('should remain on the homepage and not crash when the bills API fails', async ({ page }) => {
        await page.route('**/bills**', route =>
            route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Service unavailable' }) })
        );
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForToastClear(page);
        await expect(page).toHaveURL(HOME_URL_PATTERN);
        await expect(dashboard.billsOverviewHeading).toBeVisible();
    });

    test('should remain on the homepage and not crash when the sub-wallets API fails', async ({ page }) => {
        await page.route('**/sub-wallet**', route =>
            route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Service unavailable' }) })
        );
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForToastClear(page);
        await expect(page).toHaveURL(HOME_URL_PATTERN);
        await expect(dashboard.subWalletsHeading).toBeVisible();
    });

    test('should remain on the homepage and not crash when the wallet balance API fails', async ({ page }) => {
        await page.route('**/wallet**', route =>
            route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Service unavailable' }) })
        );
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForToastClear(page);
        await expect(page).toHaveURL(HOME_URL_PATTERN);
        await expect(dashboard.walletBalanceSar).toBeVisible();
    });

    test('should not navigate away when all dashboard widget APIs return empty data', async ({ page }) => {
        await page.route('**/transactions**', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
        );
        await page.route('**/bills**', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ paid: 0, unpaid: 0 }) })
        );
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForToastClear(page);
        await expect(page).toHaveURL(HOME_URL_PATTERN);
        await expect(dashboard.greetingText).toBeVisible();
    });

    test('should show the empty sub-wallets message when no sub-wallets exist', async () => {
        await expect(dashboard.subWalletsEmptyMessage).toBeVisible();
    });

    test('should show 0 bills in the Paid category when there are no paid bills', async () => {
        await expect(dashboard.billsPaidLabel).toBeVisible({ timeout: 10000 });
        const paidText = await dashboard.billsPaidLabel
            .locator('xpath=ancestor::*[1]')
            .textContent()
            .catch(() => '');
        expect(paidText ?? '').toMatch(/0|paid/i);
    });

    test('should show 0 bills in the Unpaid category when there are no unpaid bills', async () => {
        await expect(dashboard.billsUnpaidLabel).toBeVisible({ timeout: 10000 });
    });

    // ── Invalid navigation ────────────────────────────────────────────────────

    test('should display all sidebar items even after a failed widget API call', async ({ page }) => {
        await page.route('**/transactions**', route =>
            route.fulfill({ status: 503, body: '' })
        );
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForToastClear(page);
        await expect(dashboard.homeLink).toBeVisible();
        await expect(dashboard.transactionsLink).toBeVisible();
        await expect(dashboard.brandName).toBeVisible();
    });
});
