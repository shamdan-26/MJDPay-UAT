import { test, expect } from '@playwright/test';
import { loginAsMerchant, HOME_URL_PATTERN, BASE_ORIGIN } from './helpers';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Homepage – Page Elements', () => {
    test.describe.configure({ mode: 'serial' }); // serial: logout test destroys session — must run last

    let dashboard: DashboardPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        await loginAsMerchant(page);
        dashboard = new DashboardPage(page);
    });

    // ── URL & title ───────────────────────────────────────────────────────────

    test('should redirect to homepage after successful login', async ({ page }) => {
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should have the correct page title', async ({ page }) => {
        await expect(page).toHaveTitle('EMI - Business');
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should display the MJD Pay logo in the sidebar', async () => {
        await expect(dashboard.logo).toBeVisible();
    });

    // ── Sidebar / navigation ──────────────────────────────────────────────────

    test('should display the sidebar navigation container', async () => {
        await expect(dashboard.navigation).toBeVisible();
    });

    test('should display the Home link in the sidebar', async () => {
        await expect(dashboard.homeLink).toBeVisible();
    });

    test('should display the Transactions link in the sidebar', async () => {
        await expect(dashboard.transactionsLink).toBeVisible();
    });

    test('should display the Payments link in the sidebar', async () => {
        await expect(dashboard.paymentsLink).toBeVisible();
    });

    test('should display the Accounts item in the sidebar', async () => {
        await expect(dashboard.accountsPanel).toBeVisible();
    });

    test('should highlight the Home nav item as active on the homepage', async () => {
        await expect(dashboard.homeLink).toBeVisible();
        const classes = await dashboard.homeLink.getAttribute('class') ?? '';
        const ariaSelected = await dashboard.homeLink.getAttribute('aria-current');
        const isActive = classes.split(' ').includes('active') || ariaSelected === 'page';
        expect(isActive, 'Home link should be marked as active').toBe(true);
    });

    // ── Header / top bar ──────────────────────────────────────────────────────

    test('should display the Profile trigger in the header', async () => {
        await expect(dashboard.profileTrigger).toBeVisible();
    });

    test('should display a notifications icon in the header', async () => {
        await expect(dashboard.notificationsIcon).toBeVisible();
    });

    test('should display the user company name in the sidebar', async () => {
        await expect(dashboard.brandName).toBeVisible();
    });

    // ── Dashboard widgets ─────────────────────────────────────────────────────

    test('should display the last transactions container', async () => {
        await expect(dashboard.lastTransactionsContainer).toBeVisible();
    });

    test('should display a balance or account overview section', async ({ page }) => {
        const balanceSection = page.locator(
            '[id*="balance"], [id*="account"], [class*="balance"], [class*="account-overview"]'
        ).first();
        const fallback = page.getByText(/balance|total amount/i).first();
        const visible = await balanceSection.isVisible().catch(() => false)
            || await fallback.isVisible().catch(() => false);
        expect(visible, 'A balance or account overview element should be visible').toBe(true);
    });

    test('should display the wallet balance amount in SAR', async () => {
        await expect(dashboard.walletBalanceSar).toBeVisible({ timeout: 10000 });
    });

    test('should display the Last Login date and time', async () => {
        await expect(dashboard.lastLoginText).toBeVisible({ timeout: 10000 });
    });

    test('should display at most 10 rows in the last transactions table', async () => {
        await expect(dashboard.lastTransactionsContainer).toBeVisible({ timeout: 10000 });
        const rows = dashboard.lastTransactionsContainer.locator('tbody tr');
        const count = await rows.count();
        expect(count, 'Transaction table should show at most 10 rows').toBeLessThanOrEqual(10);
    });

    test('should display a transactions section heading', async ({ page }) => {
        const heading = page.getByRole('heading', { name: /transactions?/i });
        const label   = page.locator('[id*="transaction"] [class*="title"], [id*="transaction"] [class*="header"]').first();
        const visible = await heading.isVisible().catch(() => false)
            || await label.isVisible().catch(() => false);
        expect(visible, 'A transactions section heading or label should be visible').toBe(true);
    });

    // ── Logout (session-destroying — must remain last) ─────────────────────────

    test('should log out and redirect to login page', async ({ page }) => {
        await dashboard.logout();
        await expect(page).toHaveURL(/auth\/login/);
    });
});
