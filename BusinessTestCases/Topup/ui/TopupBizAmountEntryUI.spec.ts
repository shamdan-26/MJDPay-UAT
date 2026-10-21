import { test, expect } from '@playwright/test';
import { loginToTopup, gotoTopupScreen, TOPUP_UI_ACCOUNT, SUMMARY_LABEL, type TopupSession } from '../helpers/TopupHelper.ts';
import { proceedToSummary } from './TopupBizUiHelper';

// Business rules about what the user types in the amount field, proven on the screen: TUB-09 (a negative entry),
// TUB-10 (more than 2 decimals) and TUB-11 (an over-length amount). The rule in all three is the same: the amount the
// user sees in the field is the amount the Summary shows, so what is charged and credited cannot differ from what was typed.
// No payment is started: the flow stops at the Summary (POST /api/v1/payments/summary only; Next is never clicked), so
// these cases use no quota. The API versions are api/TopupBizAmountRules.spec.ts (same ids, different layer).
// One account, one active session: run with --workers=1.

test.describe('Topup business – UI – amount entry', { tag: ['@topup', '@ui', '@business'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120000);

    let session: TopupSession;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180000);
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
    });

    test.afterAll(async () => {
        await session?.page.close().catch(() => { /* already closed */ });
    });

    test.beforeEach(async () => {
        await gotoTopupScreen(session);
    });

    /** Types `typed`, and returns what the field kept plus what the Summary shows as the original amount (null when Proceed stays off). */
    async function typeAndSummarise(typed: string): Promise<{ field: string; summary: number | null }> {
        const { topup } = session;
        await topup.selectPaymentMethod('visa');
        await topup.enterAmount(typed);
        const field = await topup.getAmountValue();
        test.info().annotations.push({ type: 'observed', description: `typed "${typed}", the field holds "${field}"` });
        await session.page.waitForTimeout(500); // let the field's own validation settle before judging Proceed
        if (await topup.proceedButton.isDisabled()) {
            test.info().annotations.push({ type: 'observed', description: `Proceed is disabled for "${field}" (amount refused on the form)` });
            return { field, summary: null };
        }
        await proceedToSummary(session);
        const summary = await topup.getSummaryMoney(SUMMARY_LABEL.original);
        return { field, summary };
    }

    test('TUB-09: a negative entry never becomes a negative amount', { annotation: [{ type: 'testcase', description: 'TUB-09: -10 is refused or shown as a positive amount consistently; never a negative charge or credit' }] }, async () => {
        const { field, summary } = await typeAndSummarise('-10');
        expect(field, 'the field must not keep a minus sign').not.toContain('-');
        if (summary === null) return; // refused outright: balance cannot go down
        expect(summary, 'the Summary amount is positive').toBeGreaterThan(0);
        expect(summary, 'the Summary amount equals what the field holds').toBe(Number(field));
    });

    test('TUB-10: more than 2 decimals gives one consistent amount on the field and on the Summary', { annotation: [{ type: 'testcase', description: 'TUB-10: 10.555 -> one amount with at most 2 decimals, the same in the field and the Summary (10.55 per current behaviour)' }] }, async () => {
        const { field, summary } = await typeAndSummarise('10.555');
        expect(field, 'the field never holds a third decimal').not.toMatch(/\.\d{3,}/);
        test.skip(summary === null, 'Proceed stayed disabled for 10.55 (below the account minimum?), so the Summary side cannot be compared');
        expect(summary, 'the Summary amount equals what the field holds').toBe(Number(field));
    });

    test('TUB-11: an over-length amount is not charged differently from what the user confirms', { annotation: [{ type: 'testcase', description: 'TUB-11: a 9-digit entry -> the amount on the Summary equals the amount left in the field' },
        { type: 'not-covered', description: 'Whether silent truncation to 7 digits is the intended design is an open product question (TUP-13); only the field/Summary agreement is asserted.' }] }, async () => {
        const { field, summary } = await typeAndSummarise('999999999');
        test.skip(summary === null, 'Proceed stayed disabled for the truncated amount (over a limit?), so the Summary side cannot be compared');
        expect(summary, 'the Summary amount equals what the field holds').toBe(Number(field.replace(/,/g, '')));
    });
});
