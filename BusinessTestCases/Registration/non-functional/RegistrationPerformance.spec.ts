import { test, expect } from '@playwright/test';
import { REGISTER_URL, generateKSAMobile, goToInfoStepMocked, goToVerificationStepMocked, json } from '../helpers/RegistrationHelper';
import { RegistrationMobilePage } from '../../pageElements/Registration/RegistrationMobilePage';

// ─────────────────────────────────────────────────────────────────────────────
// Performance budgets for the wizard front end. Budgets are generous (CI/dev variance) and exist to catch
// regressions of an order of magnitude, not to benchmark. Backend calls are mocked so only the UI is timed.
// ─────────────────────────────────────────────────────────────────────────────
const BUDGET = { firstContentMs: 5_000, stepTransitionMs: 4_000, uploadUnderSlow3gMs: 45_000 };

test.describe('Registration – Performance budgets', { tag: ['@registration', '@ui', '@performance'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    test.beforeEach(() => { test.setTimeout(150_000); });

    test(`should render the mobile step within ${BUDGET.firstContentMs}ms (largest contentful paint)`, { annotation: [{ type: 'testcase', description: "RG-PERF-01: Should render the mobile step within …ms (largest contentful paint)" }] }, async ({ page }) => {
        await page.addInitScript(() => {
            (window as unknown as { __lcp: number }).__lcp = 0;
            new PerformanceObserver(list => {
                const entries = list.getEntries();
                (window as unknown as { __lcp: number }).__lcp = entries[entries.length - 1].startTime;
            }).observe({ type: 'largest-contentful-paint', buffered: true });
        });
        await page.goto(REGISTER_URL, { waitUntil: 'load' });
        await new RegistrationMobilePage(page).mobileInput.waitFor({ state: 'visible' });
        await page.waitForTimeout(500);
        const lcp = await page.evaluate(() => (window as unknown as { __lcp: number }).__lcp);
        test.info().annotations.push({ type: 'lcp-ms', description: String(Math.round(lcp)) });
        expect(lcp, `LCP ${Math.round(lcp)}ms`).toBeLessThan(BUDGET.firstContentMs);
    });

    test(`should move from Mobile to Business Info within ${BUDGET.stepTransitionMs}ms of pressing Next (mocked backend)`, { annotation: [{ type: 'testcase', description: "RG-PERF-02: Should move from Mobile to Business Info within …ms of pressing Next (mocked backend)" }] }, async ({ page }) => {
        await page.route('**/emi-profile/api/v1/register/mobile/otp', route => json(route, 200, { requestId: 'r', otpRequired: false, sessionToken: { token: 'a.b.c', expirationDuration: 600000 }, refreshToken: { token: 'd.e.f', expirationDuration: 1200000 } }));
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded' });
        const mobilePage = new RegistrationMobilePage(page);
        await mobilePage.mobileInput.fill(generateKSAMobile());
        const started = Date.now();
        await mobilePage.nextButton.click();
        await page.locator('#register-profile-card-MERCHANT').waitFor({ state: 'visible' });
        const elapsed = Date.now() - started;
        test.info().annotations.push({ type: 'transition-ms', description: String(elapsed) });
        expect(elapsed).toBeLessThan(BUDGET.stepTransitionMs);
    });

    test('should keep the main thread responsive (no long task over 500ms) while loading Business Info', { annotation: [{ type: 'testcase', description: "RG-PERF-03: Should keep the main thread responsive (no long task over 500ms) while loading Business Info" }] }, async ({ page }) => {
        await page.addInitScript(() => {
            (window as unknown as { __longest: number }).__longest = 0;
            new PerformanceObserver(list => {
                for (const e of list.getEntries()) (window as unknown as { __longest: number }).__longest = Math.max((window as unknown as { __longest: number }).__longest, e.duration);
            }).observe({ type: 'longtask', buffered: true });
        });
        await goToInfoStepMocked(page);
        const longest = await page.evaluate(() => (window as unknown as { __longest: number }).__longest);
        test.info().annotations.push({ type: 'longest-task-ms', description: String(Math.round(longest)) });
        expect(longest).toBeLessThan(500);
    });

    test(`should finish a 5MB upload within ${BUDGET.uploadUnderSlow3gMs}ms on a throttled connection (mocked server)`, { annotation: [{ type: 'testcase', description: "RG-PERF-04: Should finish a 5MB upload within …ms on a throttled connection (mocked server)" }] }, async ({ page, context }) => {
        await page.route('**/file/attachment/upload**', route => json(route, 200, { fileId: 'file-x' }));
        await goToVerificationStepMocked(page);
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
        const started = Date.now();
        const uploaded = page.waitForResponse(r => /file\/attachment\/upload/.test(r.url()), { timeout: BUDGET.uploadUnderSlow3gMs });
        await page.locator('input[type="file"]').first().setInputFiles({ name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024 - 1024, 1) });
        await uploaded;
        const elapsed = Date.now() - started;
        test.info().annotations.push({ type: 'upload-ms', description: String(elapsed) });
        expect(elapsed).toBeLessThan(BUDGET.uploadUnderSlow3gMs);
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    });
});
