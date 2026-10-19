import { test, type Browser, type BrowserContext } from '@playwright/test';
import { createAdminContext } from '../../pageElements/Shared/AdminOtpConfigPage.ts';
import { AdminLimitsApi, TOPUP_TYPE_NAME, type TopupLimitsSnapshot } from '../../pageElements/Shared/AdminLimitsApi.ts';
import { gotoTopupScreen, type TopupSession } from './TopupHelper.ts';

/**
 * Shared setup for the Topup admin-config suites (TUA-… in docs/manual-test-cases/Topup-Admin-Config-Matrix.md).
 *
 * Account: the Biller account (Q9557, TopupHelper's default) → limit type "Biller Bank Cashin" (code 102003),
 * WALLET type "Biller", platform WEB (business portal). The account's risk tier is not assumed — every helper
 * here applies a change to LOW, MEDIUM and HIGH and restores all three.
 */
export const TOPUP_LIMIT_TYPE = TOPUP_TYPE_NAME.BILLER;
export const TOPUP_LIMIT_PLATFORM = 'WEB' as const;
export const TOPUP_WALLET_TYPE = 'Biller';

export interface AdminLimitsHandle {
    context: BrowserContext;
    api: AdminLimitsApi;
    snapshot: TopupLimitsSnapshot;
}

/** One admin login for the whole suite, plus the snapshot taken BEFORE the first change. */
export async function openAdminLimits(browser: Browser, typeName: string = TOPUP_LIMIT_TYPE, walletType: string = TOPUP_WALLET_TYPE): Promise<AdminLimitsHandle> {
    const context = await createAdminContext(browser);
    const page = await context.newPage();
    const api = new AdminLimitsApi(page);
    await api.open();
    const snapshot = await api.snapshotTopup(typeName, TOPUP_LIMIT_PLATFORM, walletType);
    return { context, api, snapshot };
}

/** afterAll body: restore + verify, then always close the admin context (restore errors still surface). */
export async function closeAdminLimits(handle: AdminLimitsHandle | undefined): Promise<void> {
    if (!handle) return;
    try {
        await handle.api.restoreTopup(handle.snapshot);
    } finally {
        await handle.context.close();
    }
}

export type TopupAttempt =
    /** Proceed stayed disabled — the amount was rejected on the amount screen. */
    | 'blocked-at-amount'
    /** Proceed was clicked but no Summary appeared (rejected at initiation). */
    | 'blocked-at-proceed'
    /** Summary appeared but Next led neither to the OTP screen nor the gateway popup. */
    | 'blocked-at-next'
    /** Next was answered with an HTTP 5xx: the server failed, no limit rejected anything. isBlocked() still counts it as blocked (unchanged for the older specs); only callers that must prove a LIMIT check for it. */
    | 'server-error'
    /** OTP screen or gateway popup reached — nothing was rejected before payment. */
    | 'proceeded';

/**
 * Drives Amount → Proceed → Summary → Next and reports where (if anywhere) the flow was stopped. It never pays:
 * an abandoned OTP/gateway step consumes no quota (TUA-C28). The caller must call `gotoTopupScreen` again for the
 * next attempt (done here at the start so every attempt is a fresh amount screen).
 */
/** What the backend answered the last time an attempt stopped at Next ('' when it did not): callers put it in their failure message. */
export const attemptInfo = { detail: '' };

export async function attemptTopup(session: TopupSession, amount: string, method: 'mada' | 'visa' | 'master' = 'mada'): Promise<TopupAttempt> {
    const { page, topup, otp } = session;
    await gotoTopupScreen(session);
    await topup.selectPaymentMethod(method);
    await topup.enterAmount(amount);

    // Give the field's own validation a beat to settle before judging the button.
    await page.waitForTimeout(500);
    if (await topup.proceedButton.isDisabled()) return 'blocked-at-amount';

    await topup.proceedButton.click();
    const summary = await topup.summaryNextButton.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
    if (!summary) return 'blocked-at-proceed';

    await topup.waitForSummaryToSettle().catch(() => { /* summary may not show a total when blocked late */ });
    const popup = page.context().waitForEvent('page', { timeout: 15000 }).then(() => true).catch(() => false);
    const otpShown = otp.inputs.first().waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
    // Evidence only: what the backend answered to the initiation call, so a stop at Next can be explained (limit, commission, wallet...).
    const initiation = page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/v1\/payments$/.test(r.url()), { timeout: 15000 }).catch(() => null);
    await topup.summaryNextButton.click();
    const reached = await Promise.race([
        otpShown.then(v => (v ? true : popup)),
        popup.then(v => (v ? true : otpShown)),
    ]);
    if (!reached) {
        const res = await initiation;
        const detail = res ? `HTTP ${res.status()} ${(await res.text().catch(() => '')).slice(0, 300)}` : 'no initiation call was sent';
        test.info().annotations.push({ type: 'stopped-at-next', description: detail });
        attemptInfo.detail = detail;
        console.warn(`[topup-limits] the attempt stopped at Next: ${detail}`);
        return res && res.status() >= 500 ? 'server-error' : 'blocked-at-next';
    }
    attemptInfo.detail = '';
    return 'proceeded';
}

/** True for any outcome where the platform stopped the top-up before payment. */
export const isBlocked = (a: TopupAttempt) => a !== 'proceeded';
