import { test, expect, type Browser } from '@playwright/test';
import { DEV_PAYMENTS_DOWN, AMT, startSession, initiate, expectRejected, envAccount, ledger, balances } from '../helpers/TopupBizApi.ts';

// Business rules: who may top up. TUB-04, TUB-06 (docs: Topup-BusinessTestCases.md, group A).
// Needs two extra accounts that are not in the repo test data. Set them in .env.dev as "company:mobile":
//   TOPUP_NO_PRIVILEGE_ACCOUNT  - has Transfer but NOT the Topup privilege
//   TOPUP_SUSPENDED_ACCOUNT     - wallet suspended / inactive
// Without them the cases skip with that reason instead of guessing an account.

async function expectBlocked(browser: Browser, envName: string, what: string) {
    const account = envAccount(envName);
    test.skip(!account, `Set ${envName}=company:mobile in .env.dev`);
    const s = await startSession(browser, account!);
    try {
        const before = await balances(s);
        const r = await initiate(s, AMT);
        expectRejected(r, what);
        expect(await ledger(r.key), 'no ledger row for a rejected top-up').toHaveLength(0);
        expect((await balances(s)).available).toBe(before.available);
    } finally {
        await s.dispose();
    }
}

test.describe('Topup business – eligibility', { tag: ['@topup', '@business', '@api'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'api' }] }, () => {
    test.skip(DEV_PAYMENTS_DOWN, 'DEV OUTAGE: POST /api/v1/payments returns HTTP 500 for every request on dev (2026-10-20), so payment-initiation cases cannot be judged. Set TOPUP_DEV_PAYMENTS_DOWN=0 once dev is fixed.');
    test('TUB-04: user without the Topup privilege cannot top up', { annotation: [{ type: 'testcase', description: 'TUB-04: No Topup privilege -> rejected, no payment, balance unchanged' }] }, async ({ browser }) => {
        await expectBlocked(browser, 'TOPUP_NO_PRIVILEGE_ACCOUNT', 'initiate without privilege');
    });

    test('TUB-06: suspended or inactive wallet cannot top up', { annotation: [{ type: 'testcase', description: 'TUB-06: Suspended wallet -> rejected, nothing charged' }] }, async ({ browser }) => {
        await expectBlocked(browser, 'TOPUP_SUSPENDED_ACCOUNT', 'initiate on suspended wallet');
    });
});
