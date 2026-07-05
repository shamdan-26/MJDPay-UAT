import { test, expect } from '@playwright/test';
import {
    HOME_URL, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE,
    POST_NAV_SETTLE_MS, TOAST_APPEAR_TIMEOUT_MS, TOAST_CLEAR_TIMEOUT_MS,
} from '../HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { HomepageBalanceCardPage } from '../../pageElements/homepage/HomepageBalanceCardPage';
import { waitForToastClear } from '../../shared';

// True security/edge-case checks only. UI-presence assertions (greeting
// format, last-login text, brand name) live in ui/HomepageGreetingPage.spec.ts
// and ui/HomepageSidebarNavigationPage.spec.ts; the balance-toggle behavior
// itself lives in HomepageBalanceCard.spec.ts; the unauthenticated-redirect
// check lives in HomepageSession.spec.ts — this file only owns the assertion
// that the hidden balance doesn't leak its numeric value.
test.describe('Homepage – Edge Cases & Security', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: ACCOUNT_1_STORAGE_STATE });

    let dashboard: DashboardPage;
    let balanceCard: HomepageBalanceCardPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(POST_NAV_SETTLE_MS);
        await waitForToastClear(page, TOAST_APPEAR_TIMEOUT_MS, TOAST_CLEAR_TIMEOUT_MS);
        dashboard   = new DashboardPage(page);
        balanceCard = new HomepageBalanceCardPage(page);
    });

    test('should not expose credentials, tokens, or secrets in the page URL', async ({ page }) => {
        const url = page.url();
        expect(url).not.toMatch(/password|token|secret|apikey|access.?key/i);
    });

    test('should not render Bearer tokens in the page HTML source', async ({ page }) => {
        const content = await page.content();
        expect(content).not.toMatch(/Bearer\s+[A-Za-z0-9\-._~+/]{20,}/);
    });

    test('should not expose the numeric balance value in the DOM when it is hidden', async ({ page }) => {
        await balanceCard.balanceVisibilityToggle.click();
        await page.waitForTimeout(400);
        const containerText = await dashboard.walletBalanceSar.textContent() ?? '';
        expect(containerText).not.toMatch(/^\s*\d{2,}\s*$/);
    });

    test('should not produce unhandled JavaScript errors on page load', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));
        await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
        await waitForToastClear(page);
        const critical = errors.filter(e =>
            !e.includes('Non-Error promise rejection') &&
            !e.includes('ResizeObserver') &&
            !e.includes('ChunkLoadError')
        );
        expect(critical).toHaveLength(0);
    });

    test('should keep the URL clean with no query parameters on the homepage', async ({ page }) => {
        const url  = new URL(page.url());
        const keys = [...url.searchParams.keys()];
        const hasSensitiveParams = keys.some(k => /token|auth|key|session|password/i.test(k));
        expect(hasSensitiveParams, 'Homepage URL should not contain sensitive query parameters').toBe(false);
    });

    test('should display the homepage content in the correct language (no untranslated keys)', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();
        const hasTranslationKeys = /^[a-z_]+\.[a-z_]+$/im.test(bodyText);
        expect(hasTranslationKeys, 'Page should not render raw i18n translation keys').toBe(false);
    });
});
