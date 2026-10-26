import { expect, request as playwrightRequest, type APIRequestContext, type APIResponse, type Browser, type Page, type Request } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { decodeJwtProfileCode, getTopupTransactionLogHistoryFromSql, loginToTopup, HOME_URL, type TopupAccount, type TopupTransactionLogSqlRow } from './TopupHelper.ts';
import { openAdminLimits, closeAdminLimits } from './TopupLimitsHelper.ts';
import { TOPUP_TYPE_NAME } from '../../pageElements/Shared/AdminLimitsApi';
import { FIXED_OTP } from '../../../support/otp';
import testAccounts from '../../../data/testAccounts.json';
import { boxStep } from '../../shared/boxStep.ts';

/**
 * API+DB helper for the business-rule top-up specs (TopupBiz*.spec.ts). No UI locators, no UI assertions.
 *
 * AUTH: the gateway's `device-finger-print` header embeds the access token, so a fingerprint built outside the app is
 * answered with 401 on authenticated endpoints (same finding as AdminLimitsApi / AdminCommissionManagementPage). The
 * session therefore logs in ONCE through the real web app (OTP auto-submits) and relays the headers of a real gateway
 * request the app sent. Everything after that is direct API calls. The relayed token lives ~18 min: `headers()` logs in
 * again when the capture is older than 10 min.
 *
 * Contract source: postman/Topup-API-majdpay.postman_collection.json. Anything the collection does not show (error
 * bodies, commission/VAT field names) is NOT assumed: specs assert on status class and on DB state, or skip.
 *
 * Flow on dev: POST /api/v1/payments (PENDING, isOtpRequired) -> POST /api/v1/payments/verify (POSTED, txnReference)
 * -> gateway card step (browser only) -> POST /api/v1/payments/update-status.
 */

// Accounts come from data/testAccounts.json (shared default password). The UI Topup specs use Q9557 with a separate
// LOGIN_PASSWORD; the business specs use the listed Biller (limit/commission rows targeted are the "Biller Bank Cashin"
// ones) and the listed Merchant as the second user.
// Set TOPUP_BIZ_ACCOUNT=company:mobile in .env.dev to run the business specs as another account when the default one has hit a limit
// (a capped wallet / count makes POST /api/v1/payments answer 500). Add TOPUP_BIZ_ACCOUNT_TYPE=merchant when that account is a Merchant:
// the admin limit rows the specs change (and restore) must be the rows of the account's own type. The commission spec is Biller-only.
export const BILLER: TopupAccount = envAccount('TOPUP_BIZ_ACCOUNT') ?? { ...testAccounts.biller, password: testAccounts.defaultPassword };
const BIZ_IS_MERCHANT = process.env['TOPUP_BIZ_ACCOUNT_TYPE']?.toLowerCase() === 'merchant';
export const BIZ_LIMIT_TYPE: string = BIZ_IS_MERCHANT ? TOPUP_TYPE_NAME.MERCHANT : TOPUP_TYPE_NAME.BILLER;
export const BIZ_WALLET_TYPE: string = BIZ_IS_MERCHANT ? 'Merchant' : 'Biller';
export const SECOND_USER: TopupAccount = { ...testAccounts.merchant, password: testAccounts.defaultPassword };
export const WRONG_OTP = '194857';

/**
 * An amount that passes the amount limits on dev. Dev answered HOURLY_TRANSACTION_LIMITS_EXCEEDED for 10 SAR with
 * "Biller Bank Cashin hourly limits: minimum 100.00, maximum 100000.00" (2026-10-15), so "valid" top-ups use 100.00 or more.
 * Override with TOPUP_TEST_AMOUNT in .env.dev if the minimum changes.
 */
export const AMT = process.env['TOPUP_TEST_AMOUNT'] ?? '100.00';
/** `AMT` times a factor, 2 decimals (e.g. amt(1.1) = "110.00"). */
export const amt = (factor: number): string => (Number(AMT) * factor).toFixed(2);

/** messageCode of the first error in a gateway error body, e.g. HOURLY_TRANSACTION_LIMITS_EXCEEDED ('' when absent). */
export const codeOf = (body: any): string => String((Array.isArray(body) ? body[0] : body)?.message?.messageCode ?? '');

