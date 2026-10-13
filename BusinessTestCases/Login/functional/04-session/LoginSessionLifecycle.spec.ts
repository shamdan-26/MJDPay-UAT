import { test, expect } from '../../../fixtures';
import { LOGIN_URL } from '../../LoginHelper';
import { loginToDashboard } from '../../helpers/loginSession';

// Session behaviour after a successful login: logout, back button, refresh, deep links, multiple tabs/contexts.
// Each test performs real sign-ins with the happy-path account (never the NEGATIVE/LOCKOUT ones).

const DASHBOARD_URL = LOGIN_URL.replace('/auth/login', '/main');

test.describe('Login — Session Lifecycle', { tag: ['@login', '@functional', '@session'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    test('should keep the session after a page refresh', async ({ page }) => {
        await loginToDashboard(page);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page).not.toHaveURL(/auth\/login/, { timeout: 20000 });
    });

    test('should send a logged-out user to the login page when pressing Back', async ({ page, dashboard }) => {
        await loginToDashboard(page);
        await dashboard.logout();
        await expect(page).toHaveURL(/auth\/login/, { timeout: 15000 });
        await page.goBack();
        await expect(page).toHaveURL(/auth\/login/, { timeout: 15000 });
    });

    test('should clear the stored session after logout', async ({ page, dashboard }) => {
        await loginToDashboard(page);
        await dashboard.logout();
        await expect(page).toHaveURL(/auth\/login/, { timeout: 15000 });
        const leftovers = await page.evaluate(() => {
            const keys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
            return keys.filter(k => /token|jwt|auth|session/i.test(k) && (localStorage.getItem(k) || sessionStorage.getItem(k)));
        });
        expect(leftovers, 'auth-looking storage keys still populated after logout').toEqual([]);
    });

    test('should redirect an unauthenticated visit to a protected page to the login page', async ({ page }) => {
        await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/auth\/login/, { timeout: 20000 });
    });

    test('should not allow a protected page to be reopened after logout by navigating to its URL', async ({ page, dashboard }) => {
        await loginToDashboard(page);
        await dashboard.logout();
        await expect(page).toHaveURL(/auth\/login/, { timeout: 15000 });
        await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/auth\/login/, { timeout: 20000 });
    });

    test('should return to the originally requested page after logging in from a deep link', async ({ page }) => {
        const deepLink = LOGIN_URL.replace('/auth/login', '/main/transactions');
        await page.goto(deepLink, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/auth\/login/, { timeout: 20000 });
        const wantsReturnUrl = /returnUrl|redirect|next/i.test(page.url());
        test.fixme(!wantsReturnUrl, 'The app does not carry the requested page through the login redirect — confirm intended behaviour with product.');
        await loginToDashboard(page);
        await expect(page).toHaveURL(/transactions/);
    });

    test('should log the second tab out when the user logs out in the first tab', async ({ page, dashboard, context }) => {
        await loginToDashboard(page);
        const second = await context.newPage();
        await second.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
        await expect(second).not.toHaveURL(/auth\/login/, { timeout: 20000 });
        await dashboard.logout();
        await expect(page).toHaveURL(/auth\/login/, { timeout: 15000 });
        await second.reload({ waitUntil: 'domcontentloaded' });
        await expect(second).toHaveURL(/auth\/login/, { timeout: 20000 });
    });

    test('should allow the same account to sign in from two separate browser contexts', async ({ browser }) => {
        const a = await browser.newContext({ permissions: ['geolocation'], geolocation: { latitude: 24.7136, longitude: 46.6753 } });
        const b = await browser.newContext({ permissions: ['geolocation'], geolocation: { latitude: 24.7136, longitude: 46.6753 } });
        try {
            const pa = await a.newPage();
            const pb = await b.newPage();
            await loginToDashboard(pa);
            await loginToDashboard(pb);
            // Policy is product-defined (single-session vs multi-session); record the outcome rather than assume it.
            const aStillIn = await pa.reload({ waitUntil: 'domcontentloaded' }).then(() => !pa.url().includes('/auth/login'));
            test.info().annotations.push({ type: 'concurrent-session-policy', description: aStillIn ? 'multi-session allowed' : 'first session ended by second login' });
            await expect(pb).not.toHaveURL(/auth\/login/);
        } finally {
            await a.close();
            await b.close();
        }
    });
});
