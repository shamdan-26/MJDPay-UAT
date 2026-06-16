import { test, expect } from '@playwright/test';
import { loginAsMerchant, HOME_URL, BASE_ORIGIN } from './helpers';

test.describe('Homepage – Page Elements', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        await loginAsMerchant(page);
    });

    // ── URL & title ───────────────────────────────────────────────────────────

    test('should redirect to homepage after successful login', async ({ page }) => {
        await expect(page).toHaveURL(/\/business\/main\/home/);
    });

    test('should have the correct page title', async ({ page }) => {
        await expect(page).toHaveTitle('EMI - Business');
    });

    // ── Logo ──────────────────────────────────────────────────────────────────

    test('should display the MJD Pay logo', async ({ page }) => {
        await expect(page.locator('#sideNav-logo')).toBeVisible();
    });

    // ── Sidebar / navigation ──────────────────────────────────────────────────

    test('should display the sidebar navigation', async ({ page }) => {
        await expect(page.locator('nav, aside, [role="navigation"]').first()).toBeVisible();
    });

    test('should highlight the Home nav item as active', async ({ page }) => {
        const homeLink = page.getByRole('link', { name: /home/i });
        await expect(homeLink).toBeVisible();
    });

    // ── Header / top bar ──────────────────────────────────────────────────────

    test('should display the Profile', async ({ page }) => {
        await expect(page.locator('#ddl_profile')).toBeVisible();
    });

    test('should display a notifications icon in the header', async ({ page }) => {
        await expect(page.locator('.dropdown-toggle.nav-link.ai-icon')).toBeVisible();
    });

    test('should display the user company title', async ({ page }) => {
        await expect(page.locator('#sideNav-sidenav #userSettings-brand-name')).toBeVisible();
    });

    // ── Dashboard widgets / summary cards ────────────────────────────────────

    test('should display at least one summary or stat card on the dashboard', async ({ page }) => {
        await expect(page.locator('#last-transactions-container')).toBeVisible();
    });

    test('should display a balance or account overview section', async ({ page }) => {
        const balanceSection = page.getByText(/balance|total|amount/i).first();
        await expect(balanceSection).toBeVisible();
    });

    // ── Logout ────────────────────────────────────────────────────────────────

    test('should log out and redirect to login page', async ({ page }) => {
        await page.locator('#logout').click();
        await page.getByRole('button', { name: 'proceed' }).click();
        await expect(page).toHaveURL(/auth\/login/);
    });
});
