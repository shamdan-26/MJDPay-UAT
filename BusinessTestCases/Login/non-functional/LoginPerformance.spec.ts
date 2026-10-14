import { test, expect } from '../../fixtures';
import { LOGIN_URL, NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD } from '../LoginHelper';
import { mockSignIn } from '../helpers/loginMocks';

// Front-end performance budgets for the login page. Budgets are generous (dev variance) and catch order-of-magnitude
// regressions only. Backend calls are mocked wherever the measurement is about the UI, not the gateway.
const BUDGET = { lcpMs: 5_000, interactiveMs: 6_000, errorToastMs: 3_000, transferKb: 12_000, requests: 110, longTaskMs: 1_000 };

test.describe('Login – Performance budgets', { tag: ['@login', '@ui', '@performance'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'non-functional' }] }, () => {
    test.beforeEach(() => { test.setTimeout(90_000); });

    test(`should paint the login form within ${BUDGET.lcpMs}ms (largest contentful paint)`, { annotation: [{ type: 'testcase', description: "LG-PERF-01: Should paint the login form within …ms (largest contentful paint)" }] }, async ({ page, loginPage }) => {
        await page.addInitScript(() => {
            (window as unknown as { __lcp: number }).__lcp = 0;
            new PerformanceObserver(list => {
                const entries = list.getEntries();
                (window as unknown as { __lcp: number }).__lcp = entries[entries.length - 1].startTime;
            }).observe({ type: 'largest-contentful-paint', buffered: true });
        });
        await page.goto(LOGIN_URL, { waitUntil: 'load' });
        await loginPage.formBox.waitFor({ state: 'visible' });
        await page.waitForTimeout(500);
        const lcp = await page.evaluate(() => (window as unknown as { __lcp: number }).__lcp);
        test.info().annotations.push({ type: 'lcp-ms', description: String(Math.round(lcp)) });
        expect(lcp, `LCP ${Math.round(lcp)}ms`).toBeLessThan(BUDGET.lcpMs);
    });

    test(`should let the user type within ${BUDGET.interactiveMs}ms of navigation`, { annotation: [{ type: 'testcase', description: "LG-PERF-02: Should let the user type within …ms of navigation" }] }, async ({ page, loginPage }) => {
        const start = Date.now();
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
        await loginPage.companyInput.fill(NEGATIVE_COMPANY);
        const ms = Date.now() - start;
        test.info().annotations.push({ type: 'interactive-ms', description: String(ms) });
        expect(ms).toBeLessThan(BUDGET.interactiveMs);
    });

    test('should have no layout shift larger than 0.1 while the login form loads (CLS)', { annotation: [{ type: 'testcase', description: "LG-PERF-03: Should have no layout shift larger than 0.1 while the login form loads (CLS)" }] }, async ({ page, loginPage }) => {
        await page.addInitScript(() => {
            (window as unknown as { __cls: number }).__cls = 0;
            new PerformanceObserver(list => {
                for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
                    if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
                }
            }).observe({ type: 'layout-shift', buffered: true });
        });
        await page.goto(LOGIN_URL, { waitUntil: 'load' });
        await loginPage.formBox.waitFor({ state: 'visible' });
        await page.waitForTimeout(1000);
        const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
        test.info().annotations.push({ type: 'cls', description: cls.toFixed(3) });
        expect(cls).toBeLessThan(0.1);
    });

    test(`should show the error toast within ${BUDGET.errorToastMs}ms of a mocked rejected sign-in`, { annotation: [{ type: 'testcase', description: "LG-PERF-04: Should show the error toast within …ms of a mocked rejected sign-in" }] }, async ({ page, loginPage }) => {
        await loginPage.goto(LOGIN_URL);
        await mockSignIn(page, 401);
        await loginPage.fill(NEGATIVE_COMPANY, NEGATIVE_MOBILE, VALID_PASSWORD);
        const start = Date.now();
        await loginPage.submit();
        await page.locator('.toast-snackbar__detail, [class*="toast"], [class*="snack"]').first().waitFor({ state: 'visible', timeout: BUDGET.errorToastMs });
        test.info().annotations.push({ type: 'toast-ms', description: String(Date.now() - start) });
    });

    test(`should keep the main thread free of long tasks over ${BUDGET.longTaskMs}ms while loading`, { annotation: [{ type: 'testcase', description: "LG-PERF-05: Should keep the main thread free of long tasks over …ms while loading" }] }, async ({ page, loginPage }) => {
        await page.addInitScript(() => {
            (window as unknown as { __longest: number }).__longest = 0;
            new PerformanceObserver(list => {
                for (const e of list.getEntries()) (window as unknown as { __longest: number }).__longest = Math.max((window as unknown as { __longest: number }).__longest, e.duration);
            }).observe({ type: 'longtask', buffered: true });
        });
        await page.goto(LOGIN_URL, { waitUntil: 'load' });
        await loginPage.formBox.waitFor({ state: 'visible' });
        await page.waitForTimeout(1000);
        const longest = await page.evaluate(() => (window as unknown as { __longest: number }).__longest);
        test.info().annotations.push({ type: 'longest-task-ms', description: String(Math.round(longest)) });
        expect(longest).toBeLessThan(BUDGET.longTaskMs);
    });

    test(`should load with fewer than ${BUDGET.requests} requests and ${BUDGET.transferKb} KB transferred`, { annotation: [{ type: 'testcase', description: "LG-PERF-06: Should load with fewer than … requests and … KB transferred" }] }, async ({ page, loginPage }) => {
        const origin = new URL(LOGIN_URL).origin;
        const sizes: Promise<number>[] = [];
        page.on('requestfinished', req => {
            if (!req.url().startsWith(origin)) return;
            sizes.push(req.sizes().then(s => s.responseBodySize).catch(() => 0));
        });
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
        await loginPage.formBox.waitFor({ state: 'visible' });
        const bytes = (await Promise.all(sizes)).reduce((a, b) => a + b, 0);
        const requests = sizes.length;
        test.info().annotations.push({ type: 'weight', description: `${requests} requests, ${Math.round(bytes / 1024)} KB` });
        expect(requests).toBeLessThan(BUDGET.requests);
        expect(bytes / 1024).toBeLessThan(BUDGET.transferKb);
    });

    test('should stay usable on a slow 3G connection (form visible within 20 s)', { annotation: [{ type: 'testcase', description: "LG-PERF-07: Should stay usable on a slow 3G connection (form visible within 20 s)" }] }, async ({ page, loginPage }) => {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(loginPage.formBox).toBeVisible({ timeout: 20000 });
    });
});
