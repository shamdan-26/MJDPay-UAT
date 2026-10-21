import { test, expect } from '@playwright/test';
import { loginToTopup, gotoTopupScreen, TOPUP_UI_ACCOUNT, SUMMARY_LABEL, type TopupSession } from '../helpers/TopupHelper.ts';
import { proceedToSummary, readBalanceBefore, watchInitiation } from '../ui/TopupBizUiHelper';

// Functional business rules about the amount the user enters: TUB-08 (zero), TUB-09 (negative), TUB-10 (more than 2
// decimals) and TUB-11 (over-length). The rule in all four: nothing is processed that the user did not see, so the
// amount in the field is the amount on the Summary, no payment is initiated, and the balance does not move.
// The flow stops at the Summary (Next is never clicked): POST /api/v1/payments is watched and must stay at zero calls,
// so these cases use no quota. The API versions are api/TopupBizAmountRules.spec.ts; the screen-only version of 09, 10
// and 11 (field vs Summary, no balance or network check) is ui/TopupBizAmountEntryUI.spec.ts.
// One account = one session: run with --workers=1.

test.describe('Topup business – functional – amount entry', { tag: ['@topup', '@functional', '@business'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let session: TopupSession;
    let balance: number;
    let initiation: ReturnType<typeof watchInitiation>;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180000);
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
    });

    test.afterAll(async () => {
        await session?.page.close().catch(() => { /* already closed */ });
    });

    test.beforeEach(async () => {
        await gotoTopupScreen(session);
        balance = await readBalanceBefore(session);
        initiation = watchInitiation(session.page);
    });

    test.afterEach(async () => {
        initiation.stop();
        // Leave the Summary (if one is open) and prove the balance did not move.
        if (await session.topup.summaryCancelButton.isVisible().catch(() => false)) await session.topup.clickSummaryCancelButton();
        await gotoTopupScreen(session);
        expect(await readBalanceBefore(session), 'the balance must not move: no payment was started').toBe(balance);
    });

    /** Types `typed`; returns what the field kept and the Summary's original amount (null when Proceed stays off). */
    async function typeAndSummarise(typed: string): Promise<{ field: string; summary: number | null }> {
        const { topup, page } = session;
        await topup.selectPaymentMethod('visa');
        await topup.enterAmount(typed);
        const field = await topup.getAmountValue();
        test.info().annotations.push({ type: 'observed', description: `typed "${typed}", the field holds "${field}"` });
        await page.waitForTimeout(500); // let the field's own validation settle before judging Proceed
        if (await topup.proceedButton.isDisabled()) return { field, summary: null };
        await proceedToSummary(session);
        return { field, summary: await topup.getSummaryMoney(SUMMARY_LABEL.original) };
    }

    test('TUB-08: zero amount is never processed', { annotation: [{ type: 'testcase', description: 'TUB-08: try to top up 0 -> Proceed stays disabled, no payment is created, the balance is unchanged' }] }, async () => {
        const { field, summary } = await typeAndSummarise('0');
        expect(summary, `Proceed must stay disabled for a zero amount (the field holds "${field}")`).toBeNull();
        expect(initiation.keys, 'no payment was initiated').toHaveLength(0);
    });

    test('TUB-09: a negative entry can never reduce the balance', { annotation: [{ type: 'testcase', description: 'TUB-09: -10 is refused, or shown as a positive 10 consistently on the form and the Summary; no payment, balance never goes down' }] }, async () => {
        const { field, summary } = await typeAndSummarise('-10');
        expect(field, 'the field must not keep a minus sign').not.toContain('-');
        if (summary !== null) {
            expect(summary, 'the Summary amount is positive').toBeGreaterThan(0);
            expect(summary, 'the Summary amount equals what the field holds').toBe(Number(field));
        }
        expect(initiation.keys, 'no payment was initiated').toHaveLength(0);
    });

    test('TUB-10: more than 2 decimals gives one consistent amount', { annotation: [{ type: 'testcase', description: 'TUB-10: 10.555 -> one amount with at most 2 decimals, the same in the field and on the Summary (10.55 per current behaviour)' }] }, async () => {
        const { field, summary } = await typeAndSummarise('10.555');
        expect(field, 'the field never holds a third decimal').not.toMatch(/\.\d{3,}/);
        test.skip(summary === null, 'Proceed stayed disabled for 10.55 (below the account minimum?), so the Summary side cannot be compared');
        expect(summary, 'the Summary amount equals what the field holds').toBe(Number(field));
        expect(initiation.keys, 'no payment was initiated').toHaveLength(0);
    });

    test('TUB-11: an over-length amount is not charged differently from what the user typed', { annotation: [{ type: 'testcase', description: 'TUB-11: a 9-digit entry -> the field keeps at most 7 digits and the Summary equals what the field holds' },
        { type: 'not-covered', description: 'Whether silent truncation to 7 digits is the intended design is an open product question (TUP-13); only the 7-digit ceiling and the field/Summary agreement are asserted.' }] }, async () => {
        const { field, summary } = await typeAndSummarise('999999999');
        expect(field.replace(/[^\d]/g, '').length, 'the field keeps at most 7 digits').toBeLessThanOrEqual(7);
        test.skip(summary === null, 'Proceed stayed disabled for the truncated amount (over a limit?), so the Summary side cannot be compared');
        expect(summary, 'the Summary amount equals what the field holds').toBe(Number(field.replace(/,/g, '')));
        expect(initiation.keys, 'no payment was initiated').toHaveLength(0);
    });
});
