import { test, expect, type BrowserContext, type Locator, type Request } from '@playwright/test';
import { COMMISSION_CATEGORY, type AdminCommissionManagementPage } from '../../pageElements/CommissionManagement/AdminCommissionManagementPage';
import { loginToCommissionManagement, ensureAccountCommissionExistsAndActive } from '../../CommissionManagement/helpers/CommissionManagementHelper.ts';
import {
    SUMMARY_LABEL,
    TOPUP_BILLER_COMMISSION_TRANSACTION_TYPE,
    TOPUP_BILLER_COMMISSION_TRANSACTION_TYPE_CODE,
    prepareBillerTopupCommission,
    restoreBillerTopupCommission,
    ensureAppScopedBillerTopupCommission,
    restoreAppScopedBillerTopupCommission,
    loginToTopup,
    gotoTopupScreen,
    findTopupCase,
    completeCardPayment,
    decodeJwtProfileCode,
    getLatestTopupTransactionFromSql,
    LOGIN_COMPANY,
    LOGIN_MOBILE,
    type TopupSession,
    type TopupCommissionSnapshot,
} from '../helpers/TopupHelper.ts';
import { closeSqlPool } from '../../../support/sqlServerClient';
import { openAdminLimits, closeAdminLimits, attemptTopup, isBlocked, type AdminLimitsHandle } from '../helpers/TopupLimitsHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Topup — LIMITS × COMMISSION matrix (TUA-D01…D25 and TUA-E01…E09, docs/manual-test-cases/Topup-Admin-Config-Matrix.md).
//
// Agreed rules (§M): limits are measured on the GROSS entered amount; the wallet ceiling is checked on balance + NET
// credit (amount − commission, VAT is inside the commission); there is no TXN_MAX and no WEEK (hourly is the tightest
// period); a refused top-up stops before Summary/OTP/payment.
//
// Q9557 (Biller), live WEB "Biller Bank Cashin" tier, a mid-tier amount. Limits are driven through AdminLimitsApi and
// restored + re-read in afterAll (and reset to the snapshot before every test). The commission row's Active state and any
// override/APP row a test touches are put back in the test's own finally.
//
// Not automated here, with the reason in each title:
//   • exact-usage cases (D01, D03, D06, D07, D08, D09, D16, D17) need a never-used account → one dedicated account each;
//   • D10 / D25 need a FIXED Biller rule: none can be created (one rule per type+platform, edit defect TU-CM03);
//   • D15 is the same assertion as D11/D12 (the Summary Total already includes the VAT, which sits inside the commission);
//   • D19 / D20 / E05 live in TopupCommissionLedger.spec.ts / TopupOtpFlow.spec.ts.
// ─────────────────────────────────────────────────────────────────────────────

const NEEDS_FRESH_ACCOUNT = 'Needs a dedicated never-used account (exact quota usage) — see matrix §0.4';
const NEEDS_FIXED_RULE = 'Needs a FIXED Biller rule: none can be created (one rule per type+platform; TU-CM03 blocks editing).';
const HIGH = 100_000_000;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

