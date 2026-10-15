import { test, expect, type BrowserContext, type Request } from '@playwright/test';
import { type AdminCommissionManagementPage } from '../../pageElements/CommissionManagement/AdminCommissionManagementPage';
import { loginToCommissionManagement } from '../../CommissionManagement/CommissionManagementHelper';
import {
    SUMMARY_LABEL,
    TOPUP_COMMISSION_TRANSACTION_TYPE,
    prepareTopupCommission,
    restoreTopupCommission,
    loginToTopup,
    gotoTopupScreen,
    findTopupCase,
    completeCardPayment,
    decodeJwtProfileCode,
    getLatestTopupTransactionFromSql,
    LOGIN_MOBILE,
    type TopupSession,
    type TopupCommissionSnapshot,
} from '../TopupHelper';
import { closeSqlPool } from '../../../support/sqlServerClient';
import { openAdminLimits, closeAdminLimits } from '../TopupLimitsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Topup × commission for the MERCHANT account (company T2605, same mobile as the Biller login; its Cash-In type is
// "Merchant Cashin"). Same agreed rules as TopupCommission.spec.ts (Biller): VAT inside the commission
// (commission × 15/115), Total = amount − commission, half-up rounding to 2dp, an amount no tier covers pays 0.
// The Customer account type is app-only (no web client), so it has no Web top-up to test.
//
// Summary-level cases only read the preview and never pay; the single ledger case makes one real payment, lifting the
// account's caps for that case alone (restored + re-read in its finally).
// ─────────────────────────────────────────────────────────────────────────────

const MERCHANT_COMPANY = 'T2605';
const MERCHANT_WALLET_TYPE = 'Merchant';
const VAT_RATE = 0.15;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const expectedVat = (commission: number) => round2(commission * VAT_RATE / (1 + VAT_RATE));

