import { test, expect } from '@playwright/test';
import { loginToTopup, gotoTopupScreen, type TopupSession } from '../helpers/TopupHelper.ts';
import {
    openAdminLimits, closeAdminLimits, attemptTopup, isBlocked,
    type AdminLimitsHandle,
} from '../helpers/TopupLimitsHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Topup × admin-configured LIMITS (TUA-C…, docs/manual-test-cases/Topup-Admin-Config-Matrix.md §C).
//
// Admin Manage Limits has three screens (all driven through AdminLimitsApi, one admin login per suite):
//   Wallet Balance → max/min balance per wallet type × risk level      (BAL_MAX)
//   Transaction    → min + HOUR/DAY/MONTH/YEAR max amount per type × risk × platform   (AMT_*)
//   Count          → HOUR/DAY/MONTH/YEAR max count per type × risk × platform          (CNT_*)
// Differences from the matrix draft, verified on dev 2026-10-13: there is no WEEK period and no separate
// per-transaction max (TXN_MAX) — the hourly amount cap is the tightest per-period amount rule.
//
// Cases that need a FRESH quota (exact-boundary usage, N-th/N+1-th, window rollover) can't run on the shared Biller
// account, whose usage today is unknown and keeps growing — they need one dedicated, never-used account per case
// (matrix §0.4) and are listed as pending stubs below with the reason. Cases that hold regardless of current usage
// (over-the-cap, zero cap, ceiling below balance) are automated here. All of them stop before payment and restore
// every limit in afterAll.
// ─────────────────────────────────────────────────────────────────────────────

const PENDING = 'Not automated yet — see docs/manual-test-cases/Topup-Admin-Config-Matrix.md';
const NEEDS_FRESH_ACCOUNT = 'Needs a dedicated never-used account (exact quota usage) — see matrix §0.4';
const NEEDS_CLOCK = 'Needs a window rollover (KSA midnight / month start) — manual or clock-controlled env';

