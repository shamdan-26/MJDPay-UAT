import { expect, test, type Browser, type Page, type Request } from '@playwright/test';
import { AdminLimitsApi, ladderCount, type CountTier } from '../../pageElements/Shared/AdminLimitsApi';
import { createAdminContext } from '../../pageElements/Shared/AdminOtpConfigPage';
import { completeCardPayment, findTopupCase, getTopupTransactionLogHistoryFromSql, type TopupAccount, type TopupSession, type TopupTransactionLogSqlRow } from '../TopupHelper';
import testAccounts from '../../../data/testAccounts.json';

// Shared by the TUB-* browser-tier specs in this folder (TopupBiz*UI.spec.ts).

export interface PaidFlow {
    /** idempotencyKey header of POST /api/v1/payments for this top-up ('' if not captured). */
    key: string;
    /** Wallet balance shown on the form before the payment started. */
    before: number;
    amount: string;
}

/**
 * Runs one top-up from the amount form to the gateway result, leaving the result screen open
 * (OK not clicked). `code` is the gateway simulator outcome: VISA 1=Success 2=User canceled
 * 3=Pending 4=Error limit 5=Error too many tries; MADA/MASTER 3DS Y/N/D/U/X.
 */
export async function payWithOutcome(session: TopupSession, method: 'visa' | 'mada' | 'master', code?: string): Promise<PaidFlow> {
    const { page, topup } = session;
    const data = findTopupCase(method.toUpperCase() as 'VISA' | 'MADA' | 'MASTER');
    let key = '';
    const onRequest = (req: Request) => {
        if (req.method() === 'POST' && req.url().endsWith('/api/v1/payments')) key = req.headers()['idempotencykey'] ?? key;
    };
    page.on('request', onRequest);
    try {
        const before = await readBalanceBefore(session);
        await completeCardPayment(session, method, data, code);
        await topup.resultTitle.waitFor({ state: 'visible', timeout: 30000 });
        return { key, before, amount: data.amount };
    } finally {
        page.off('request', onRequest);
    }
}

/**
 * Skipped on request (2026-10-18): ledger assertions need the SQL Server (10.10.100.241:1433), which was unreachable
 * from the test machine. While true, the UI checks of each case still run and the ledger assertions are skipped.
 * Set to false once the DB connection is available.
 */
export const SKIP_LEDGER_ASSERTIONS = true;

/** Ledger rows of one top-up, oldest first, polled briefly because the terminal row is written asynchronously. */
export async function ledgerFor(key: string, terminalExpected: boolean, timeoutMs = 15000): Promise<TopupTransactionLogSqlRow[]> {
    const deadline = Date.now() + timeoutMs;
    let rows: TopupTransactionLogSqlRow[] = [];
    while (Date.now() < deadline) {
        rows = await getTopupTransactionLogHistoryFromSql(key);
        const terminal = rows.filter(r => r.status !== 'PENDING').length;
        if (terminalExpected ? terminal >= 1 : rows.length >= 1) return rows;
        await new Promise(r => setTimeout(r, 1000));
    }
    return rows;
}

/**
 * Clicks Proceed and waits for the Summary step, failing fast with the backend's answer when
 * it does not appear. Without this a rejected summary call (limit, minimum, commission config)
 * just leaves the form on step 1 and the test burns its whole timeout in waitForSummaryToSettle.
 */
export async function proceedToSummary(session: TopupSession): Promise<void> {
    const { page, topup } = session;
    const answered = page.waitForResponse(r => /\/api\/v1\/payments\/summary/.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 }).catch(() => null);
    await topup.clickProceedButton();
    const res = await answered;
    if (res && res.status() >= 400) {
        throw new Error(`Proceed was rejected: HTTP ${res.status()} ${(await res.text().catch(() => '')).slice(0, 300)}`);
    }
    await expect(topup.summaryNextButton, 'Summary step did not appear after Proceed').toBeVisible({ timeout: 15000 });
    await topup.waitForSummaryToSettle(10);
}

/**
 * Reads the wallet balance shown on the form, reloading once if the balance card is still
 * blank (a slow or failed wallet-balance call leaves a placeholder and a disabled Proceed).
 * Sets the page object's "before" value, so checkBalance* keep working afterwards.
 */
export async function readBalanceBefore(session: TopupSession): Promise<number> {
    const { page, topup } = session;
    try {
        return await topup.getBalanceBeforeTopup();
    } catch {
        await page.reload({ waitUntil: 'domcontentloaded' });
        return await topup.getBalanceBeforeTopup();
    }
}