export interface BizSession {
    request: APIRequestContext;
    /** Gateway origin taken from the captured request (not assumed). */
    base: string;
    profileCode: string;
    account: TopupAccount;
    /** Headers to send, refreshed when the relayed token gets old. Adds a unique request id per call. */
    headers(extra?: Record<string, string>): Promise<Record<string, string>>;
    /** Make the app send a fresh request and take its headers (use after a 401). */
    refresh(): Promise<void>;
    dispose(): Promise<void>;
}

const DROP = new Set(['host', 'content-length', 'connection', 'accept-encoding', 'cookie', 'content-type', 'toster_id']);
const MAX_AGE_MS = 10 * 60 * 1000;

interface Capture { page: Page; base: string; latest: Record<string, string>; at: number; appStatuses: string[] }

const relevant = (r: Request) => r.url().includes('gateway-') && !!r.headers()['authorization'];

function pick(headers: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) if (!k.startsWith(':') && !DROP.has(k.toLowerCase())) out[k] = v; // HTTP/2 pseudo-headers (:authority ...) are not sendable
    return out;
}

/**
 * Logs in through the app and keeps `latest` = headers of the MOST RECENT authenticated gateway request the app sent.
 * The app can rotate its session shortly after load (a snapshot taken too early answers 401 SESSION_INVALID), so the
 * listener keeps overwriting it and `refresh()` makes the app send a new request on demand.
 */
async function openCapture(browser: Browser, account: TopupAccount): Promise<Capture> {
    const ui = await loginToTopup(browser, account);
    const cap: Capture = { page: ui.page, base: '', latest: {}, at: 0, appStatuses: [] };
    // What the APP's own gateway calls got back: tells "our relayed headers are refused" (app 200, ours 401) from
    // "the whole session was killed, e.g. another login as this account" (app 401 too).
    ui.page.on('response', r => {
        if (!r.url().includes('gateway-') || !r.request().headers()['authorization']) return;
        cap.appStatuses.push(`${r.status()} ${new URL(r.url()).pathname}`);
        if (cap.appStatuses.length > 8) cap.appStatuses.shift();
    });
    ui.page.on('request', async r => {
        if (!relevant(r)) return;
        cap.latest = pick(await r.allHeaders().catch(() => r.headers()));
        cap.base = new URL(r.url()).origin;
        cap.at = Date.now();
    });
    await refreshCapture(cap);
    return cap;
}

async function refreshCapture(cap: Capture): Promise<void> {
    const before = cap.at;
    const next = cap.page.waitForRequest(relevant, { timeout: 30_000 });
    await cap.page.goto(HOME_URL);
    await next;
    await cap.page.waitForLoadState('networkidle').catch(() => { /* app keeps polling: the latest capture is still current */ });
    for (let i = 0; i < 20 && cap.at === before; i++) await cap.page.waitForTimeout(250);
}

