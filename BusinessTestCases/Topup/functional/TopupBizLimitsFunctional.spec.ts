import { test, expect } from '@playwright/test';
import { loginToTopup, TOPUP_UI_ACCOUNT, type TopupSession } from '../helpers/TopupHelper.ts';
import { openAdminLimits, closeAdminLimits, applyAmountsOnScreen, attemptTopup, attemptInfo, isBlocked, type AdminLimitsHandle } from '../helpers/TopupLimitsHelper.ts';
import { raiseMerchantCountHeadroom } from '../ui/TopupBizUiHelper';
import { TOPUP_TYPE_NAME, type AmountLimitValues } from '../../pageElements/Shared/AdminLimitsApi';

// Functional business rules about the AMOUNT limits of a Merchant top-up: TUB-12 (minimum), TUB-22 (one halala over the
// cap), TUB-27 (the tightest period binds), TUB-31 (a limit stops the flow before OTP and charge) and TUB-35 (a changed
// limit applies to the next attempt). The limits are changed on the admin Transaction limits SCREEN
// (AdminTransactionLimitsPage, one save per risk tier), never through the API; the original limits are read once through
// the API (read-only) and put back on the screen after every test, with the API restore as the last safety net.
// Every block has a control: with the limits relaxed the same top-up proceeds, so a block caused by anything but the
// configured limit cannot pass. Only "blocked" is asserted, never the wording (AS11). The attempt never pays.
// Quota: a control that proceeds starts one real initiation (unpaid ones count against the hourly COUNT cap, AS4), so the
// Merchant hourly count is raised for the run and restored in afterAll (raiseMerchantCountHeadroom). The count itself is
// the only limit still written through the API (the Count screen has no page object).
// The exact-usage cases (23, 24, 28, 30) and the wallet ceiling (29) stay in functional/TopupLimits*.spec.ts: they need a
// fresh account or the Wallet Balance screen. One admin login at a time and one app session per account: --workers=1.

const HIGH = 100000;
const fmt = (n: number) => n.toFixed(2);
/** Raises each period to at least `floor`, so the period under test is the only one that can bind. */
const atLeast = (o: AmountLimitValues, floor: number) => ({ monthly: Math.max(o.monthly, floor), yearly: Math.max(o.yearly, floor) });

test.describe('Topup business – functional – amount limits (Merchant)', { tag: ['@topup', '@functional', '@business'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(300000);

    let admin: AdminLimitsHandle | undefined;
    let session: TopupSession;
    let restoreCount: (() => Promise<void>) | undefined;
    let changed = false;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(420000); // hooks do not inherit the describe timeout: two admin round trips, then the app login
        restoreCount = await raiseMerchantCountHeadroom(browser); // admin login first, closed before the next one starts
        admin = await openAdminLimits(browser, TOPUP_TYPE_NAME.MERCHANT, 'Merchant');
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
    });

    test.afterEach(async () => {
        // A top-up that proceeded leaves its gateway popup or OTP step open: close it so it never leaks into the next test.
        for (const stray of session.page.context().pages()) {
            if (stray !== session.page) await stray.close().catch(() => { /* already closed */ });
        }
        session.topup.resetActivePage();
        if (!changed) return;
        changed = false;
        await applyAmountsOnScreen(admin!, original => original);
    });

    test.afterAll(async () => {
        try {
            await closeAdminLimits(admin);
        } finally {
            try {
                await session?.page.close().catch(() => { /* already closed */ });
            } finally {
                await restoreCount?.();
            }
        }
    });

    /** Writes the amount limits of every risk tier on the admin screen; `values` gets each tier's ORIGINAL values. */
    const setLimits = async (values: (original: AmountLimitValues) => AmountLimitValues) => {
        changed = true;
        await applyAmountsOnScreen(admin!, values);
    };

    const expectProceeds = async (amount: string, what: string) => {
        const attempt = await attemptTopup(session, amount);
        expect(attempt, `${what}: the top-up must proceed. Backend answer at Next: ${attemptInfo.detail || 'n/a'}`).toBe('proceeded');
    };

    test('TUB-12: below the minimum is rejected, at the minimum is accepted', { annotation: [{ type: 'testcase', description: 'TUB-12: minimum 25 -> 24.99 stopped before payment, 25.00 proceeds' }] }, async () => {
        await setLimits(o => ({ ...o, min: 25 }));
        expect(isBlocked(await attemptTopup(session, fmt(25 - 0.01))), '24.99 is below the minimum').toBe(true);
        await expectProceeds(fmt(25), 'the minimum itself');
    });

    test('TUB-22: exactly the cap passes, one halala more fails', { annotation: [{ type: 'testcase', description: 'TUB-22: hourly and daily cap 1000 -> 1000.01 is stopped before payment, 1000.00 proceeds' },
        { type: 'not-covered', description: 'Exact remaining headroom after earlier usage needs a fresh, never-used account (TUA-C11); this case fixes the cap and tests both sides of it.' }] }, async () => {
        await setLimits(o => ({ min: o.min, hourly: 1000, daily: 1000, ...atLeast(o, 1000) }));
        expect(isBlocked(await attemptTopup(session, '1000.01')), 'one halala over the cap').toBe(true);
        await expectProceeds('1000', 'exactly the cap');
    });

    test('TUB-27: the tightest period blocks while the others have headroom', { annotation: [{ type: 'testcase', description: 'TUB-27: hourly cap 500, the other periods at 100000 -> 500.01 is stopped before payment, 500.00 proceeds' },
        { type: 'not-covered', description: 'Only the hourly period is exercised as the binding one: the admin save needs hourly <= daily <= monthly <= yearly, so a larger period cannot be the tightest alone.' }] }, async () => {
        await setLimits(o => ({ min: o.min, hourly: 500, daily: Math.max(o.daily, HIGH), ...atLeast(o, HIGH) }));
        expect(isBlocked(await attemptTopup(session, '500.01')), 'over the hourly cap with daily headroom').toBe(true);
        await expectProceeds('500', 'exactly the hourly cap');
    });

    test('TUB-31: a limit failure stops the flow before OTP and charge', { annotation: [{ type: 'testcase', description: 'TUB-31: cap 5, a top-up of 100 -> stopped at the start; no OTP boxes, no gateway popup' }] }, async () => {
        await setLimits(o => ({ min: o.min, hourly: 5, daily: 5, monthly: 5, yearly: 5 }));
        const attempt = await attemptTopup(session, '100');
        test.info().annotations.push({ type: 'blocked-at', description: attempt });
        expect(attempt, `the server failed instead of rejecting by limit: ${attemptInfo.detail}`).not.toBe('server-error');
        expect(isBlocked(attempt), 'the top-up must be stopped before payment').toBe(true);
        await expect(session.otp.inputs.first(), 'no OTP is asked for a blocked top-up').not.toBeVisible();
        expect(session.page.context().pages(), 'no gateway popup was opened').toHaveLength(1);
    });

    test('TUB-35: a changed limit applies to the next attempt', { annotation: [{ type: 'testcase', description: 'TUB-35: cap 100000 -> 2000 proceeds; the cap is lowered to 1000 on the screen -> the same 2000 is stopped' }] }, async () => {
        await setLimits(o => ({ min: o.min, hourly: HIGH, daily: Math.max(o.daily, HIGH), ...atLeast(o, HIGH) }));
        await expectProceeds('2000', 'with the high cap');
        await setLimits(o => ({ min: o.min, hourly: 1000, daily: 1000, ...atLeast(o, 1000) }));
        expect(isBlocked(await attemptTopup(session, '2000')), 'the lowered cap applies to the very next attempt').toBe(true);
    });
});
