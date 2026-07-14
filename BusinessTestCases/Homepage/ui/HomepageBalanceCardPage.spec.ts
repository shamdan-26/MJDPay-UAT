import { test, expect, Page } from '../HomepageFixtures';
import { ASSERTION_TIMEOUT_MS, refreshHomepage } from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { HomepageBalanceCardPage } from '../../pageElements/HomepageBalanceCardPage';

test.describe('Homepage – Page Elements – Balance card', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;
    let balanceCard: HomepageBalanceCardPage;

    test.beforeEach(async ({ homepagePage, dashboard: d, balanceCard: bc }) => {
        page = homepagePage;
        dashboard = d;
        balanceCard = bc;
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