/**
 * Dev counts every INITIATED top-up against the hourly count cap (Merchant Cashin, code 102002: 5 per hour), paid
 * or not, and these files start more than that per run. This helper raises the WEB hourly COUNT of Merchant Cashin to
 * RAISED_HOURLY_COUNT for every risk tier that is below `needed` (the larger periods are scaled with it, see raisedTier), and
 * returns restore(), which writes the original four counts of each changed tier back and verifies them. Right after the write
 * the helper re-reads every tier and, if anything differs from what it wrote, puts the originals back at once and throws.
 * Row shape and PUT body are the live ones confirmed on 2026-10-17 (see AdminLimitsApi.getCountTiers).
 * The limit is shared on dev: call restore() in afterAll, and run one UI file at a time.
 */
const MERCHANT_CASHIN = '102002';
const COUNT_PLATFORM = 'web';
const RAISED_HOURLY_COUNT = 30;

/** Raises the hourly count and scales the larger periods with it (AdminLimitsApi.ladderCount holds the rule and its evidence). */
function raisedTier(t: CountTier): CountTier {
    return { ...t, values: ladderCount({ ...t.values, hourly: RAISED_HOURLY_COUNT }) };
}

async function putTiers(api: AdminLimitsApi, tiers: CountTier[]): Promise<void> {
    for (const t of tiers) await api.putCountTier(MERCHANT_CASHIN, COUNT_PLATFORM, t);
}

export async function raiseMerchantCountHeadroom(browser: Browser, needed = 12): Promise<() => Promise<void>> {
    const context = await createAdminContext(browser);
    let changed: CountTier[] = [];
    try {
        const api = new AdminLimitsApi(await context.newPage());
        await api.open();
        const original = await api.getCountTiers(MERCHANT_CASHIN, COUNT_PLATFORM);
        if (original.length === 0) {
            console.warn(`[topup-ui] Merchant Cashin (${MERCHANT_CASHIN}) has no WEB count-limit rows in the admin portal; nothing raised.`);
            return async () => { /* nothing was changed */ };
        }
        changed = original.filter(t => t.values.hourly < needed);
        const lowest = Math.min(...original.map(t => t.values.hourly));
        test.info().annotations.push({ type: 'merchant-hourly-count-cap', description: `original hourly count per tier: ${original.map(t => `${t.risk}=${t.values.hourly}`).join(', ')}${changed.length ? `; hourly raised to ${RAISED_HOURLY_COUNT} for ${changed.map(t => t.risk).join(', ')}` : '; already enough'}` });
        if (changed.length === 0) return async () => { /* nothing was changed */ };
        console.warn(`[topup-ui] Merchant Cashin hourly COUNT cap is ${lowest}; raising it to ${RAISED_HOURLY_COUNT} for this run (restored in afterAll).`);

        try {
            await putTiers(api, changed.map(raisedTier));
            const after = await api.getCountTiers(MERCHANT_CASHIN, COUNT_PLATFORM);
            const expected = original.map(t => changed.includes(t) ? raisedTier(t) : t);
            expect(after, 'only the counts of the low tiers may change, and the other tiers stay as they were').toEqual(expected);
        } catch (e) {
            // Put the originals back before reporting the failure; if that is refused too, say both so nobody believes the cap was left clean.
            const rollback = await putTiers(api, changed).then(() => 'The original counts were put back.', (err: unknown) => `ROLLBACK FAILED, check Merchant Cashin web counts by hand: ${String(err)}`);
            changed = [];
            throw new Error(`Raising the Merchant Cashin count cap failed: ${String(e)} ${rollback}`);
        }
        const toRestore = changed;
        return async () => {
            const restoreContext = await createAdminContext(browser);
            try {
                const restoreApi = new AdminLimitsApi(await restoreContext.newPage());
                await restoreApi.open();
                await putTiers(restoreApi, toRestore);
                expect(await restoreApi.getCountTiers(MERCHANT_CASHIN, COUNT_PLATFORM), 'Merchant Cashin count limits restored').toEqual(original);
            } finally {
                await restoreContext.close();
            }
        };
    } finally {
        await context.close();
    }
}

/** Optional extra account from .env.dev, format "company:mobile" (shared default password). Null when unset: the caller skips with the variable name. */
export function envAccount(name: string): TopupAccount | null {
    const v = process.env[name];
    if (!v) return null;
    const [company, mobile] = v.split(':');
    return company && mobile ? { company, mobile, password: testAccounts.defaultPassword } : null;
}

/**
 * Records the idempotency key of every top-up initiation (POST /api/v1/payments) the page sends until stop() is called.
 * Evidence only: it reads what the app sent, it sends nothing.
 */
export function watchInitiation(page: Page) {
    const keys: string[] = [];
    const onRequest = (req: Request) => {
        if (req.method() === 'POST' && req.url().endsWith('/api/v1/payments')) keys.push(req.headers()['idempotencykey'] ?? '');
    };
    page.on('request', onRequest);
    return { keys, stop: () => page.off('request', onRequest) };
}
