import { test, expect, type BrowserContext } from '@playwright/test';
import { loginToCommissionManagement } from '../../CommissionManagement/CommissionManagementHelper';
import { TOPUP_BILLER_COMMISSION_TRANSACTION_TYPE_CODE } from '../TopupHelper';
import type { AdminCommissionManagementPage } from '../../pageElements/CommissionManagement/AdminCommissionManagementPage';
import { startSession, openSummary, initiate, expectRejected, findNumber, round2, type BizSession } from './TopupBizApi';

// Business rules: commission and VAT math. TUB-13..16 (group C).
// The WEB "Biller Bank Cashin" default commission row is READ through the admin API (apiFindCommission). If it exists
// but is off, it is switched on for this run and back off in afterAll (apiSetActive). It is never CREATED here: the admin
// "Add New Commission" wizard used by prepareBillerTopupCommission no longer opens its Cash-In modal on dev (hangs in
// chooseCommissionCategory, checked 2026-10-15; the admin menu was reorganised), and fixing that page object is separate
// work. If dev has no such row the cases skip with that reason: create the row once in the admin portal
// (Pricing & Limits > commission management > default commission), then re-run.
// The summary is checked against the rule (VAT is inside the commission: VAT = c x 15/115, half-up to 2 decimals,
// total = amount - c) using whatever values the row has.
// The summary's commission/VAT field names are not in the Postman collection: they are found by key pattern
// (/commission/, /vat/). If the summary does not expose them the case skips and says so.
// TUB-17..19 need a commission config WRITE tool that does not exist yet (see TopupBizNotAutomated).

interface Row { min: number; max: number; amountValue: number; type: string; isActive: boolean }

test.describe('Topup business – commission and VAT', { tag: ['@topup', '@business', '@api'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'api' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180_000); // Biller UI login + admin login + commission lookup all happen in beforeAll
    let s: BizSession;
    let adminContext: BrowserContext | undefined;
    let row: Row | null = null;
    let commissionPage: AdminCommissionManagementPage | undefined;
    let activatedId: number | undefined;

    const expectedFor = (amount: number) => {
        const c = row!.type === 'PERCENTAGE' ? round2(amount * row!.amountValue / 100) : row!.amountValue;
        return { commission: c, vat: round2(c * 15 / 115), total: round2(amount - c) };
    };

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180_000); // hook timeout is separate from the describe/test timeout: UI login + admin work
        s = await startSession(browser);
        const admin = await loginToCommissionManagement(browser);
        adminContext = admin.context;
        commissionPage = admin.commission;
        await admin.commission.gotoDefaultCommission();
        const entry = await admin.commission.apiFindCommission(TOPUP_BILLER_COMMISSION_TRANSACTION_TYPE_CODE, 'WEB');
        if (entry && !entry.isActive) {
            await admin.commission.apiSetActive(entry.id, true);
            activatedId = entry.id;
            entry.isActive = true;
        }
        row = entry as Row | null;
        console.log(`[TopupBizCommission] WEB Biller Bank Cashin row: ${row ? JSON.stringify({ type: row.type, value: row.amountValue, min: row.min, max: row.max, activatedByTest: activatedId !== undefined }) : 'NOT FOUND'}`);
    });

    test.afterAll(async () => {
        test.setTimeout(120_000);
        try {
            if (commissionPage && activatedId !== undefined) {
                await commissionPage.gotoDefaultCommission();
                await commissionPage.apiSetActive(activatedId, false);
            }
        } finally {
            await adminContext?.close();
        }
        await s?.dispose();
    });

    async function summaryFigures(amount: number) {
        const res = await openSummary(s, amount);
        const body = res.body;
        console.log(`[TopupBizCommission] summary(${amount}) -> ${res.status} ${JSON.stringify(body).slice(0, 600)}`);
        return { status: res.status, body, commission: findNumber(body, /commission/i), vat: findNumber(body, /vat/i), total: findNumber(body, /^totalAmount$/i) };
    }

    const requireRow = (kind?: 'fixed' | 'percentage') => {
        test.skip(!row, 'No WEB "Biller Bank Cashin" default commission row on dev: create it once in the admin portal (default commission), then re-run');
        if (kind === 'fixed') test.skip(row!.type === 'PERCENTAGE', 'Active row is a percentage commission');
        if (kind === 'percentage') test.skip(row!.type !== 'PERCENTAGE', 'Active row is a fixed commission');
    };

    test('TUB-14: fixed commission and VAT math', { annotation: [{ type: 'testcase', description: 'TUB-14: Fixed commission c, VAT = c x 15/115, total = amount - c' }] }, async () => {
        requireRow('fixed');
        const amount = row!.min;
        const f = await summaryFigures(amount);
        test.skip(f.commission === null, 'Summary has no commission field; capture the summary contract first');
        const e = expectedFor(amount);
        expect(f.commission).toBeCloseTo(e.commission, 2);
        if (f.vat !== null) expect(f.vat).toBeCloseTo(e.vat, 2);
        if (f.total !== null) expect(f.total).toBeCloseTo(e.total, 2);
    });

    test('TUB-15: percentage commission rounds half-up to 2 decimals', { annotation: [{ type: 'testcase', description: 'TUB-15: Percentage commission rounded half-up, VAT inside it' }] }, async () => {
        requireRow('percentage');
        const amount = Math.min(row!.max, Math.max(row!.min, 10.1));
        const f = await summaryFigures(amount);
        test.skip(f.commission === null, 'Summary has no commission field; capture the summary contract first');
        const e = expectedFor(amount);
        expect(f.commission).toBeCloseTo(e.commission, 2);
        if (f.vat !== null) expect(f.vat).toBeCloseTo(e.vat, 2);
        if (f.total !== null) expect(f.total).toBeCloseTo(e.total, 2);
    });

    test('TUB-16: tier boundaries are inclusive, outside the tier commission is 0', { annotation: [{ type: 'testcase', description: 'TUB-16: Commission at tier min and max; none just below min or above max' }] }, async () => {
        requireRow();
        for (const amount of [row!.min, row!.max]) {
            const f = await summaryFigures(amount);
            test.skip(f.commission === null, 'Summary has no commission field; capture the summary contract first');
            expect(f.commission, `commission at ${amount}`).toBeCloseTo(expectedFor(amount).commission, 2);
        }
        for (const amount of [round2(row!.min - 0.01), round2(row!.max + 0.01)]) {
            if (amount <= 0) continue;
            const f = await summaryFigures(amount);
            if (f.status >= 400) continue; // rejected by another rule (min or limit) is also "no commission charged"
            expect(f.commission ?? 0, `commission at ${amount}`).toBe(0);
        }
    });

    test('TUB-13: a top-up whose net credit would be zero or negative is blocked', { annotation: [{ type: 'testcase', description: 'TUB-13: amount not above a fixed commission -> blocked before payment' }] }, async () => {
        requireRow('fixed');
        test.skip(row!.min > row!.amountValue, 'Fixed commission is below the tier minimum; no in-tier amount can be at or under it');
        const amount = Math.max(row!.min, 0.01);
        const r = await initiate(s, amount.toFixed(2));
        expectRejected(r, `amount ${amount} with fixed commission ${row!.amountValue}`);
    });
});
