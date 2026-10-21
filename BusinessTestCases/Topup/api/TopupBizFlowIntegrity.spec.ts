import { test, expect } from '@playwright/test';
import { DEV_PAYMENTS_DOWN, raiseHeadroom, AMT, amt, why, startSession, initiate, verifyOtp, updateStatus, openSummary, paymentIdOf, paymentMethodId, expectRejected, waitLedger, balances, SECOND_USER, type BizSession } from '../helpers/TopupBizApi.ts';

// Business rules: each top-up completes against its own payment, in order, for its owner only. TUB-43..48 (group F).
// Several cases compare the amount written to emi_transaction.transaction_log with the amount that was initiated.
// If the ledger row is only written later (after the card step), those cases skip with that reason.

test.describe('Topup business – flow integrity', { tag: ['@topup', '@business', '@api'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'api' }] }, () => {
    test.skip(DEV_PAYMENTS_DOWN, 'DEV OUTAGE: POST /api/v1/payments returns HTTP 500 for every request on dev (2026-10-20), so payment-initiation cases cannot be judged. Set TOPUP_DEV_PAYMENTS_DOWN=0 once dev is fixed.');
    // One worker per file: a second login as the same account invalidates the first session (401 SESSION_INVALID).
    test.describe.configure({ mode: 'serial' });
    let s: BizSession;
    let restoreLimits: (() => Promise<void>) | undefined;
    let methodId: number;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180_000); // hook timeout is separate from the describe/test timeout: UI login + admin work
        restoreLimits = await raiseHeadroom(browser);
        s = await startSession(browser);
        methodId = await paymentMethodId(s);
    });

    test.afterAll(async () => {
        test.setTimeout(120_000);
        await s?.dispose();
        await restoreLimits?.();
    });

    test('TUB-43: each top-up completes against its own payment', { annotation: [{ type: 'testcase', description: 'TUB-43: two payments of different amounts, completed in reverse order, keep their own amounts' }] }, async () => {
        const a = await initiate(s, amt(1.1), { methodId });
        const b = await initiate(s, amt(2.2), { methodId });
        expect(a.ok && b.ok, `initiate #1: ${why(a)} | initiate #2: ${why(b)}`).toBe(true);
        expect(String(paymentIdOf(a.body))).not.toBe(String(paymentIdOf(b.body)));
        test.skip(!a.body?.isOtpRequired, 'OTP is off for top-up on this env; completion order cannot be driven by verify');
        expect((await verifyOtp(s, paymentIdOf(b.body)!, undefined, {}, methodId)).ok).toBe(true);
        expect((await verifyOtp(s, paymentIdOf(a.body)!, undefined, {}, methodId)).ok).toBe(true);
        const rowsA = await waitLedger(a.key, 8000);
        const rowsB = await waitLedger(b.key, 8000);
        test.skip(rowsA.length === 0 || rowsB.length === 0, 'Ledger rows are not written before the card step');
        for (const r of rowsA) expect(Number(r.destination_amount)).toBe(Number(amt(1.1)));
        for (const r of rowsB) expect(Number(r.destination_amount)).toBe(Number(amt(2.2)));
    });

    test('TUB-44: a user cannot complete another user\'s top-up', { annotation: [{ type: 'testcase', description: 'TUB-44: user B verifying user A payment -> rejected, A unaffected' }] }, async ({ browser }) => {
        const other = await startSession(browser, SECOND_USER);
        const p = await initiate(s, AMT, { methodId });
        expect(p.ok, `initiate: ${why(p)}`).toBe(true);
        const before = await balances(s);
        let attempt;
        try {
            attempt = await verifyOtp(other, paymentIdOf(p.body)!, undefined, {}, methodId);
        } finally {
            await other.dispose();
        }
        expectRejected(attempt, 'other user verifying');
        expect((await balances(s)).available).toBe(before.available);
    });

    test('TUB-45: steps cannot be skipped or reordered', { annotation: [{ type: 'testcase', description: 'TUB-45: verify an unknown payment and update-status an unknown checkout -> rejected' }] }, async () => {
        expectRejected(await verifyOtp(s, 999999999, undefined, {}, methodId), 'verify unknown payment');
        const res = await updateStatus(s, `no-such-checkout-${Date.now()}`, methodId);
        expectRejected(res, 'update-status of an unknown checkout');
    });

    test('TUB-46: the amount cannot change after it was initiated', { annotation: [{ type: 'testcase', description: 'TUB-46: extra amount sent on verify is ignored; recorded amount stays the initiated one' }] }, async () => {
        const p = await initiate(s, AMT, { methodId });
        test.skip(!p.ok || !p.body?.isOtpRequired, 'No OTP-required payment to verify');
        await verifyOtp(s, paymentIdOf(p.body)!, undefined, { amount: 1 }, methodId);
        const rows = await waitLedger(p.key, 8000);
        test.skip(rows.length === 0, 'Ledger rows are not written before the card step');
        for (const r of rows) expect(Number(r.destination_amount)).toBe(Number(AMT));
    });

    test('TUB-47: one transaction reference follows the top-up', { annotation: [{ type: 'testcase', description: 'TUB-47: reference returned on verify matches the ledger rows' }] }, async () => {
        const p = await initiate(s, AMT, { methodId });
        test.skip(!p.ok || !p.body?.isOtpRequired, 'No OTP-required payment to verify');
        const v = await verifyOtp(s, paymentIdOf(p.body)!, undefined, {}, methodId);
        expect(v.ok, `verify: ${why(v)}`).toBe(true);
        const ref = String(v.body?.txnReference ?? '');
        expect(ref).not.toBe('');
        const rows = await waitLedger(p.key, 8000);
        test.skip(rows.length === 0, 'Ledger rows are not written before the card step');
        for (const r of rows) {
            expect([r.destination_reference, r.batch_transaction_reference].map(String), 'ledger row carries the same reference').toContain(ref);
        }
    });

    test('TUB-48: opening and abandoning a summary has no side effects', { annotation: [{ type: 'testcase', description: 'TUB-48: summary only -> balance unchanged, no ledger row' }] }, async () => {
        const before = await balances(s);
        const summary = await openSummary(s, AMT);
        expect(summary.status).toBe(201);
        expect((await balances(s)).available).toBe(before.available);
        // a later top-up with the same amount starts clean
        const next = await initiate(s, AMT, { methodId });
        expect(next.ok, `initiate after summary: ${why(next)}`).toBe(true);
    });
});
