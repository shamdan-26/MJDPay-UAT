import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { raiseHeadroom, amt, AMT, SECOND_USER, why, startSession, initiate, verifyOtp, paymentIdOf, paymentMethodId, otherPaymentMethodId, expectRejected, ledger, waitLedger, type BizSession } from './TopupBizApi';

// Business rules: one user intent gives at most one payment. TUB-36, 37, 39, 40, 41 (group E) and TUB-78 to 81, 83 to 85 (group M).
// Group M follows AS17: a retry with the same key and data returns the ORIGINAL result; the same key with different data
// never creates a new charge; a request without a key is refused. TUB-82 (declined first attempt) needs the card step: see NotAutomated.
// "Finished flow" in TUB-78 and "after a success" in TUB-85 are approximated here by "initiated and OTP-verified": a real
// success needs the HyperPay popup (T2).
// Where the key travels (body or header) is open (AS1), so these cases only assert the OUTCOME: the set of distinct
// payment ids that came back is never larger than one for one key. The key is sent as the `idempotencyKey` header,
// which is what the web app sends today.

const distinctIds = (rs: Array<{ ok: boolean; body: any }>) => new Set(rs.filter(r => r.ok).map(r => String(paymentIdOf(r.body))));

test.describe('Topup business – no duplicate processing', { tag: ['@topup', '@business', '@api'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'api' }] }, () => {
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

    test('TUB-36: double submit creates one top-up', { annotation: [{ type: 'testcase', description: 'TUB-36: two parallel submits with one key -> one payment' }] }, async () => {
        const key = randomUUID();
        const rs = await Promise.all([initiate(s, AMT, { key, methodId }), initiate(s, AMT, { key, methodId })]);
        expect(rs.some(r => r.ok), `at least one submit succeeds: ${rs.map(why).join(' | ')}`).toBe(true);
        expect(distinctIds(rs).size, 'one key must map to one payment').toBe(1);
    });

    test('TUB-37: retry after a lost response is not a second top-up', { annotation: [{ type: 'testcase', description: 'TUB-37: same key sent again later -> same payment, not a new one' }] }, async () => {
        const key = randomUUID();
        const first = await initiate(s, AMT, { key, methodId });
        expect(first.ok, `first submit: ${why(first)}`).toBe(true);
        const retry = await initiate(s, AMT, { key, methodId });
        expect(distinctIds([first, retry]).size).toBe(1);
    });

    test('TUB-39: the same top-up sent from two sessions completes once', { annotation: [{ type: 'testcase', description: 'TUB-39: two simultaneous requests with distinct request ids and one key -> one payment' }] }, async () => {
        const key = randomUUID();
        const rs = await Promise.all([
            initiate(s, amt(1.2), { key, methodId, headers: { toster_ID: `tab1_${Date.now()}` } }),
            initiate(s, amt(1.2), { key, methodId, headers: { toster_ID: `tab2_${Date.now()}` } }),
        ]);
        expect(distinctIds(rs).size).toBeLessThanOrEqual(1);
        expect(rs.some(r => r.ok), rs.map(why).join(' | ')).toBe(true);
    });

    test('TUB-40: a new top-up after a finished one is processed normally', { annotation: [{ type: 'testcase', description: 'TUB-40: new key, same amount -> a new payment, not a replay' }] }, async () => {
        const a = await initiate(s, AMT, { methodId });
        const b = await initiate(s, AMT, { methodId });
        expect(a.ok && b.ok, `both accepted: ${why(a)} | ${why(b)}`).toBe(true);
        expect(String(paymentIdOf(a.body))).not.toBe(String(paymentIdOf(b.body)));
    });

    test('TUB-41: repeating the confirmation of a payment returns the same result', { annotation: [{ type: 'testcase', description: 'TUB-41: verify twice -> same txnReference or rejected, never a second one' }] }, async () => {
        const p = await initiate(s, AMT, { methodId });
        test.skip(!p.ok || !p.body?.isOtpRequired, 'Initiation did not return an OTP-required payment');
        const first = await verifyOtp(s, paymentIdOf(p.body)!, undefined, {}, methodId);
        expect(first.ok, `first verify: ${why(first)}`).toBe(true);
        const second = await verifyOtp(s, paymentIdOf(p.body)!, undefined, {}, methodId);
        if (second.ok) expect(second.body?.txnReference).toBe(first.body?.txnReference);
        else expect(second.status).toBeLessThan(500);
    });

    test('TUB-78: reusing a finished flow\'s key never charges again', { annotation: [{ type: 'testcase', description: 'TUB-78: key used through the OTP step, sent again -> the original payment is returned, no second payment' }] }, async () => {
        const key = randomUUID();
        const first = await initiate(s, AMT, { key, methodId });
        test.skip(!first.ok || !first.body?.isOtpRequired, `Initiation did not return an OTP-required payment: ${why(first)}`);
        const verified = await verifyOtp(s, paymentIdOf(first.body)!, undefined, {}, methodId);
        expect(verified.ok, `verify: ${why(verified)}`).toBe(true);
        const rowsBefore = (await waitLedger(key)).length;
        const again = await initiate(s, AMT, { key, methodId });
        expect(again.ok, `AS17: a repeat of a used key returns the original result: ${why(again)}`).toBe(true);
        expect(String(paymentIdOf(again.body)), 'same payment id as the first call').toBe(String(paymentIdOf(first.body)));
        expect((await ledger(key)).length, 'no extra ledger rows').toBe(rowsBefore);
    });

    test('TUB-79: the same key with a different amount is never processed as new', { annotation: [{ type: 'testcase', description: 'TUB-79: key used for AMT, sent with 3 x AMT -> rejected or the original result, never a charge of the new amount' }] }, async () => {
        const key = randomUUID();
        const first = await initiate(s, AMT, { key, methodId });
        expect(first.ok, `first: ${why(first)}`).toBe(true);
        const other = await initiate(s, amt(3), { key, methodId });
        if (other.ok) expect(String(paymentIdOf(other.body)), 'same key must give the original payment').toBe(String(paymentIdOf(first.body)));
        else expectRejected(other, 'same key, different amount');
        const rows = await waitLedger(key);
        expect(rows.some(r => Number(r.destination_amount) === Number(amt(3))), 'no ledger row carries the new amount').toBe(false);
    });

    test('TUB-80: the same key with a different payment method', { annotation: [{ type: 'testcase', description: 'TUB-80: key used on one method, sent with another -> rejected or the original, no new payment' }] }, async () => {
        const otherMethod = await otherPaymentMethodId(s, methodId);
        test.skip(otherMethod === null, 'The account has only one payment method');
        const key = randomUUID();
        const first = await initiate(s, AMT, { key, methodId });
        expect(first.ok, `first: ${why(first)}`).toBe(true);
        const other = await initiate(s, AMT, { key, methodId: otherMethod! });
        if (other.ok) expect(String(paymentIdOf(other.body))).toBe(String(paymentIdOf(first.body)));
        else expectRejected(other, 'same key, other payment method');
    });

    test('TUB-81: one user\'s key cannot reach another user\'s payment', { annotation: [{ type: 'testcase', description: 'TUB-81: user B sends user A\'s key -> A\'s payment is not returned to B and every ledger row for the key stays A\'s' }] }, async ({ browser }) => {
        test.setTimeout(180_000);
        const key = randomUUID();
        const a = await initiate(s, AMT, { key, methodId });
        expect(a.ok, `user A: ${why(a)}`).toBe(true);
        const b = await startSession(browser, SECOND_USER);
        try {
            const mine = await initiate(b, AMT, { key });
            if (mine.ok) expect(String(paymentIdOf(mine.body)), 'B must not receive A\'s payment').not.toBe(String(paymentIdOf(a.body)));
            else expectRejected(mine, 'B with A\'s key');
        } finally {
            await b.dispose();
        }
        const rows = await waitLedger(key);
        expect(rows.length).toBeGreaterThan(0);
        expect(new Set(rows.map(r => r.initiator)), 'only A appears as initiator for the key').toEqual(new Set([s.profileCode]));
    });

    test('TUB-83: a retry while the first request is still running', { annotation: [{ type: 'testcase', description: 'TUB-83: second request sent 50 ms after the first, same key -> one payment' }] }, async () => {
        const key = randomUUID();
        const rs = await Promise.all([
            initiate(s, AMT, { key, methodId }),
            new Promise<void>(r => setTimeout(r, 50)).then(() => initiate(s, AMT, { key, methodId })),
        ]);
        expect(rs.some(r => r.ok), rs.map(why).join(' | ')).toBe(true);
        expect(distinctIds(rs).size, 'one key must map to one payment').toBe(1);
    });

    test('TUB-84: a request without a key is refused', { annotation: [{ type: 'testcase', description: 'TUB-84: no idempotency key, sent twice -> both refused, no payment created' }] }, async () => {
        for (const n of [1, 2]) {
            const r = await initiate(s, AMT, { methodId, noKey: true });
            expectRejected(r, `request ${n} without a key`);
            expect(paymentIdOf(r.body), 'no payment id for a refused request').toBeUndefined();
        }
    });

    test('TUB-85: a retry adds no commission or VAT entry', { annotation: [{ type: 'testcase', description: 'TUB-85: ledger rows for the key are unchanged by a retry (success-time posting is the browser tier)' }] }, async () => {
        const key = randomUUID();
        const first = await initiate(s, AMT, { key, methodId });
        expect(first.ok, `first: ${why(first)}`).toBe(true);
        const before = await waitLedger(key);
        test.skip(before.length === 0, 'No ledger row is written at initiation on this environment');
        await initiate(s, AMT, { key, methodId });
        const after = await ledger(key);
        expect(after.map(r => `${r.txn_type_name}|${r.status}|${r.destination_amount}`).sort(), 'same rows after the retry').toEqual(before.map(r => `${r.txn_type_name}|${r.status}|${r.destination_amount}`).sort());
    });
});
