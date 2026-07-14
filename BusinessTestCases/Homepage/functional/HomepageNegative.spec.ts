import { test, expect } from '../../fixtures';
import {
    HOME_URL, HOME_URL_PATTERN, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE,
    POST_NAV_SETTLE_MS, TOAST_APPEAR_TIMEOUT_MS, TOAST_CLEAR_TIMEOUT_MS, ASSERTION_TIMEOUT_MS,
} from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { HomepageGreetingPage } from '../../pageElements/HomepageGreetingPage';
import { HomepageBillsOverviewPage } from '../../pageElements/HomepageBillsOverviewPage';
import { HomepageSubWalletsPage } from '../../pageElements/HomepageSubWalletsPage';
import { waitForToastClear } from '../../toastMessages';

test.describe('Homepage – Negative Scenarios', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: ACCOUNT_1_STORAGE_STATE });

    let dashboard: DashboardPage;
    let greeting: HomepageGreetingPage;
    let billsOverview: HomepageBillsOverviewPage;
    let subWallets: HomepageSubWalletsPage;

    test.beforeEach(async ({ page, dashboard: d, homepageGreeting, homepageBillsOverview, homepageSubWallets }) => {
        await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(POST_NAV_SETTLE_MS);
        await waitForToastClear(page, TOAST_APPEAR_TIMEOUT_MS, TOAST_CLEAR_TIMEOUT_MS);
        dashboard      = d;
        greeting       = homepageGreeting;
        billsOverview  = homepageBillsOverview;
        subWallets     = homepageSubWallets;
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
        await expect(billsOverview.billsOverviewHeading).toBeVisible();
    });

    test('should remain on the homepage and not crash when the sub-wallets API fails', async ({ page }) => {
        await page.route('**/sub-wallet**', route =>
            route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Service unavailable' }) })
        );
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForToastClear(page);
        await expect(page).toHaveURL(HOME_URL_PATTERN);
        await expect(subWallets.subWalletsHeading).toBeVisible();
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
        await expect(greeting.greetingText).toBeVisible();
    });

    test('should show the empty sub-wallets message when no sub-wallets exist', async () => {
        await expect(subWallets.subWalletsEmptyMessage).toBeVisible();
    });

    test('should show 0 bills in the Paid category when there are no paid bills', async () => {
        await expect(billsOverview.billsPaidLabel).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
        const paidText = await billsOverview.billsPaidLabel
            .locator('xpath=ancestor::*[1]')
            .textContent()
            .catch(() => '');
        expect(paidText ?? '').toMatch(/0|paid/i);
    });

    test('should show 0 bills in the Unpaid category when there are no unpaid bills', async () => {
        await expect(billsOverview.billsUnpaidLabel).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
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
