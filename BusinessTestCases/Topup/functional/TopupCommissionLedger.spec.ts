import { test, expect, type BrowserContext, type Request } from '@playwright/test';
import { type AdminCommissionManagementPage } from '../../pageElements/CommissionManagement/AdminCommissionManagementPage';
import { loginToCommissionManagement } from '../../CommissionManagement/helpers/CommissionManagementHelper.ts';
import {
    SUMMARY_LABEL,
    TOPUP_BILLER_COMMISSION_TRANSACTION_TYPE,
    prepareBillerTopupCommission,
    restoreBillerTopupCommission,
    loginToTopup,
    gotoTopupScreen,
    findTopupCase,
    completeCardPayment,
    clickSummaryNextAndDetectOtp,
    decodeJwtProfileCode,
    getLatestTopupTransactionFromSql,
    getTopupTransactionLogHistoryFromSql,
    LOGIN_MOBILE,
    type TopupSession,
    type TopupCommissionSnapshot,
    type TopupBaseTransactionRow,
    type TopupTransactionLogSqlRow,
} from '../helpers/TopupHelper.ts';
import { getOtpFromDb } from '../../Login/helpers/LoginHelper.ts';
import { closeSqlPool } from '../../../support/sqlServerClient';
import { openAdminLimits, closeAdminLimits, type AdminLimitsHandle } from '../helpers/TopupLimitsHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Topup × commission — what the LEDGER and the payment request do (not just the Summary preview).
// Business rules agreed 2026-10-13 (docs/manual-test-cases/Topup-Admin-Config-Matrix.md §M):
//   • VAT is inside the commission (commission × 15/115); Total = amount − commission.
//   • A failed payment leaves commission 0 / VAT 0 in the ledger and the balance unchanged.
//   • A pending payment reserves the commission; SUCCESS posts it, FAILED/timeout releases it.
//   • Summary commission and VAT equal destination_commission_amount / destination_vat_amount.
//   • The client can never set its own commission (server computes it).
// Open (recorded, not asserted): how a PENDING reservation shows in the ledger, and whether a rule edited between
// Summary and Next re-prices the payment — both are written to the test annotations for the first run.
//
// Q9557, the live WEB "Biller Bank Cashin" tier, a mid-tier amount. Every cap on the account is lifted for the suite
// through the admin limits API and restored + re-read in afterAll; the commission row's state is restored too.
// Each test makes a REAL gateway payment (VISA simulator: 1 success, 2 canceled/failed, 3 pending).
// ─────────────────────────────────────────────────────────────────────────────

const VAT_RATE = 0.15;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const expectedVat = (commission: number) => round2(commission * VAT_RATE / (1 + VAT_RATE));

interface Quote { original: number; commission: number; vat: number; total: number }
interface Watch { profileCode: () => string; idempotencyKey: () => string; stop: () => void }

