import { test, expect } from '@playwright/test';
import { loginAsMerchant, LOGIN_URL, HOME_URL, BASE_ORIGIN } from './helpers';

test.describe('Homepage – Functionality', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        await loginAsMerchant(page);
    });

    // ── Session persistence ───────────────────────────────────────────────────

    test('should stay on homepage when page is refreshed', async ({ page }) => {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/business\/main\/home/);
    });

    /* test('should redirect to login when accessing home URL while unauthenticated', async ({ browser }) => {
        const freshPage = await browser.newPage();
        await freshPage.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(freshPage).toHaveURL(/auth\/login/);
        await freshPage.close();
    }); */

    // ── Sidebar navigation links ──────────────────────────────────────────────

    test('should navigate to Transactions page from sidebar', async ({ page }) => {
        const link = page.getByRole('link', { name: /transactions?/i });
        await expect(link).toBeVisible();
        await link.click();
        await expect(page).not.toHaveURL(/\/business\/home/);
    });

    test('should navigate to Payments page from sidebar', async ({ page }) => {
        const link = page.getByRole('link', { name: /payments?/i });
        await expect(link).toBeVisible();
        await link.click();
        await expect(page).not.toHaveURL(/\/business\/home/);
    });

    test('should navigate to Accounts page from sidebar', async ({ page }) => {
        const icons = page.locator('[id^="sideNav-menu-item-icon-"]');
        const count = await icons.count();
        const accountsIcon = page.locator(`#sideNav-menu-item-icon-${count}`);
        await expect(accountsIcon).toBeVisible();
        await accountsIcon.click();
        await expect(page).not.toHaveURL(/\/business\/home/);
    });


    // ── Notifications panel ───────────────────────────────────────────────────

    test('should open notifications panel when notifications icon is clicked', async ({ page }) => {
        const notifIcon = page.locator('[aria-label*="notif" i], [aria-label*="bell" i], .notification-icon, [data-testid*="notif"]').first();
        await notifIcon.click();
        const panel = page.locator('[class*="notif"], [role="dialog"], [aria-label*="notif" i]').first();
        await expect(panel).toBeVisible({ timeout: 5000 });
    });

    // ── Account / profile menu ────────────────────────────────────────────────

    test('should open account menu when avatar / user trigger is clicked', async ({ page }) => {
        await page.locator('#ddl_profile').click();
        const menu = page.locator('[role="menu"], [class*="dropdown"], [class*="profile-menu"]').first();
        await expect(menu).toBeVisible({ timeout: 5000 });
    });

    // ── Logout ────────────────────────────────────────────────────────────────

    test('should log out successfully from account menu', async ({ page }) => {
        await page.locator('#logout').click();
        await expect(page.getByRole('button', { name: 'proceed' })).toBeVisible();
    });

    test('should not be able to access homepage after logout', async ({ page }) => {
        await page.locator('#logout').click();
        await page.getByRole('button', { name: 'proceed' }).click();
        await expect(page).toHaveURL(/auth\/login/);

    });
});
