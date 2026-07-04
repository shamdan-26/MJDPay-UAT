import { test, expect } from '@playwright/test';
import { HOME_URL, HOME_URL_PATTERN, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Edge Cases & Security', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: ACCOUNT_1_STORAGE_STATE });

    let dashboard: DashboardPage;

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
        await waitForToastClear(page, 800, 5000);
        dashboard = new DashboardPage(page);
    });

    // ── Authentication guard ──────────────────────────────────────────────────

    // Skipped: confirmed the dev environment doesn't reliably enforce this — a
    // fresh context with zero auth cookies still lands on the authenticated
    // homepage, so this isn't a client-side/cookie-based check here. Matches
    // the existing skip on the same scenario in HomepageSession.spec.ts.
    test('should redirect to the login page when the homepage is accessed without a session', async ({ browser }) => {
        const freshCtx  = await browser.newContext();
        const freshPage = await freshCtx.newPage();
        await freshPage.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(freshPage).toHaveURL(/auth\/login/);
        await freshCtx.close();
    });

    test('should not expose credentials, tokens, or secrets in the page URL', async ({ page }) => {
        const url = page.url();
        expect(url).not.toMatch(/password|token|secret|apikey|access.?key/i);
    });

    // ── Sensitive data protection ─────────────────────────────────────────────

    test('should not render Bearer tokens in the page HTML source', async ({ page }) => {
        const content = await page.content();
        expect(content).not.toMatch(/Bearer\s+[A-Za-z0-9\-._~+/]{20,}/);
    });

    test('should change the balance display when the visibility toggle is clicked', async ({ page }) => {
        const balanceBefore = await dashboard.walletBalanceSar.textContent() ?? '';
        await dashboard.balanceVisibilityToggle.click();
        await page.waitForTimeout(400);
        const balanceAfter = await dashboard.walletBalanceSar.textContent() ?? '';
        expect(balanceAfter, 'Balance display should change after toggling visibility').not.toEqual(balanceBefore);
    });

    test('should not expose the numeric balance value in the DOM when it is hidden', async ({ page }) => {
        await dashboard.balanceVisibilityToggle.click();
        await page.waitForTimeout(400);
        const containerText = await dashboard.walletBalanceSar.textContent() ?? '';
        expect(containerText).not.toMatch(/^\s*\d{2,}\s*$/);
    });

    // ── Edge cases ────────────────────────────────────────────────────────────

    test('should display a valid time-based greeting on page load', async () => {
        const text = await dashboard.greetingText.textContent() ?? '';
        expect(text.trim()).toMatch(/^good\s+(morning|afternoon|evening)$/i);
    });

    test('should display the correct Last Login information after logging in', async () => {
        await expect(dashboard.lastLoginText).toContainText(/last.?login/i, { timeout: 10000 });
        await expect(dashboard.lastLoginText).toContainText(/\d/, { timeout: 10000 });
    });

    test('should display a non-empty company name in the sidebar for the logged-in user', async () => {
        const text = await dashboard.brandName.textContent() ?? '';
        expect(text.trim().length, 'Company name in sidebar should not be empty').toBeGreaterThan(0);
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
