// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/functional/journeys/.
//
// Hostile browser conditions: the wizard in environments real users actually have — blocked third-party calls
// (ad blockers, privacy extensions), disabled/blocked storage, private browsing, throttled CPU, system clock skew
// against the 30-second OTP, and blocked images/fonts. The wizard must stay usable and fail gracefully.
//
// Prerequisites: none (mock-driven). `page.clock` needs Playwright >= 1.45. CPU throttling uses CDP (Chromium/Edge only).
// Assumptions  : third-party hosts blocked below are the ones the page contacts on load (Firebase installations observed).
import { test, expect, Page } from '@playwright/test';
import { REGISTER_URL, goToInfoStepMocked, goToOtpDialogMocked, mockOtpRequired, OTP_NOT_VALID, generateKSAMobile } from '../../helpers/RegistrationHelper';

const TRACKERS = /firebaseinstallations|googleapis\.com|google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|sentry/i;

async function expectWizardUsable(page: Page) {
    await expect(page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ })).toBeVisible({ timeout: 30000 });
    await page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ }).fill(generateKSAMobile());
    await expect(page.getByRole('button', { name: /next|التالي/i })).toBeEnabled();
}

test.describe('Registration – hostile browser conditions (DRAFT)', { tag: ['@registration', '@functional', '@resilience'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.beforeEach(() => { test.setTimeout(120_000); });

    test('works when an ad blocker blocks analytics and tracking hosts', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route(TRACKERS, route => route.abort('blockedbyclient'));
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expectWizardUsable(page);
        expect(errors, 'uncaught errors when trackers are blocked').toEqual([]);
    });

    test('works when third-party scripts time out', async ({ page }) => {
        await page.route(TRACKERS, route => route.abort('timedout'));
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expectWizardUsable(page);
    });

    test('degrades gracefully when localStorage and sessionStorage throw', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(() => {
            const deny = () => { throw new DOMException('denied', 'SecurityError'); };
            Object.defineProperty(window, 'localStorage', { get: deny });
            Object.defineProperty(window, 'sessionStorage', { get: deny });
        });
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expect(page.locator('body')).toBeVisible();
        // The app may legitimately show a message instead of the form — but it must not be a blank white page.
        expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(0);
        test.info().annotations.push({ type: 'page-errors', description: errors.join(' | ') || 'none' });
    });

    test('works in a fresh private-like context with cookies cleared on every navigation', async ({ context, page }) => {
        await context.clearCookies();
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expectWizardUsable(page);
        await context.clearCookies();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expectWizardUsable(page);
    });

    test('remains usable with images and web fonts blocked', async ({ page }) => {
        await page.route(/\.(png|jpe?g|gif|webp|svg|woff2?|ttf)(\?|$)/i, route => route.abort());
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expectWizardUsable(page);
    });

    test('stays responsive when the CPU is throttled 6x (low-end phone)', async ({ page, context }) => {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
        const started = Date.now();
        await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await expectWizardUsable(page);
        test.info().annotations.push({ type: 'throttled-ready-ms', description: String(Date.now() - started) });
        expect(Date.now() - started).toBeLessThan(30_000);
    });

    test('OTP validity: a code typed after the 30s window is not accepted by the UI timer logic', async ({ page }) => {
        await page.clock.install();
        await mockOtpRequired(page, () => OTP_NOT_VALID);
        await goToOtpDialogMocked(page);
        await page.clock.fastForward(35_000);
        // After the countdown the dialog must offer Resend (enabled) rather than keep the old code usable.
        await expect(page.getByRole('button', { name: /Click to resend|انقر لإعادة الإرسال/i })).toBeEnabled();
    });

    test('a device clock set far into the past or future does not break the wizard', async ({ page }) => {
        for (const iso of ['2001-01-01T00:00:00Z', '2099-01-01T00:00:00Z']) {
            await page.clock.install({ time: new Date(iso) });
            await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await expectWizardUsable(page);
        }
    });

    test('goes through Business Info when the browser reports no geolocation permission', async ({ context, page }) => {
        await context.clearPermissions();
        await goToInfoStepMocked(page);
        await expect(page.locator('#register-profile-card-MERCHANT')).toBeVisible();
    });
});
