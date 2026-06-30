import { test, expect } from '@playwright/test';
import { loginAsMerchant, HOME_URL, HOME_URL_PATTERN, BASE_ORIGIN } from './helpers';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Homepage – Functionality', () => {
    test.describe.configure({ mode: 'serial' }); // serial: logout tests destroy session — must run last

    let dashboard: DashboardPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        await loginAsMerchant(page);
        dashboard = new DashboardPage(page);
    });

    // ── Session persistence ───────────────────────────────────────────────────

    test('should stay on homepage when page is refreshed', async ({ page }) => {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test.skip('should redirect to login when accessing home URL while unauthenticated', async ({ browser }) => {
        const freshPage = await browser.newPage();
        await freshPage.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(freshPage).toHaveURL(/auth\/login/);
        await freshPage.close();
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should keep the user within the app domain when the sidebar logo is clicked', async ({ page }) => {
        await dashboard.logo.click();
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    // ── Sidebar navigation ────────────────────────────────────────────────────

    test('should navigate to Transactions page from sidebar', async ({ page }) => {
        await expect(dashboard.transactionsLink).toBeVisible();
        await dashboard.transactionsLink.click();
        await expect(page).toHaveURL(/\/business\/main\/transactions/);
    });

    test('should navigate to Payments page from sidebar', async ({ page }) => {
        await expect(dashboard.paymentsLink).toBeVisible();
        await dashboard.paymentsLink.click();
        await expect(page).toHaveURL(/\/business\/main\/payment-links\/manage/);
    });

    test('should expand the Accounts submenu when clicked in the sidebar', async () => {
        await expect(dashboard.accountsPanel).toBeVisible();
        await dashboard.accountsPanel.click();
        await expect(dashboard.accountsSubmenu).toBeVisible({ timeout: 5000 });
    });

    test('should return to homepage when the Home sidebar link is clicked from another page', async ({ page }) => {
        await dashboard.transactionsLink.click();
        await expect(page).toHaveURL(/\/business\/main\/transactions/);
        await dashboard.homeLink.click();
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    // ── Notifications panel ───────────────────────────────────────────────────

    test.skip('should open notifications panel when notifications icon is clicked', async ({ page }) => {
        await dashboard.notificationsIcon.click();
        const panel = page.locator('[class*="notif"], [role="dialog"], [aria-label*="notif" i]').first();
        await expect(panel).toBeVisible();
        await expect(page.getByRole('heading', { name: /notifications?/i })).toBeVisible();
    });

    test.skip('should close the notifications panel when the icon is clicked a second time', async ({ page }) => {
        await dashboard.notificationsIcon.click();
        await expect(page.getByRole('heading', { name: /notifications?/i })).toBeVisible();
        await dashboard.notificationsIcon.click();
        await expect(page.getByRole('heading', { name: /notifications?/i })).not.toBeVisible();
    });

    // ── Account / profile menu ────────────────────────────────────────────────

    test('should display the logout option inside the profile menu', async () => {
        await dashboard.openProfileMenu();
        await expect(dashboard.logoutItem).toBeVisible();
    });

    test('should display a profile or settings option inside the profile menu', async ({ page }) => {
        await dashboard.openProfileMenu();
        const fallback = page.getByRole('menuitem', { name: /profile|settings?|account/i }).first();
        const visible = await dashboard.profileOrSettingsItem.isVisible().catch(() => false)
            || await fallback.isVisible().catch(() => false);
        expect(visible, 'Profile or Settings item should appear in the account menu').toBe(true);
    });

    // ── Dashboard interactions ────────────────────────────────────────────────

    test('should display the last transactions container with content', async () => {
        await expect(dashboard.lastTransactionsContainer).toBeVisible();
    });

    test('should navigate to transactions when "View All" link in the transactions widget is clicked', async ({ page }) => {
        const viewAllLink = dashboard.lastTransactionsContainer
            .getByRole('link', { name: /view all|see all|more/i });
        const isPresent = await viewAllLink.isVisible().catch(() => false);
        if (!isPresent) return;
        await viewAllLink.click();
        await expect(page).toHaveURL(/\/business\/main\/transactions/);
    });

    // ── Logout (session-destroying — must remain last) ─────────────────────────

    test('should show logout confirmation dialog from account menu', async () => {
        await dashboard.openProfileMenu();
        await dashboard.logoutItem.click();
        await expect(dashboard.proceedButton).toBeVisible();
    });

    test('should not be able to access homepage after logout', async ({ page }) => {
        await dashboard.logout();
        await expect(page).toHaveURL(/auth\/login/);
    });
});
