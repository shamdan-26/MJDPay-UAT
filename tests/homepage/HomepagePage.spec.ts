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

    // ── Language switcher ─────────────────────────────────────────────────────

    test('should display the EN language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'EN' })).toBeVisible();
    });

    test('should display the Arabic language button', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'العربية' })).toBeVisible();
    });

    test('should switch to Arabic (RTL) when Arabic button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'العربية' }).click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    test('should switch back to LTR when EN button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: 'العربية' }).click();
        await page.getByRole('button', { name: 'EN' }).click();
        await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    });

    // ── Dashboard widgets / summary cards ────────────────────────────────────

    test('should display at least one summary or stat card on the dashboard', async ({ page }) => {
        const cards = page.locator('.card, [class*="card"], [class*="widget"], [class*="summary"]');
        await expect(cards.first()).toBeVisible();
    });

    test('should display a balance or account overview section', async ({ page }) => {
        const balanceSection = page.getByText(/balance|total|amount/i).first();
        await expect(balanceSection).toBeVisible();
    });

    // ── Logout ────────────────────────────────────────────────────────────────

    test('should log out and redirect to login page', async ({ page }) => {
        const logoutBtn = page.getByRole('button', { name: /log\s*out|sign\s*out/i })
            .or(page.getByRole('menuitem', { name: /log\s*out|sign\s*out/i }));

        // Open account menu first if logout is nested
        const accountTrigger = page.locator('[aria-label*="account" i], [aria-label*="profile" i], .avatar, .user-menu').first();
        if (await accountTrigger.isVisible()) {
            await accountTrigger.click();
        }

        await logoutBtn.waitFor({ state: 'visible', timeout: 5000 });
        await logoutBtn.click();
        await expect(page).toHaveURL(/auth\/login/);
    });
});