/** Log in through the app once, relay its real headers, and fail loudly if they are not accepted (a 401 must never look like a rule). */
export async function startSession(browser: Browser, account: TopupAccount = BILLER): Promise<BizSession> {
    return boxStep('startSession', async () => {
    const request = await playwrightRequest.newContext();
    let cap: Capture;
    try {
        cap = await openCapture(browser, account);
    } catch (e) {
        await request.dispose();
        throw e;
    }

    const session = {
        request,
        get base() { return cap.base; },
        get profileCode() { return decodeJwtProfileCode(cap.latest['authorization']); },
        account,
        async headers(extra: Record<string, string> = {}) {
            if (Date.now() - cap.at > MAX_AGE_MS) await session.refresh();
            return { ...cap.latest, 'content-type': 'application/json', toster_id: `toster_ID_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ...extra };
        },
        async refresh() { await refreshCapture(cap); },
        async dispose() {
            await cap.page.close().catch(() => { /* already closed */ });
            await request.dispose();
        },
    } as BizSession;

    // Probe with one automatic refresh: the first snapshot can already be stale.
    const probe = await call(session, 'GET', '/api/v1/wallets/balance');
    if (probe.status !== 200) {
        const detail = `${probe.status} ${probe.text.slice(0, 200)} [url ${session.base}] [app's own last gateway calls: ${cap.appStatuses.join(', ') || 'none seen'}] [capture age ${Math.round((Date.now() - cap.at) / 1000)}s]`;
        await session.dispose();
        throw new Error(`startSession: relayed headers for ${account.company} were refused by GET /api/v1/wallets/balance after a refresh (${detail}). If two workers log in as the same account they invalidate each other: run with --workers=1.`);
    }
    return session;
    });
}

export interface Called { status: number; ok: boolean; text: string; body: any; res: APIResponse }

/** Sends one gateway request with the relayed headers; on 401 refreshes the capture and retries ONCE (a 401 means nothing was processed). */
export async function call(s: BizSession, method: 'GET' | 'POST', path: string, opts: { data?: unknown; headers?: Record<string, string> } = {}): Promise<Called> {
    return boxStep('call', async () => {
        const send = async (): Promise<Called> => {
            const res = await s.request.fetch(`${s.base}${path}`, { method, data: opts.data, headers: await s.headers(opts.headers) });
            const text = await res.text();
            let body: any = null;
            try { body = JSON.parse(text); } catch { body = text; }
            return { status: res.status(), ok: res.ok(), text, body, res };
        };
        let r = await send();
        if (r.status === 401) {
            await s.refresh();
            r = await send();
        }
        return r;
    });
}

export async function paymentMethodId(s: BizSession, code = 'VISA'): Promise<number> {
    return boxStep('paymentMethodId', async () => {
        const r = await call(s, 'GET', '/api/v1/payment-method');
        expect(r.status, 'GET /api/v1/payment-method').toBe(200);
        const list = r.body as Array<{ id: number; code: string }>;
        return (list.find(m => m.code?.toUpperCase() === code) ?? list[0]).id;
    });
}

export function openSummary(s: BizSession, amount: number | string) {
    return call(s, 'POST', '/api/v1/payments/summary/open', { data: { amount: Number(amount), platformType: 'web' } });
}

export interface Initiated { res: APIResponse; key: string; body: any; status: number; ok: boolean }

/** POST /api/v1/payments. `key` is the idempotency key sent as the request header; a fresh UUID unless given. `noKey` sends no idempotency header at all (key comes back as ''). */
export async function initiate(s: BizSession, amount: number | string, opts: { key?: string; methodId?: number; headers?: Record<string, string>; noKey?: boolean } = {}): Promise<Initiated> {
    return boxStep('initiate', async () => {
        const key = opts.noKey ? '' : opts.key ?? randomUUID();
        const methodId = opts.methodId ?? await paymentMethodId(s);
        const r = await call(s, 'POST', '/api/v1/payments', {
            data: { amount: String(amount), isDeductCommissionFromAmount: true, platformType: 'web', paymentMethodId: methodId },
            headers: { ...(opts.noKey ? {} : { idempotencyKey: key }), ...(opts.headers ?? {}) },
        });
        return { res: r.res, key, body: r.body, status: r.status, ok: r.ok };
    });
}

/** Id of a payment method other than `notId` (null when the account only has one). */
export async function otherPaymentMethodId(s: BizSession, notId: number): Promise<number | null> {
    return boxStep('otherPaymentMethodId', async () => {
        const r = await call(s, 'GET', '/api/v1/payment-method');
        expect(r.status, 'GET /api/v1/payment-method').toBe(200);
        const other = (r.body as Array<{ id: number }>).find(m => m.id !== notId);
        return other ? other.id : null;
    });
}

export async function verifyOtp(s: BizSession, paymentId: number | string, otp: string = FIXED_OTP, extra: Record<string, unknown> = {}, methodId?: number) {
    return boxStep('verifyOtp', async () => {
        const r = await call(s, 'POST', '/api/v1/payments/verify', { data: { paymentMethodId: methodId ?? await paymentMethodId(s), paymentId, otp, ...extra } });
        return { res: r.res, status: r.status, ok: r.ok, body: r.body };
    });
}

export function updateStatus(s: BizSession, checkoutId: string, methodId: number) {
    return call(s, 'POST', '/api/v1/payments/update-status', { data: { paymentMethodId: methodId, checkoutId } });
}

export interface Balances { available: number; raw: any }

export async function balances(s: BizSession): Promise<Balances> {
    return boxStep('balances', async () => {
        const r = await call(s, 'GET', '/api/v1/wallets/balance');
        expect(r.status, 'GET /api/v1/wallets/balance').toBe(200);
        const raw = r.body;
        const available = [raw.availableBalance, raw.balance, raw.currentBalance].find(v => typeof v === 'number');
        if (typeof available !== 'number') throw new Error(`balances: no numeric balance field in ${JSON.stringify(raw).slice(0, 200)}`);
        return { available, raw };
    });
}

/** Ledger lifecycle for one idempotency key (emi_transaction.transaction_log). */
export const ledger = (key: string): Promise<TopupTransactionLogSqlRow[]> => getTopupTransactionLogHistoryFromSql(key);

/** Polls the ledger until at least one row exists for the key, or returns [] after the timeout. */
export async function waitLedger(key: string, timeoutMs = 10_000): Promise<TopupTransactionLogSqlRow[]> {
    return boxStep('waitLedger', async () => {
        const end = Date.now() + timeoutMs;
        for (;;) {
            const rows = await ledger(key);
            if (rows.length || Date.now() > end) return rows;
            await new Promise(r => setTimeout(r, 1000));
        }
    });
}

/** Business rule "rejected": a 4xx answer and no payment created. Wording and exact code are intentionally not asserted. */
export function expectRejected(r: { status: number; body?: any }, what: string): void {
    expect([401, 412], `${what}: ${why(r)} means the request was NOT authenticated, that is not a business rejection`).not.toContain(r.status);
    expect(r.status, `${what}: expected a 4xx rejection, got ${why(r)}`).toBeGreaterThanOrEqual(400);
    expect(r.status, `${what}: expected a 4xx rejection, not a server error: ${why(r)}`).toBeLessThan(500);
}

/** One-line description of a response for assertion messages: status + the start of the body. */
export const why = (r: { status: number; body?: any }): string => `${r.status} ${typeof r.body === 'string' ? r.body : JSON.stringify(r.body)}`.slice(0, 400);

export const paymentIdOf = (body: any): number | string | undefined => (body && typeof body === 'object' ? body.id : undefined);

/** Deep-search a response for the first numeric value under a key matching the pattern; null if the field is not there. */
export function findNumber(body: unknown, key: RegExp): number | null {
    if (body && typeof body === 'object') {
        for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
            if (key.test(k) && typeof v === 'number') return v;
            const inner = findNumber(v, key);
            if (inner !== null) return inner;
        }
    }
    return null;
}

/** Half-up rounding to 2 decimals (business rule agreed 2026-10-13). */
export const round2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;

/** Optional extra accounts for eligibility cases; format "company:mobile". Unset means the case is skipped with a reason. */
export function envAccount(name: string): TopupAccount | null {
    const v = process.env[name];
    if (!v) return null;
    const [company, mobile] = v.split(':');
    return company && mobile ? { company, mobile, password: testAccounts.defaultPassword } : null;
}

/**
 * Dev counts every INITIATED top-up against the hourly/daily count limit, even if it is never paid (seen 2026-10-15:
 * HOURLY_TRANSACTION_COUNT_LIMITS_EXCEEDED, max 5 per hour for Biller Bank Cashin). The specs create many payments, so
 * without headroom they would be refused for the wrong reason. This raises the COUNT limits for the run and returns the
 * function that puts the original limits back (call it in afterAll). Amount limits and the minimum are left alone.
 */
export async function raiseHeadroom(browser: Browser): Promise<() => Promise<void>> {
    return boxStep('raiseHeadroom', async () => {
        const handle = await openAdminLimits(browser, BIZ_LIMIT_TYPE, BIZ_WALLET_TYPE);
        try {
            await handle.api.setCountAllTiers(handle.snapshot, { hourly: 1000, daily: 1000, monthly: 1000, yearly: 1000 });
        } catch (e) {
            await closeAdminLimits(handle);
            throw e;
        }
        return () => closeAdminLimits(handle);
    });
}

/**
 * Opt-in kill switch: TOPUP_DEV_PAYMENTS_DOWN=1 makes the business specs that initiate payments skip themselves. The 2026-10-20 run of
 * 500s on POST /api/v1/payments turned out to be the test account reaching its limit, not a dev outage, so this is OFF by default.
 */
export const DEV_PAYMENTS_DOWN = process.env.TOPUP_DEV_PAYMENTS_DOWN === '1';