test.describe('Topup — limits × commission matrix', { tag: ['@topup', '@functional', '@topup-admin-config'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(240000);

    let session: TopupSession;
    let admin: AdminLimitsHandle | undefined;
    let adminContext: BrowserContext;
    let adminCommission: AdminCommissionManagementPage;
    let snapshot: TopupCommissionSnapshot;
    let minimumAmount: number;
    let amount: number;

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(180000);
        session = await loginToTopup(browser);
        admin = await openAdminLimits(browser);
        const { context, commission } = await loginToCommissionManagement(browser);
        adminContext = context;
        adminCommission = commission;
        snapshot = await prepareBillerTopupCommission(commission);
        minimumAmount = Number(snapshot.values.minimumAmount);
        amount = Math.round((minimumAmount + Number(snapshot.values.maximumAmount)) / 2);
    });

    test.afterAll(async () => {
        try {
            if (snapshot) await restoreBillerTopupCommission(adminCommission, snapshot);
        } finally {
            try {
                await closeAdminLimits(admin);
            } finally {
                await adminContext?.close().catch(() => { /* already closed */ });
                await session?.page.close().catch(() => { /* already closed */ });
                await closeSqlPool();
            }
        }
    });

    /** Every test starts from the original limits and an Active WEB commission row. */
    test.beforeEach(async () => {
        await admin!.api.restoreTopup(admin!.snapshot);
        const web = await adminCommission.apiFindCommission(TOPUP_BILLER_COMMISSION_TRANSACTION_TYPE_CODE, 'WEB');
        if (web && !web.isActive) await adminCommission.apiSetActive(web.id, true);
    });

    // ---------- helpers ----------

    /** Lifts the amount and count caps (and the minimum) so only the rule under test can bind. */
    const liftAmountAndCount = async () => {
        const { api, snapshot: s } = admin!;
        await api.setAmountAllTiers(s, { min: 0, hourly: HIGH, daily: HIGH, monthly: HIGH, yearly: HIGH });
        await api.setCountAllTiers(s, { hourly: 100000, daily: 100000, monthly: 100000, yearly: 100000 });
    };
    /** Caps hourly and daily amount at `cap` (monthly/yearly lifted). */
    const capDaily = async (cap: number) => {
        const { api, snapshot: s } = admin!;
        await api.setAmountAllTiers(s, { min: 0, hourly: cap, daily: cap, monthly: HIGH, yearly: HIGH });
    };
    const setWebCommissionActive = async (active: boolean) => {
        const web = await adminCommission.apiFindCommission(TOPUP_BILLER_COMMISSION_TRANSACTION_TYPE_CODE, 'WEB');
        if (!web) throw new Error('could not re-locate the live WEB Biller Bank Cashin row');
        await adminCommission.apiSetActive(web.id, active);
    };
    const readBalance = async () => {
        await gotoTopupScreen(session);
        return session.topup.getBalanceBeforeTopup();
    };
    const quote = async (value: number | string, method: 'mada' | 'visa' | 'master' = 'visa') => {
        const { topup } = session;
        await gotoTopupScreen(session);
        await topup.selectPaymentMethod(method);
        await topup.enterAmount(String(value));
        expect(await topup.proceedButton.isEnabled(), `Proceed must be enabled to quote ${value}`).toBe(true);
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
    };
    /** Visible validation/error text on the page right now (heuristic, bilingual-neutral). */
    const messageNow = async () => {
        const texts = await session.page.locator('[role="alert"], mat-error, .mat-mdc-form-field-error, [class*="error"], [class*="toast"], mat-snack-bar-container').allInnerTexts();
        return texts.map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ');
    };
    /** Attempts a top-up and returns the outcome plus whatever message is on screen. */
    const attemptWithMessage = async (value: number | string) => {
        const outcome = await attemptTopup(session, String(value));
        return { outcome, message: await messageNow() };
    };
    /** Blocked BEFORE the Summary (so no commission preview was ever shown). */
    const blockedBeforeSummary = (o: string) => o === 'blocked-at-amount' || o === 'blocked-at-proceed';
    /** Full real payment from the amount form (VISA simulator success). */
    const pay = async () => {
        const { page, topup } = session;
        let profileCode = '';
        const onRequest = (req: Request) => {
            if (req.method() === 'POST' && req.url().endsWith('/api/v1/payments')) {
                const auth = req.headers()['authorization'];
                if (auth) profileCode = decodeJwtProfileCode(auth);
            }
        };
        page.on('request', onRequest);
        try {
            const balanceBefore = await readBalance();
            await completeCardPayment(session, 'visa', { ...findTopupCase('VISA'), amount: String(amount) });
            await topup.clickResultOkButton();
            const base = profileCode ? await getLatestTopupTransactionFromSql(profileCode) : null;
            return { balanceBefore, base };
        } finally {
            page.off('request', onRequest);
        }
    };

    // ---------- D.1 Amount limits × commission ----------

    test('TUA-D02: gross over the cap is blocked even though the net would fit', async () => {
        await liftAmountAndCount();
        const q = await quote(amount);
        test.skip(q.commission <= 0, 'Needs a positive commission so that net < gross.');
        // Cap sits between net and gross of `amount`: the net fits, the gross does not.
        const cap = Math.floor(q.total);
        await capDaily(cap);
        expect(isBlocked(await attemptTopup(session, String(amount)))).toBe(true);
    });

    test('TUA-D04: an exhausted limit blocks at Proceed — no Summary, no commission preview', async () => {
        await capDaily(1);
        const outcome = await attemptTopup(session, String(amount));
        expect(blockedBeforeSummary(outcome), `blocked before the Summary (got "${outcome}")`).toBe(true);
    });

    test('TUA-D05: disabling the commission does not change the limit decision', async () => {
        await capDaily(amount - 1);
        expect(isBlocked(await attemptTopup(session, String(amount))), 'with commission').toBe(true);
        await setWebCommissionActive(false);
        expect(isBlocked(await attemptTopup(session, String(amount))), 'without commission').toBe(true);
    });

    // ---------- D.2 Wallet max-balance × commission ----------

    test('TUA-D11/D15: net credit (Summary Total, VAT inside the commission) landing exactly on the ceiling is allowed', async () => {
        await liftAmountAndCount();
        const q = await quote(amount);
        test.skip(q.commission <= 0, 'Needs a positive commission.');
        const balance = await readBalance();
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: round2(balance + q.total) });
        expect(await attemptTopup(session, String(amount))).toBe('proceeded');
    });

    test('TUA-D12: gross would exceed the ceiling but the net fits — allowed', async () => {
        await liftAmountAndCount();
        const q = await quote(amount);
        test.skip(q.commission <= 0, 'Needs a positive commission.');
        const balance = await readBalance();
        const ceiling = round2(balance + q.total);
        expect(balance + amount, 'precondition: gross exceeds the ceiling').toBeGreaterThan(ceiling);
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: ceiling });
        expect(await attemptTopup(session, String(amount))).toBe('proceeded');
    });

    test('TUA-D13: net exceeds the ceiling by 0.01 — blocked', async () => {
        await liftAmountAndCount();
        const q = await quote(amount);
        test.skip(q.commission <= 0, 'Needs a positive commission.');
        const balance = await readBalance();
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: round2(balance + q.total - 0.01) });
        expect(isBlocked(await attemptTopup(session, String(amount)))).toBe(true);
    });

    test('TUA-D14: commission removed → the same amount is now blocked (the net grew)', async () => {
        await liftAmountAndCount();
        const q = await quote(amount);
        test.skip(q.commission <= 0, 'Needs a positive commission.');
        const balance = await readBalance();
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: round2(balance + q.total) });
        expect(await attemptTopup(session, String(amount)), 'with commission').toBe('proceeded');
        await setWebCommissionActive(false);
        expect(isBlocked(await attemptTopup(session, String(amount))), 'without commission').toBe(true);
    });

    // ---------- D.3 Count limits × commission ----------

    test('TUA-D18: a daily count of 0 blocks regardless of commission — and no commission is previewed', async () => {
        await admin!.api.setCountAllTiers(admin!.snapshot, { daily: 0 });
        const outcome = await attemptTopup(session, String(amount));
        expect(blockedBeforeSummary(outcome), `blocked before the Summary (got "${outcome}")`).toBe(true);
    });

    // ---------- D.4 Platform and override interplay ----------

    test('TUA-D21: an account override prices the top-up, and the limit decision is identical', async () => {
        await liftAmountAndCount();
        const defaultQuote = await quote(amount);
        let row: Locator | undefined;
        try {
            row = await ensureAccountCommissionExistsAndActive(
                adminCommission,
                `+966${LOGIN_MOBILE}`,
                COMMISSION_CATEGORY.CASH_IN,
                TOPUP_BILLER_COMMISSION_TRANSACTION_TYPE,
                { platform: snapshot.values.platform, minimumAmount: snapshot.values.minimumAmount, maximumAmount: snapshot.values.maximumAmount, value: '7', isPercentage: true },
                LOGIN_COMPANY,
            );
            const applied = await adminCommission.readCurrentValues(row);
            const overrideQuote = await quote(amount);
            const expected = applied.isPercentage ?? true ? round2(amount * Number(applied.value) / 100) : Number(applied.value);
            expect(overrideQuote.commission, 'the override prices the top-up').toBeCloseTo(expected, 2);
            test.info().annotations.push({ type: 'observed', description: `default commission ${defaultQuote.commission}, override ${overrideQuote.commission}` });
            await capDaily(amount - 1);
            expect(isBlocked(await attemptTopup(session, String(amount))), 'the cap blocks exactly as without the override').toBe(true);
        } finally {
            if (row) await adminCommission.disableAccountRow(row);
        }
    });

    test('TUA-D22: override disabled mid-test → the default resumes, the limit decision is unchanged', async () => {
        await liftAmountAndCount();
        const defaultQuote = await quote(amount);
        const row = await ensureAccountCommissionExistsAndActive(
            adminCommission,
            `+966${LOGIN_MOBILE}`,
            COMMISSION_CATEGORY.CASH_IN,
            TOPUP_BILLER_COMMISSION_TRANSACTION_TYPE,
            { platform: snapshot.values.platform, minimumAmount: snapshot.values.minimumAmount, maximumAmount: snapshot.values.maximumAmount, value: '7', isPercentage: true },
            LOGIN_COMPANY,
        );
        try {
            const withOverride = await quote(amount);
            await adminCommission.disableAccountRow(row);
            const afterDisable = await quote(amount);
            expect(afterDisable.commission, 'the default commission resumes').toBeCloseTo(defaultQuote.commission, 2);
            test.info().annotations.push({ type: 'observed', description: `override ${withOverride.commission} → default ${afterDisable.commission}` });
            await capDaily(amount - 1);
            expect(isBlocked(await attemptTopup(session, String(amount)))).toBe(true);
        } finally {
            await adminCommission.disableAccountRow(row).catch(() => { /* already disabled */ });
        }
    });

    test('TUA-D23: an APP-only commission does not affect a Web top-up, and the limit still applies', async () => {
        await liftAmountAndCount();
        await setWebCommissionActive(false);
        const appTier = await ensureAppScopedBillerTopupCommission(adminCommission);
        try {
            const q = await quote(Math.max(Number(appTier.values.minimumAmount), 1));
            expect(q.commission, 'APP rule must not price a Web top-up').toBeCloseTo(0, 2);
            await capDaily(Math.max(Number(appTier.values.minimumAmount), 2) - 1);
            expect(isBlocked(await attemptTopup(session, String(Math.max(Number(appTier.values.minimumAmount), 2))))).toBe(true);
        } finally {
            await restoreAppScopedBillerTopupCommission(adminCommission, appTier);
        }
    });

    test('TUA-D24: no commission in force (WEB rule disabled) — commission 0, limits still apply, no error', async () => {
        await liftAmountAndCount();
        await setWebCommissionActive(false);
        const q = await quote(amount);
        expect(q.commission).toBeCloseTo(0, 2);
        expect(q.total).toBeCloseTo(amount, 2);
        await capDaily(amount - 1);
        expect(isBlocked(await attemptTopup(session, String(amount)))).toBe(true);
    });

    // ---------- E. Cross-rule precedence ----------

    test('TUA-E01: below the minimum AND over the daily limit — the minimum message wins', async () => {
        const min = Math.max(minimumAmount, 10);
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min, hourly: HIGH, daily: HIGH, monthly: HIGH, yearly: HIGH });
        const minOnly = await attemptWithMessage(min - 1);
        expect(isBlocked(minOnly.outcome)).toBe(true);
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min, hourly: 1, daily: 1, monthly: HIGH, yearly: HIGH });
        const both = await attemptWithMessage(min - 1);
        expect(isBlocked(both.outcome)).toBe(true);
        test.info().annotations.push({ type: 'observed', description: `min only: "${minOnly.message}" | min+cap: "${both.message}"` });
        expect(both.message, 'the same (minimum) message with or without the cap').toBe(minOnly.message);
    });

    test('TUA-E02: hourly AND daily caps both violated — one deterministic block (no TXN_MAX exists; hourly is the tightest)', async () => {
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 0, hourly: 1, daily: 1, monthly: HIGH, yearly: HIGH });
        const first = await attemptWithMessage(amount);
        const second = await attemptWithMessage(amount);
        expect(isBlocked(first.outcome)).toBe(true);
        test.info().annotations.push({ type: 'observed', description: `message: "${first.message}"` });
        expect(second.message, 'deterministic: the same message every time').toBe(first.message);
    });

    test('TUA-E03: count exhausted and amount fine — blocked by the count rule', async () => {
        await liftAmountAndCount();
        await admin!.api.setCountAllTiers(admin!.snapshot, { daily: 0 });
        const r = await attemptWithMessage(amount);
        expect(isBlocked(r.outcome)).toBe(true);
        test.info().annotations.push({ type: 'observed', description: `count message: "${r.message}"` });
    });

    test('TUA-E04: amount cap and wallet ceiling both violated — one deterministic block', async () => {
        const balance = await readBalance();
        await capDaily(1);
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: Math.max(Math.floor(balance), 1) });
        const first = await attemptWithMessage(amount);
        const second = await attemptWithMessage(amount);
        expect(isBlocked(first.outcome)).toBe(true);
        test.info().annotations.push({ type: 'observed', description: `message: "${first.message}"` });
        expect(second.message).toBe(first.message);
    });

    test('TUA-E06: golden path — every rule satisfied, the commission is deducted and the ledger matches the Summary', async () => {
        test.info().annotations.push({ type: 'known-defect', description: 'TU-CM13: a completed top-up credits the gross amount; the wallet assertion fails until fixed.' });
        await liftAmountAndCount();
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: HIGH });
        const q = await quote(amount);
        const { balanceBefore, base } = await pay();
        expect(base, 'posted in base_transaction').not.toBeNull();
        expect(base!.status).toBe('POSTED');
        expect(Number(base!.destination_commission_amount ?? 0)).toBeCloseTo(q.commission, 2);
        expect(Number(base!.destination_vat_amount ?? 0)).toBeCloseTo(q.vat, 2);
        await gotoTopupScreen(session);
        expect(round2(await session.topup.getBalanceBeforeTopup()), 'credit == amount − commission').toBe(round2(balanceBefore + q.total));
    });

    test('TUA-E07: nothing configured against it (no commission, caps lifted) — credit equals the amount', async () => {
        await liftAmountAndCount();
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: HIGH });
        await setWebCommissionActive(false);
        const { balanceBefore, base } = await pay();
        expect(base).not.toBeNull();
        expect(Number(base!.destination_commission_amount ?? 0)).toBe(0);
        expect(Number(base!.destination_vat_amount ?? 0)).toBe(0);
        await gotoTopupScreen(session);
        expect(round2(await session.topup.getBalanceBeforeTopup())).toBe(round2(balanceBefore + amount));
    });

    for (const method of ['mada', 'visa', 'master'] as const) {
        test(`TUA-E08: ${method} — same commission and the same limit decision as the other methods (no per-brand bypass)`, async () => {
            await liftAmountAndCount();
            const reference = await quote(amount, 'visa');
            const q = await quote(amount, method);
            expect(q.commission).toBeCloseTo(reference.commission, 2);
            expect(q.total).toBeCloseTo(reference.total, 2);
            await capDaily(amount - 1);
            const outcome = await attemptTopup(session, String(amount), method);
            expect(isBlocked(outcome), `${method} must be blocked by the cap`).toBe(true);
        });
    }

    test('TUA-E09: restoring the configuration returns the original outcome', async () => {
        const min = Math.max(minimumAmount, 10);
        const probe = async () => (await attemptWithMessage(min - 1));
        const before = await probe();
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 0, hourly: 1, daily: 1, monthly: HIGH, yearly: HIGH });
        await admin!.api.setCountAllTiers(admin!.snapshot, { daily: 0 });
        await probe();
        await admin!.api.restoreTopup(admin!.snapshot);
        await admin!.api.expectMatchesSnapshot(admin!.snapshot);
        const after = await probe();
        expect(after.outcome).toBe(before.outcome);
        expect(after.message).toBe(before.message);
    });

    // ---------- Not automated here (reason in each title) ----------

    for (const [id, title, reason] of [
        ['TUA-D01', 'limit measured on the gross amount (exact usage)', NEEDS_FRESH_ACCOUNT],
        ['TUA-D03', 'net never exceeds the headroom (exact usage)', NEEDS_FRESH_ACCOUNT],
        ['TUA-D06', 'enabling commission mid-day leaves earlier usage unchanged', NEEDS_FRESH_ACCOUNT],
        ['TUA-D07', 'tier maximum equal to the daily cap', NEEDS_FRESH_ACCOUNT],
        ['TUA-D08', 'cap below the tier minimum', NEEDS_FRESH_ACCOUNT],
        ['TUA-D09', 'monthly amount × percentage commission, last top-up lands exactly on the cap', NEEDS_FRESH_ACCOUNT],
        ['TUA-D10', 'fixed commission ≥ amount', NEEDS_FIXED_RULE],
        ['TUA-D16', 'daily count 3: each credit net of its own commission, 4th blocked', NEEDS_FRESH_ACCOUNT],
        ['TUA-D17', 'the blocked 4th top-up charges no commission', NEEDS_FRESH_ACCOUNT],
        ['TUA-D25', 'commission type flipped percentage↔fixed does not alter limit accounting', 'Blocked by defect TU-CM03 (type edit ignored by the backend)'],
    ] as const) {
        test(`${id}: ${title}`, () => {
            test.skip(true, reason);
        });
    }
});