test.describe('Topup – Commission (Merchant)', { tag: ['@topup', '@functional'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(240000);

    let session: TopupSession;
    let adminContext: BrowserContext;
    let adminCommission: AdminCommissionManagementPage;
    let snapshot: TopupCommissionSnapshot;
    let minimumAmount: number;
    let maximumAmount: number;
    let midpointAmount: number;
    let commissionValue: number;
    let isPercentage: boolean;

    const expectedCommission = (amount: number) => (isPercentage ? round2(amount * (commissionValue / 100)) : commissionValue);

    test.beforeAll(async ({ browser }, testInfo) => {
        testInfo.setTimeout(180000);
        session = await loginToTopup(browser, { company: MERCHANT_COMPANY, mobile: LOGIN_MOBILE });
        const { context, commission } = await loginToCommissionManagement(browser);
        adminContext = context;
        adminCommission = commission;
        snapshot = await prepareTopupCommission(commission);
        minimumAmount = Number(snapshot.values.minimumAmount);
        maximumAmount = Number(snapshot.values.maximumAmount);
        midpointAmount = Math.round((minimumAmount + maximumAmount) / 2);
        commissionValue = Number(snapshot.values.value);
        isPercentage = snapshot.values.isPercentage ?? true;
        console.log(`[TopupCommissionMerchant] live "${TOPUP_COMMISSION_TRANSACTION_TYPE}" tier: ${minimumAmount}-${maximumAmount}, ${commissionValue}${isPercentage ? '%' : ' flat'}.`);
    });

    test.afterAll(async () => {
        try {
            if (snapshot) await restoreTopupCommission(adminCommission, snapshot);
        } finally {
            await adminContext?.close().catch(() => { /* already closed */ });
            await session?.page.close().catch(() => { /* already closed */ });
            await closeSqlPool();
        }
    });

    test.beforeEach(async () => {
        await gotoTopupScreen(session);
    });

    async function quoteFor(amount: number | string) {
        const { topup } = session;
        await topup.selectPaymentMethod('visa');
        await topup.enterAmount(String(amount));
        expect(await topup.proceedButton.isEnabled(), `Proceed must be enabled for ${amount}`).toBe(true);
        await topup.clickProceedButton();
        await topup.waitForSummaryToSettle();
        const q = {
            original: await topup.getSummaryMoney(SUMMARY_LABEL.original),
            commission: await topup.getSummaryMoney(SUMMARY_LABEL.commission),
            vat: await topup.getSummaryMoney(SUMMARY_LABEL.vat),
            total: await topup.getSummaryMoney(SUMMARY_LABEL.total),
        };
        await topup.clickSummaryCancelButton();
        await gotoTopupScreen(session);
        return q;
    }

    function expectRules(q: { original: number; commission: number; vat: number; total: number }) {
        expect(q.vat, 'VAT is 15/115 of the commission (inside it)').toBeCloseTo(expectedVat(q.commission), 2);
        expect(q.total, 'Total = amount − commission').toBeCloseTo(q.original - q.commission, 2);
    }

    test('TU-CM19 (Merchant) — commission at the tier minimum boundary', async () => {
        const q = await quoteFor(minimumAmount);
        expect(q.original).toBe(minimumAmount);
        expect(q.commission).toBeCloseTo(expectedCommission(minimumAmount), 2);
        expectRules(q);
    });

    test('TU-CM20 (Merchant) — commission at the tier maximum boundary', async () => {
        const q = await quoteFor(maximumAmount);
        expect(q.original).toBe(maximumAmount);
        expect(q.commission).toBeCloseTo(expectedCommission(maximumAmount), 2);
        expectRules(q);
    });

    test('TU-CM21 (Merchant) — commission mid-range within the tier', async () => {
        test.skip(midpointAmount === minimumAmount || midpointAmount === maximumAmount, 'Tier too narrow for a distinct midpoint.');
        const q = await quoteFor(midpointAmount);
        expect(q.commission).toBeCloseTo(expectedCommission(midpointAmount), 2);
        expectRules(q);
    });

    test('TU-CM22 (Merchant) — just below the tier minimum: zero commission', async () => {
        test.skip(minimumAmount <= 1, 'Minimum is already the smallest positive amount.');
        const q = await quoteFor(minimumAmount - 1);
        expect(q.commission).toBeCloseTo(0, 2);
        expect(q.vat).toBeCloseTo(0, 2);
        expect(q.total).toBeCloseTo(minimumAmount - 1, 2);
    });

    test('TU-CM23 (Merchant) — just above the tier maximum: zero commission', async () => {
        const q = await quoteFor(maximumAmount + 1);
        expect(q.commission).toBeCloseTo(0, 2);
        expect(q.vat).toBeCloseTo(0, 2);
        expect(q.total).toBeCloseTo(maximumAmount + 1, 2);
    });

    for (const awkward of ['10.01', '33.33', '99.99']) {
        test(`TU-CM33 (Merchant) — commission and VAT round half-up to 2 decimals (${awkward})`, async () => {
            test.skip(!isPercentage, 'Fixed commission has nothing to round.');
            const amount = Number(awkward);
            test.skip(amount < minimumAmount || amount > maximumAmount, `${awkward} is outside the live tier ${minimumAmount}-${maximumAmount}.`);
            const q = await quoteFor(awkward);
            expect(q.commission).toBe(expectedCommission(amount));
            expect(q.vat).toBe(expectedVat(q.commission));
            expect(q.total).toBeCloseTo(amount - q.commission, 2);
        });
    }

    test('TU-CM17 (Merchant) — disabling the rule stops the commission; re-enabling resumes it', async () => {
        const find = async () => {
            await adminCommission.gotoDefaultCommission();
            const f = await adminCommission.findRowByTransactionTypeAndPlatform(TOPUP_COMMISSION_TRANSACTION_TYPE, 'WEB');
            if (!f) throw new Error('TU-CM17 (Merchant): could not re-locate the live WEB Merchant Cashin row.');
            return f.row;
        };
        await adminCommission.disableRow(await find());
        try {
            const off = await quoteFor(midpointAmount);
            expect(off.commission).toBeCloseTo(0, 2);
            expect(off.vat).toBeCloseTo(0, 2);
        } finally {
            await adminCommission.activateRow(await find());
        }
        const on = await quoteFor(midpointAmount);
        expect(on.commission).toBeCloseTo(expectedCommission(midpointAmount), 2);
    });

    test('TUA-D16 (Merchant) — a SUCCESS payment: ledger commission and VAT equal the Summary quote', async ({ browser }) => {
        const { page, topup } = session;
        const quote = await quoteFor(midpointAmount);
        const limits = await openAdminLimits(browser, 'Merchant Cashin', MERCHANT_WALLET_TYPE);
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
        try {
            const high = 100_000_000;
            await limits.api.setAmountAllTiers(limits.snapshot, { min: 0, hourly: high, daily: high, monthly: high, yearly: high });
            await limits.api.setCountAllTiers(limits.snapshot, { hourly: 100000, daily: 100000, monthly: 100000, yearly: 100000 });
            await limits.api.setWalletAllTiers(limits.snapshot, { maxBalance: high });

            await gotoTopupScreen(session);
            await completeCardPayment(session, 'visa', { ...findTopupCase('VISA'), amount: String(midpointAmount) });
            await topup.clickResultOkButton();

            expect(profileCode, 'no Authorization header was captured off POST /api/v1/payments').not.toBe('');
            const base = await getLatestTopupTransactionFromSql(profileCode);
            expect(base, 'a successful payment must be posted in base_transaction').not.toBeNull();
            if (idempotencyKey) expect(base!.idempotency_key).toBe(idempotencyKey);
            expect(base!.status).toBe('POSTED');
            expect(Number(base!.destination_commission_amount ?? 0)).toBeCloseTo(quote.commission, 2);
            expect(Number(base!.destination_vat_amount ?? 0)).toBeCloseTo(quote.vat, 2);
        } finally {
            page.off('request', onRequest);
            await closeAdminLimits(limits);
        }
    });
});