test.describe('Topup – Commission ledger and integrity', { tag: ['@topup', '@functional'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(240000);

    let session: TopupSession;
    let adminContext: BrowserContext;
    let adminCommission: AdminCommissionManagementPage;
    let commissionSnapshot: TopupCommissionSnapshot;
    let limits: AdminLimitsHandle | undefined;
    let amount: number;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(180000);
        session = await loginToTopup(browser);

        limits = await openAdminLimits(browser);
        const high = 100_000_000;
        await limits.api.setAmountAllTiers(limits.snapshot, { min: 0, hourly: high, daily: high, monthly: high, yearly: high });
        await limits.api.setCountAllTiers(limits.snapshot, { hourly: 100000, daily: 100000, monthly: 100000, yearly: 100000 });
        await limits.api.setWalletAllTiers(limits.snapshot, { maxBalance: high });

        const { context, commission } = await loginToCommissionManagement(browser);
        adminContext = context;
        adminCommission = commission;
        commissionSnapshot = await prepareBillerTopupCommission(commission);
        amount = Math.round((Number(commissionSnapshot.values.minimumAmount) + Number(commissionSnapshot.values.maximumAmount)) / 2);
    });

    test.afterAll(async () => {
        try {
            if (commissionSnapshot) await restoreBillerTopupCommission(adminCommission, commissionSnapshot);
        } finally {
            try {
                await closeAdminLimits(limits);
            } finally {
                await adminContext?.close().catch(() => { /* already closed */ });
                await session?.page.close().catch(() => { /* already closed */ });
                await closeSqlPool();
            }
        }
    });

    /** Captures the account's profile code and the payment's idempotency key off POST /api/v1/payments. */
    function watchPayment(): Watch {
        const { page } = session;
        let profileCode = '';
        let idempotencyKey = '';
        const onRequest = (req: Request) => {
            if (req.method() === 'POST' && req.url().endsWith('/api/v1/payments')) {
                const auth = req.headers()['authorization'];
                if (auth) profileCode = decodeJwtProfileCode(auth);
                idempotencyKey = req.headers()['idempotencykey'] ?? idempotencyKey;
            }
        };
        page.on('request', onRequest);
        return { profileCode: () => profileCode, idempotencyKey: () => idempotencyKey, stop: () => page.off('request', onRequest) };
    }

    /** Summary figures for `amount` (no payment) — the quote the customer sees. */
    async function quoteFor(value: number): Promise<Quote> {
        const { topup } = session;
        await gotoTopupScreen(session);
        await topup.selectPaymentMethod('visa');
        await topup.enterAmount(String(value));
        await topup.clickProceedButton();
        await topup.waitForSummaryToSettle();
        const q = {
            original: await topup.getSummaryMoney(SUMMARY_LABEL.original),
            commission: await topup.getSummaryMoney(SUMMARY_LABEL.commission),
            vat: await topup.getSummaryMoney(SUMMARY_LABEL.vat),
            total: await topup.getSummaryMoney(SUMMARY_LABEL.total),
        };
        await topup.clickSummaryCancelButton();
        return q;
    }

    /** Ledger rows for one payment: its base_transaction (if any was posted) and its full transaction_log lifecycle. */
    async function ledgerFor(w: Watch): Promise<{ base: TopupBaseTransactionRow | null; history: TopupTransactionLogSqlRow[] }> {
        expect(w.profileCode(), 'no Authorization header was captured off POST /api/v1/payments').not.toBe('');
        expect(w.idempotencyKey(), 'no idempotencyKey header was captured off POST /api/v1/payments').not.toBe('');
        const latest = await getLatestTopupTransactionFromSql(w.profileCode());
        const base = latest && latest.idempotency_key === w.idempotencyKey() ? latest : null;
        const history = await getTopupTransactionLogHistoryFromSql(w.idempotencyKey());
        return { base, history };
    }

    /** Full real payment from the amount form; `code` is the VISA simulator result (omit for success). */
    async function pay(code?: string): Promise<{ w: Watch; balanceBefore: number }> {
        const { topup } = session;
        await gotoTopupScreen(session);
        const balanceBefore = await topup.getBalanceBeforeTopup();
        const w = watchPayment();
        await completeCardPayment(session, 'visa', { ...findTopupCase('VISA'), amount: String(amount) }, code);
        await topup.clickResultOkButton();
        return { w, balanceBefore };
    }

    test('TUA-D19: a FAILED payment leaves commission 0 / VAT 0 in the ledger and the balance unchanged', async () => {
        const { topup } = session;
        const { w, balanceBefore } = await pay('2');
        w.stop();
        const { base, history } = await ledgerFor(w);
        expect(history.length, 'the failed payment must be in transaction_log').toBeGreaterThan(0);
        expect(history[history.length - 1]!.status, 'terminal status of a canceled payment').not.toBe('SUCCESS');
        if (base) {
            expect(Number(base.destination_commission_amount ?? 0)).toBe(0);
            expect(Number(base.destination_vat_amount ?? 0)).toBe(0);
        }
        await gotoTopupScreen(session);
        expect(await topup.getBalanceBeforeTopup()).toBeCloseTo(balanceBefore, 2);
    });

    test('TUA-D20: a PENDING payment — balance unchanged, ledger state recorded (reservation shape is open)', async () => {
        const { topup } = session;
        const { w, balanceBefore } = await pay('3');
        w.stop();
        const { base, history } = await ledgerFor(w);
        test.info().annotations.push({
            type: 'observed',
            description: `pending → transaction_log: ${history.map(h => `${h.status}/${h.reasons}`).join(' → ') || 'none'}; ` +
                `base_transaction: ${base ? `${base.status}, commission=${base.destination_commission_amount}, vat=${base.destination_vat_amount}` : 'no row'}`,
        });
        expect(history.length, 'the pending payment must be in transaction_log').toBeGreaterThan(0);
        expect(history[history.length - 1]!.status).not.toBe('SUCCESS');
        await gotoTopupScreen(session);
        expect(await topup.getBalanceBeforeTopup()).toBeCloseTo(balanceBefore, 2);
    });

    test('TUA-D16: a SUCCESS payment — the ledger commission and VAT equal what the Summary quoted', { annotation: [{ type: 'testcase', description: 'TUB-20: Ledger commission and VAT equal the Summary figures' }] }, async () => {
        const quote = await quoteFor(amount);
        const { w } = await pay();
        w.stop();
        const { base, history } = await ledgerFor(w);
        expect(base, 'a successful payment must be posted in base_transaction').not.toBeNull();
        expect(base!.status).toBe('POSTED');
        expect(history[history.length - 1]!.status).toBe('SUCCESS');
        expect(Number(base!.destination_commission_amount ?? 0)).toBeCloseTo(quote.commission, 2);
        expect(Number(base!.destination_vat_amount ?? 0)).toBeCloseTo(quote.vat, 2);
        expect(quote.vat).toBeCloseTo(expectedVat(quote.commission), 2);
        expect(quote.total).toBeCloseTo(quote.original - quote.commission, 2);
    });

    test('TUA-SEC: a tampered payment request cannot change the commission — the server computes it', async () => {
        const { page } = session;
        const quote = await quoteFor(amount);
        const touched: string[] = [];
        await page.route('**/api/v1/payments', async route => {
            const req = route.request();
            if (req.method() !== 'POST') return route.continue();
            let body: Record<string, unknown> | null = null;
            try { body = req.postDataJSON() as Record<string, unknown>; } catch { /* not JSON */ }
            if (!body || typeof body !== 'object') return route.continue();
            const tampered: Record<string, unknown> = { ...body };
            for (const key of Object.keys(tampered)) {
                if (/commission|fee|vat|total/i.test(key)) {
                    tampered[key] = 0;
                    touched.push(key);
                }
            }
            // Always send an explicit zero commission/VAT, even if the real request carries none.
            if (!touched.length) {
                tampered['commission'] = 0;
                tampered['vat'] = 0;
            }
            return route.continue({ postData: JSON.stringify(tampered), headers: { ...req.headers(), 'content-type': 'application/json' } });
        });
        try {
            const { w } = await pay();
            w.stop();
            const { base } = await ledgerFor(w);
            test.info().annotations.push({ type: 'observed', description: touched.length ? `request fields zeroed: ${touched.join(', ')}` : 'the real request carries no commission field; injected commission/vat = 0' });
            expect(base, 'the tampered payment either posts with the CONFIGURED commission or is rejected').not.toBeNull();
            expect(Number(base!.destination_commission_amount ?? 0), 'ledger commission must be the configured one, not the tampered 0').toBeCloseTo(quote.commission, 2);
            expect(Number(base!.destination_vat_amount ?? 0)).toBeCloseTo(quote.vat, 2);
        } finally {
            await page.unroute('**/api/v1/payments');
        }
    });

    test('TUA-D22: a rule edited between Summary and Next — records which commission the payment uses (no rule asserted)', async () => {
        const { page, topup, otp } = session;
        await adminCommission.gotoDefaultCommission();
        const found = await adminCommission.findRowByFilter(TOPUP_BILLER_COMMISSION_TRANSACTION_TYPE, commissionSnapshot.values.platform);
        if (!found) throw new Error('TUA-D22: could not re-locate the live Biller Bank Cashin row.');
        const original = found.values;
        test.skip(!original.isPercentage, 'Needs a percentage rule: a fixed value cannot be re-typed here (TU-CM03 defect).');
        const newValue = Number(original.value) === 5 ? '6' : '5';

        const w = watchPayment();
        try {
            await gotoTopupScreen(session);
            await topup.selectPaymentMethod('visa');
            await topup.enterAmount(String(amount));
            await topup.clickProceedButton();
            await topup.waitForSummaryToSettle();
            const quoted = await topup.getSummaryMoney(SUMMARY_LABEL.commission);

            // Admin changes the rule while the customer sits on the Summary.
            await adminCommission.editCommission(found.row, { ...original, value: newValue });
            try {
                const popupPromise = page.context().waitForEvent('page', { timeout: 20000 });
                popupPromise.catch(() => { /* reported below */ });
                if (await clickSummaryNextAndDetectOtp(topup, otp)) {
                    await otp.fillAndVerify(await getOtpFromDb(LOGIN_MOBILE));
                }
                const popup = await popupPromise.catch(() => {
                    throw new Error('TUA-D22: the gateway popup never opened even with every limit lifted.');
                });
                topup.setActivePage(popup);
                await popup.waitForLoadState('load');
                const data = findTopupCase('VISA');
                await topup.fillCardDetails(data.cardNumber, data.expiry, data.holder, data.cvv);
                await topup.clickPayNowButton();
                if (await topup.isHyperpayScreenDisplayed()) await topup.clickHyperpaySubmitButton();
                await popup.waitForEvent('close', { timeout: 30000 }).catch(() => null);
                topup.resetActivePage();
                await topup.clickResultOkButton();
            } finally {
                await adminCommission.editCommission(found.row, original);
            }
            w.stop();
            const { base } = await ledgerFor(w);
            const charged = Number(base?.destination_commission_amount ?? NaN);
            const requoted = round2(amount * Number(newValue) / 100);
            test.info().annotations.push({
                type: 'observed',
                description: `quoted ${quoted}, rule edited to ${newValue}% (would be ${requoted}), ledger charged ${charged} → ${Math.abs(charged - quoted) < 0.005 ? 'QUOTE HELD' : Math.abs(charged - requoted) < 0.005 ? 'RE-PRICED at payment' : 'neither (see values)'}`,
            });
            expect(base, 'the payment should have been posted').not.toBeNull();
        } finally {
            w.stop();
        }
    });
});