test.describe('Topup — admin limits (amount, count, wallet balance)', { tag: ['@topup', '@functional', '@topup-admin-config'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(240000);

    let admin: AdminLimitsHandle | undefined;
    let session: TopupSession;

    test.beforeAll(async ({ browser }) => {
        admin = await openAdminLimits(browser);
        session = await loginToTopup(browser);
    });

    test.afterAll(async () => {
        try {
            await closeAdminLimits(admin);
        } finally {
            await session?.page.close().catch(() => { /* already closed */ });
        }
    });

    /** Start every test from the original config so one test's limits never leak into the next. */
    test.beforeEach(async () => {
        await admin!.api.restoreTopup(admin!.snapshot);
    });

    /** Caps all four periods at `cap` (never below the original monthly/yearly, so only the cap under test can bind). */
    const capAmounts = async (cap: number, periods: Array<'hourly' | 'daily'> = ['hourly', 'daily']) => {
        const { api, snapshot } = admin!;
        const first = snapshot.amount.get([...snapshot.amount.keys()][0]!)!;
        await api.setAmountAllTiers(snapshot, {
            min: 0,
            hourly: periods.includes('hourly') ? cap : Math.max(first.hourly, cap),
            daily: periods.includes('daily') ? cap : Math.max(first.daily, cap),
            monthly: Math.max(first.monthly, cap),
            yearly: Math.max(first.yearly, cap),
        });
    };

    const readBalance = async (): Promise<number> => {
        await gotoTopupScreen(session);
        return session.topup.getBalanceBeforeTopup();
    };

    // ---------- Wallet balance ceiling (BAL_MAX) ----------

    test('TUA-C03: balance already at the ceiling — any top-up is blocked', async () => {
        const balance = await readBalance();
        test.skip(balance < 2, 'Balance too small to set a ceiling at/below it (maxBalance must stay above minBalance 0)');
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: Math.floor(balance) });
        expect(isBlocked(await attemptTopup(session, '10'))).toBe(true);
    });

    test('TUA-C05: ceiling lowered below the current balance — existing balance untouched, new top-ups blocked', async () => {
        const balance = await readBalance();
        test.skip(balance < 3, 'Balance too small to set a ceiling below it');
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: Math.floor(balance) - 1 });
        expect(isBlocked(await attemptTopup(session, '10'))).toBe(true);
        expect(await readBalance()).toBe(balance);
    });

    test('TUA-C02: a top-up that would cross the ceiling is blocked before the gateway', { annotation: [{ type: 'testcase', description: 'TUB-121: A top-up that would cross the wallet ceiling is blocked before the gateway' }] }, async () => {
        const balance = await readBalance();
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: Math.ceil(balance) + 5 });
        // Net credit of a 500 top-up exceeds 5 even after any realistic commission, so it must be refused.
        expect(isBlocked(await attemptTopup(session, '500'))).toBe(true);
        expect(await readBalance()).toBe(balance);
    });

    test('TUA-C04: ceiling raised after a block — the same top-up now proceeds', async () => {
        const balance = await readBalance();
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: Math.ceil(balance) + 5 });
        expect(isBlocked(await attemptTopup(session, '500'))).toBe(true);
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: Math.ceil(balance) + 100000 });
        expect(await attemptTopup(session, '500')).toBe('proceeded');
    });

    test('TUA-C10: wallet ceiling is back to its original value', async () => {
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: 1 });
        await admin!.api.restoreTopup(admin!.snapshot);
        await admin!.api.expectMatchesSnapshot(admin!.snapshot);
    });

    // ---------- Amount limits (AMT_*) ----------

    test('TUA-C12: one halala over the daily cap is blocked', async () => {
        await capAmounts(1000);
        expect(isBlocked(await attemptTopup(session, '1000.01'))).toBe(true);
    });

    test('TUA-C34: hourly cap — amount over it is blocked even with daily headroom (no per-transaction max exists; hourly is the tightest)', async () => {
        const { api, snapshot } = admin!;
        const first = snapshot.amount.get([...snapshot.amount.keys()][0]!)!;
        await api.setAmountAllTiers(snapshot, { min: 0, hourly: 500, daily: Math.max(first.daily, 100000), monthly: Math.max(first.monthly, 100000), yearly: Math.max(first.yearly, 100000) });
        expect(isBlocked(await attemptTopup(session, '500.01'))).toBe(true);
    });

    test('TUA-C21: daily cap lowered mid-day is judged against the new value', async () => {
        await capAmounts(100000);
        expect(await attemptTopup(session, '2000')).toBe('proceeded');
        await capAmounts(1000);
        expect(isBlocked(await attemptTopup(session, '2000'))).toBe(true);
    });

    test('TUA-C23: amount limits are back to their original values', async () => {
        await capAmounts(1);
        await admin!.api.restoreTopup(admin!.snapshot);
        await admin!.api.expectMatchesSnapshot(admin!.snapshot);
    });

    // ---------- Count limits (CNT_*) ----------

    test('TUA-C26: daily count of 0 disables top-up — page opens, blocked at initiation', { annotation: [{ type: 'testcase', description: 'TUB-25: Count 0 means top-up is blocked outright' }] }, async () => {
        await admin!.api.setCountAllTiers(admin!.snapshot, { daily: 0 });
        expect(isBlocked(await attemptTopup(session, '10'))).toBe(true);
        // The Topup page itself still opened (attemptTopup navigated to it and reached the amount field).
        await expect(session.topup.inputAmount).toBeVisible();
    });

    test('TUA-C32: count limits are back to their original values', async () => {
        await admin!.api.setCountAllTiers(admin!.snapshot, { hourly: 0, daily: 0 });
        await admin!.api.restoreTopup(admin!.snapshot);
        await admin!.api.expectMatchesSnapshot(admin!.snapshot);
    });

    // ---------- Pending (need fresh quota / clock / manual) ----------

    for (const [id, title, reason] of [
        ['TUA-C01', 'top-up landing exactly on the balance ceiling', NEEDS_FRESH_ACCOUNT],
        ['TUA-C06', 'ceiling per risk tier', NEEDS_FRESH_ACCOUNT],
        ['TUA-C07', 'ceiling per account type', NEEDS_FRESH_ACCOUNT],
        ['TUA-C08', 'pending funds vs the ceiling [CONFIRM-5]', NEEDS_FRESH_ACCOUNT],
        ['TUA-C09', 'ceiling error message (manual usability review)', PENDING],
        ['TUA-C11', 'exactly reaching the daily amount limit', NEEDS_FRESH_ACCOUNT],
        ['TUA-C13', 'two top-ups that together cross the daily limit', NEEDS_FRESH_ACCOUNT],
        ['TUA-C14', 'failed top-up does not consume daily amount [CONFIRM-5]', NEEDS_FRESH_ACCOUNT],
        ['TUA-C15', 'pending top-up and the amount limit [CONFIRM-5]', NEEDS_FRESH_ACCOUNT],
        ['TUA-C16', 'weekly amount limit (no WEEK period exists on dev admin — matrix to be amended)', PENDING],
        ['TUA-C17', 'monthly limit tighter than the daily allowance', NEEDS_FRESH_ACCOUNT],
        ['TUA-C18', 'most-restrictive limit wins — message names the tightest limit', NEEDS_FRESH_ACCOUNT],
        ['TUA-C19', 'daily window rollover at midnight (KSA)', NEEDS_CLOCK],
        ['TUA-C20', 'monthly window rollover', NEEDS_CLOCK],
        ['TUA-C22', 'limit removed / not configured', PENDING],
        ['TUA-C24', 'N-th top-up allowed, N+1 blocked', NEEDS_FRESH_ACCOUNT],
        ['TUA-C25', 'daily count of 1 — second top-up blocked', NEEDS_FRESH_ACCOUNT],
        ['TUA-C27', 'failed attempts do not consume count [CONFIRM-5]', NEEDS_FRESH_ACCOUNT],
        ['TUA-C28', 'cancel at Summary/OTP does not consume count', NEEDS_FRESH_ACCOUNT],
        ['TUA-C29', 'pending counted? [CONFIRM-5]', NEEDS_FRESH_ACCOUNT],
        ['TUA-C30', 'count window rollover', NEEDS_CLOCK],
        ['TUA-C31', 'monthly count tighter than daily', NEEDS_FRESH_ACCOUNT],
        ['TUA-C33', 'exactly the per-transaction max (no TXN_MAX setting on dev admin — matrix to be amended)', PENDING],
        ['TUA-C35', 'interaction with the 7-digit input cap', PENDING],
        ['TUA-C36', 'per account type × risk tier matrix', NEEDS_FRESH_ACCOUNT],
    ] as const) {
        test(`${id}: ${title}`, () => {
            test.skip(true, reason);
        });
    }
});
