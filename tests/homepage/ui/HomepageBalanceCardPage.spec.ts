import { test, expect, Page } from '@playwright/test';
import { ASSERTION_TIMEOUT_MS, createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { HomepageBalanceCardPage } from '../../pageElements/homepage/HomepageBalanceCardPage';

test.describe('Homepage – Page Elements – Balance card', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;
    let balanceCard: HomepageBalanceCardPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, dashboard, balanceCard } = await createHomepageSession(browser, 'ACCOUNT_2'));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should display the "Current Balance" label', async () => {
        await expect(balanceCard.currentBalanceLabel).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the wallet balance container', async () => {
        await expect(dashboard.walletBalanceSar).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the balance visibility toggle button', async () => {
        await expect(balanceCard.balanceVisibilityToggle).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Wallet QR button', async () => {
        await expect(balanceCard.walletQrButton).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Wallet Settings button', async () => {
        await expect(balanceCard.walletSettingsButton).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });
});
