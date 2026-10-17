import { test, expect } from '@playwright/test';
import { raiseHeadroom, codeOf, why, startSession, initiate, expectRejected, ledger, waitLedger, balances, type BizSession } from './TopupBizApi';

// Business rules: which amounts are accepted. TUB-08..11 (group B). The minimum (TUB-12) and the net-credit rule
// (TUB-13) need admin config, so they live in TopupBizLimits / TopupBizCommission.

test.describe('Topup business – amount rules', { tag: ['@topup', '@business', '@api'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'api' }] }, () => {
    // One worker per file: a second login as the same account invalidates the first session (401 SESSION_INVALID).
    test.describe.configure({ mode: 'serial' });
    let s: BizSession;
    let restoreLimits: (() => Promise<void>) | undefined;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180_000); // hook timeout is separate from the describe/test timeout: UI login + admin work
        restoreLimits = await raiseHeadroom(browser);
        s = await startSession(browser);
    });

    test.afterAll(async () => {
        test.setTimeout(120_000);
        await s?.dispose();
        await restoreLimits?.();
    });

    test('TUB-08: zero amount is never processed', { annotation: [{ type: 'testcase', description: 'TUB-08: Zero amount -> rejected, no payment, balance unchanged' }] }, async () => {
        const before = await balances(s);
        const r = await initiate(s, '0');
        expectRejected(r, 'amount 0');
        expect(await ledger(r.key)).toHaveLength(0);
        expect((await balances(s)).available).toBe(before.available);
    });

    test('TUB-09: a negative entry can never reduce the balance', { annotation: [{ type: 'testcase', description: 'TUB-09: Negative amount -> rejected, or a positive amount; balance never goes down' }] }, async () => {
        const before = await balances(s);
        const r = await initiate(s, '-100');
        if (r.ok) {
            const rows = await waitLedger(r.key, 3000);
            for (const row of rows) expect(Number(row.destination_amount), 'recorded amount must be positive').toBeGreaterThan(0);
        } else {
            expectRejected(r, 'amount -10');
        }
        expect((await balances(s)).available).toBeGreaterThanOrEqual(before.available);
    });

    test('TUB-10: more than 2 decimals is not silently accepted', { annotation: [{ type: 'testcase', description: 'TUB-10: 3-decimal amount -> rejected (Postman negative case), never a different charged amount' }] }, async () => {
        const r = await initiate(s, '100.555');
        // postman/Topup collection folder 8 expects 400/422 for a 3-decimal amount.
        expect([400, 422], `status ${why(r)}`).toContain(r.status);
        expect(codeOf(r.body), 'must be refused for its decimals, not by an amount limit').not.toMatch(/LIMITS?_EXCEEDED/);
        expect(await ledger(r.key)).toHaveLength(0);
    });

    test('TUB-11: an over-length amount is not charged differently from what was typed', { annotation: [{ type: 'testcase', description: 'TUB-11: 9-digit amount -> rejected, or recorded exactly as typed' }] }, async () => {
        const typed = 123456789;
        const r = await initiate(s, typed.toFixed(2));
        if (!r.ok) {
            expectRejected(r, '9-digit amount');
            return;
        }
        const rows = await waitLedger(r.key, 5000);
        test.skip(rows.length === 0, 'Accepted but no ledger row before the gateway step; cannot compare the recorded amount');
        for (const row of rows) expect(Number(row.destination_amount)).toBe(typed);
    });
});
