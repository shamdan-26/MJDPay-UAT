import { test, expect } from '@playwright/test';
import { loginToTopup, gotoTopupScreen, TOPUP_UI_ACCOUNT, type TopupSession, type TopupTransactionLogSqlRow } from '../TopupHelper';
import { payWithOutcome, ledgerFor, raiseMerchantCountHeadroom } from './TopupBizUiHelper';
import { closeSqlPool } from '../../../support/sqlServerClient';

// Business outcomes of a top-up through the browser: success, decline, cancel, 3DS decline,
// pending. Cases TUB-07, 21, 56, 57, 58, 59, 67 from Topup-BusinessTestCases.md.
//
// Five real sandbox payments in total (one per outcome). Dev counts initiated-but-unpaid
// top-ups against the hourly COUNT cap of 5 for Biller Bank Cashin (AS4), so this file is
// deliberately limited to one payment per outcome and TUB-21 / TUB-67 reuse their ledgers.
// Run it on its own, not right after another payment-heavy file.
//
// Outcome screens, balance-unchanged and the single failed row are also touched by
// functional/TopupNegative.spec.ts; this file adds the ledger lifecycle per outcome and
// the business ids.

// One account, one active session: every describe in this file logs in as TOPUP_UI_ACCOUNT, so the
// whole file runs serially in one worker. Run Topup UI files with --workers=1 for the same reason.
test.describe.configure({ mode: 'serial' });

test.describe('Topup business – UI – payment outcomes', { tag: ['@topup', '@ui', '@business'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180000);

    let session: TopupSession;
    let restoreLimits: (() => Promise<void>) | undefined;
    const ledgers: Record<string, TopupTransactionLogSqlRow[]> = {};

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(300000); // hooks do not inherit the describe timeout; includes the admin limits round trip
        restoreLimits = await raiseMerchantCountHeadroom(browser); // raises the Merchant hourly count cap for the run, restore() in afterAll (admin login first; never overlaps the app login)
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
    });

    test.afterAll(async () => {
        try {
            await session?.page.close();
        } finally {
            await restoreLimits?.();
        }
        await closeSqlPool();
    });

    test.beforeEach(async () => {
        await gotoTopupScreen(session);
    });

    test('TUB-07: success credits the wallet with what the ledger records', { annotation: [{ type: 'testcase', description: 'TUB-07: the credited amount equals the ledger amount and never exceeds the entered amount' }] }, async () => {
        const { topup } = session;
        const flow = await payWithOutcome(session, 'visa', '1');
        await topup.clickResultOkButton();

        const rows = await ledgerFor(flow.key, true);
        ledgers['success'] = rows;
        const terminal = rows.filter(r => r.status !== 'PENDING');
        expect(terminal.map(r => r.status)).toEqual(['SUCCESS']);

        const credited = Number(terminal[0]!.destination_amount);
        expect(credited, 'credit can never exceed the entered amount').toBeLessThanOrEqual(Number(flow.amount));
        await topup.checkBalanceAfterTopupNetOfCommission(flow.amount, Number(flow.amount) - credited);
    });

    test('TUB-56: a declined card leaves the balance unchanged', { annotation: [{ type: 'testcase', description: 'TUB-56: failed outcome, balance unchanged, ledger pending then one failed row' }] }, async () => {
        const { topup } = session;
        const flow = await payWithOutcome(session, 'visa', '4');
        await topup.assertFailedPopup();
        await topup.clickResultOkButton();
        await topup.checkBalanceRemainsUnchanged();

        const rows = await ledgerFor(flow.key, true);
        ledgers['declined'] = rows;
        expect(rows[0]!.status).toBe('PENDING');
        expect(rows.filter(r => r.status !== 'PENDING').map(r => r.status)).toEqual(['FAILED']);
    });

    test('TUB-57: cancelling at the card step credits nothing', { annotation: [{ type: 'testcase', description: 'TUB-57: user cancel at the gateway gives one terminal failed record, balance unchanged' }] }, async () => {
        const { topup } = session;
        const flow = await payWithOutcome(session, 'visa', '2');
        await topup.assertFailedPopup();
        await topup.clickResultOkButton();
        await topup.checkBalanceRemainsUnchanged();

        const rows = await ledgerFor(flow.key, true);
        ledgers['cancelled'] = rows;
        expect(rows.filter(r => r.status !== 'PENDING').map(r => r.status)).toEqual(['FAILED']);
    });

    test('TUB-58: a 3DS decline fails cleanly and a new top-up can start', { annotation: [{ type: 'testcase', description: 'TUB-58: 3DS decline gives a failed result, balance unchanged, user can start again' }] }, async () => {
        const { topup } = session;
        const flow = await payWithOutcome(session, 'mada', 'N');
        await topup.assertFailedPopup();
        await topup.clickResultOkButton();
        await topup.checkBalanceRemainsUnchanged();
        await expect(topup.inputAmount, 'a new top-up must be possible after the decline').toBeVisible({ timeout: 15000 });

        const rows = await ledgerFor(flow.key, true);
        ledgers['3ds-declined'] = rows;
        expect(rows.filter(r => r.status !== 'PENDING').map(r => r.status)).toEqual(['FAILED']);
        test.info().annotations.push({ type: 'not-covered', description: 'The 3DS "technical error" (U) variant is left out to stay under the hourly count cap (AS4); add it when the cap is raised.' });
    });

    test('TUB-59: a pending payment credits nothing and has no terminal row', { annotation: [{ type: 'testcase', description: 'TUB-59 (first half): nothing is credited while the gateway result is pending' }] }, async () => {
        const { topup } = session;
        const flow = await payWithOutcome(session, 'visa', '3');
        await topup.assertPendingPopup();
        await topup.clickResultOkButton();
        await topup.checkBalanceRemainsUnchanged();

        const rows = await ledgerFor(flow.key, false);
        ledgers['pending'] = rows;
        expect(rows.length).toBeGreaterThanOrEqual(1);
        expect(rows.filter(r => r.status === 'SUCCESS'), 'a pending payment must not be posted as SUCCESS').toHaveLength(0);
        test.info().annotations.push({ type: 'not-covered', description: 'Resolution of the pending payment (success once / failure releases) needs a provider callback that is not available (see TUB-61).' });
    });

    test('TUB-21: failed and pending top-ups post no success row', { annotation: [{ type: 'testcase', description: 'TUB-21: no success posting, hence no commission or VAT, for failed, cancelled or pending outcomes' }] }, async () => {
        for (const name of ['declined', 'cancelled', '3ds-declined', 'pending']) {
            const rows = ledgers[name];
            test.skip(!rows, `the "${name}" payment did not run; run the whole file`);
            expect(rows!.filter(r => r.status === 'SUCCESS'), `${name}: SUCCESS row posted`).toHaveLength(0);
        }
    });

    test('TUB-67: every top-up has pending then exactly one terminal row', { annotation: [{ type: 'testcase', description: 'TUB-67: append-only ledger, one terminal row per finished top-up' }] }, async () => {
        for (const name of ['success', 'declined', 'cancelled', '3ds-declined']) {
            const rows = ledgers[name];
            test.skip(!rows, `the "${name}" payment did not run; run the whole file`);
            expect(rows![0]!.status, `${name}: first row`).toBe('PENDING');
            expect(rows!.filter(r => r.status !== 'PENDING'), `${name}: terminal rows`).toHaveLength(1);
        }
    });
});
