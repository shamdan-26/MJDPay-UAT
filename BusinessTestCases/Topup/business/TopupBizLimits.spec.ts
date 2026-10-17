import { test, expect } from '@playwright/test';
import { openAdminLimits, closeAdminLimits, TOPUP_LIMIT_TYPE, TOPUP_WALLET_TYPE, type AdminLimitsHandle } from '../TopupLimitsHelper';
import { AMT, why, startSession, initiate, expectRejected, ledger, balances, paymentIdOf, type BizSession } from './TopupBizApi';

// Business rules: top-up limits and minimum (EMI-87). TUB-12, 25..29, 31, 33, 35 (groups B and D).
// Only the REJECTION side is automated here: a limit is checked when the payment is initiated, so a tiny cap or Count 0
// must reject POST /api/v1/payments. The "exactly at the cap succeeds" and "quota used only on SUCCESS" halves need a
// completed card payment (browser) and are listed in TopupBizNotAutomated.
// Config is changed through AdminLimitsApi (PUT bodies are still marked UNVERIFIED in that file: the first run
// confirms them) and ALWAYS restored: afterEach puts the snapshot back, afterAll restores and closes the admin context.
// One admin login at a time: do not run this file in parallel with other admin-portal specs.

const ZERO_COUNT = { hourly: 0, daily: 0, monthly: 0, yearly: 0 };
const caps = (n: number) => ({ hourly: n, daily: n, monthly: n, yearly: n });
const BIG = 1_000_000;

test.describe('Topup business – limits and minimum', { tag: ['@topup', '@business', '@api'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'api' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120_000);

    let s: BizSession;
    let admin: AdminLimitsHandle | undefined;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180_000); // hook timeout is separate from the describe/test timeout: UI login + admin work
        s = await startSession(browser);
        admin = await openAdminLimits(browser);
        await admin.api.setCountAllTiers(admin.snapshot, { hourly: 1000, daily: 1000, monthly: 1000, yearly: 1000 });
    });

    test.afterEach(async () => {
        await admin!.api.restoreTopup(admin!.snapshot);
        // dev counts initiated (unpaid) top-ups against the count limit: keep room for the next test's accepted payments
        await admin!.api.setCountAllTiers(admin!.snapshot, { hourly: 1000, daily: 1000, monthly: 1000, yearly: 1000 });
    });

    test.afterAll(async () => {
        test.setTimeout(120_000);
        await closeAdminLimits(admin);
        await s?.dispose();
    });

    test('TUB-12: amount below the minimum is rejected, the minimum itself is accepted', { annotation: [{ type: 'testcase', description: 'TUB-12: min m -> m-0.01 rejected, m accepted (judged on gross amount)' }] }, async () => {
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 20, ...caps(BIG) });
        expectRejected(await initiate(s, '19.99'), 'below minimum');
        const atMin = await initiate(s, '20.00');
        expect(atMin.ok, `at minimum: ${why(atMin)}`).toBe(true);
    });

    test('TUB-25: Count 0 blocks top-up outright', { annotation: [{ type: 'testcase', description: 'TUB-25: Rule with Count 0 -> every top-up rejected, no payment' }] }, async () => {
        await admin!.api.setCountAllTiers(admin!.snapshot, ZERO_COUNT);
        const r = await initiate(s, AMT);
        expectRejected(r, 'Count 0');
        expect(paymentIdOf(r.body), 'no payment id for a blocked top-up').toBeUndefined();
    });

    test('TUB-26: a rule for another platform does not affect this one', { annotation: [{ type: 'testcase', description: 'TUB-26: APP rule Count 0 does not block a WEB top-up' }] }, async () => {
        let appSnap;
        try {
            appSnap = await admin!.api.snapshotTopup(TOPUP_LIMIT_TYPE, 'APP', TOPUP_WALLET_TYPE);
        } catch (e) {
            test.skip(true, `No APP-platform limit rows for ${TOPUP_LIMIT_TYPE}: ${(e as Error).message.slice(0, 120)}`);
            return;
        }
        try {
            await admin!.api.setCountAllTiers(appSnap, ZERO_COUNT);
            const r = await initiate(s, AMT);
            expect(r.ok, `WEB top-up must not be judged by the APP rule: ${why(r)}`).toBe(true);
        } finally {
            await admin!.api.restoreTopup(appSnap);
        }
    });

    test('TUB-27: every period type is enforced', { annotation: [{ type: 'testcase', description: 'TUB-27: A cap of 1 on hour, day, month or year each rejects a 10.00 top-up' }] }, async () => {
        for (const period of ['hourly', 'daily', 'monthly', 'yearly'] as const) {
            await admin!.api.restoreTopup(admin!.snapshot);
            await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 1, ...caps(BIG), [period]: 1 });
            expectRejected(await initiate(s, AMT), `${period} cap 1`);
        }
    });

    test('TUB-28: limits are judged on the gross entered amount', { annotation: [{ type: 'testcase', description: 'TUB-28: cap L -> L accepted, L+0.01 rejected (also covers the rejection side of TUB-22)' }] }, async () => {
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 1, ...caps(100) });
        expectRejected(await initiate(s, '100.01'), 'cap 100, amount 100.01');
        const atCap = await initiate(s, '100.00');
        expect(atCap.ok, `amount equal to the cap: ${why(atCap)}`).toBe(true);
    });

    test('TUB-29: wallet max balance blocks a top-up when the wallet is already at the ceiling', { annotation: [{ type: 'testcase', description: 'TUB-29: balance at max balance -> any top-up blocked before payment' }] }, async () => {
        const { available } = await balances(s);
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: available });
        const r = await initiate(s, AMT);
        expectRejected(r, 'wallet at max balance');
        expect(paymentIdOf(r.body)).toBeUndefined();
    });

    test('TUB-31: a limit failure happens before any OTP or payment exists', { annotation: [{ type: 'testcase', description: 'TUB-31: blocked at initiation: no payment id, no OTP requested' }] }, async () => {
        await admin!.api.setCountAllTiers(admin!.snapshot, ZERO_COUNT);
        const r = await initiate(s, AMT);
        expectRejected(r, 'limit before OTP');
        expect(paymentIdOf(r.body)).toBeUndefined();
        expect(r.body?.isOtpRequired, 'no OTP is requested for a blocked top-up').not.toBe(true);
    });

    test('TUB-33: limits cannot be bypassed by calling the API directly', { annotation: [{ type: 'testcase', description: 'TUB-33: direct POST with cap exceeded -> same rejection, nothing in the ledger' }] }, async () => {
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 1, ...caps(5) });
        const r = await initiate(s, AMT);
        expectRejected(r, 'direct POST over cap');
        expect(await ledger(r.key)).toHaveLength(0);
    });

    test('TUB-35: a changed limit applies to the next attempt without re-login', { annotation: [{ type: 'testcase', description: 'TUB-35: cap 1 rejects, raising it lets the same session through' }] }, async () => {
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 1, ...caps(1.5) });
        expectRejected(await initiate(s, AMT), 'cap 1.5');
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 1, ...caps(BIG) });
        const r = await initiate(s, AMT);
        expect(r.ok, `after raising the cap: ${why(r)}`).toBe(true);
    });
});
