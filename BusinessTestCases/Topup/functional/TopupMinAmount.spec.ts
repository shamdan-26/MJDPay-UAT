import { test, expect } from '@playwright/test';
import { loginToTopup, gotoTopupScreen, type TopupSession } from '../TopupHelper';
import {
    openAdminLimits, closeAdminLimits, attemptTopup, isBlocked,
    type AdminLimitsHandle,
} from '../TopupLimitsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Topup × admin-configured MINIMUM amount (TUA-B…, docs/manual-test-cases/Topup-Admin-Config-Matrix.md §B).
//
// The minimum is the `min` field of the admin Manage Limits → Transaction row for the account's transaction type
// ("Biller Bank Cashin", WEB) — not a separate setting (see AdminLimitsApi header). Every test writes the minimum for
// LOW/MEDIUM/HIGH (the account's tier isn't assumed), drives the real top-up UI up to — never through — payment, and
// afterAll restores the snapshot taken before the first change and re-reads it (§0.2: limits always return to the
// original value).
//
// Open item [CONFIRM-1]: whether the minimum is judged on the gross amount or net of commission. These cases use
// gross (the approved assumption); the net-credit ≤ 0 edge (TUA-B15) lives with the commission matrix.
// ─────────────────────────────────────────────────────────────────────────────

const PENDING = 'Not automated yet — see docs/manual-test-cases/Topup-Admin-Config-Matrix.md';
const fmt = (n: number) => n.toFixed(2);

test.describe('Topup — admin minimum top-up amount', { tag: ['@topup', '@functional', '@topup-admin-config'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'functional' }] }, () => {
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

    const setMin = async (m: number) => admin!.api.setAmountAllTiers(admin!.snapshot, { min: m });

    test('TUA-B01: amount just below the minimum is blocked before Summary/OTP/payment', async () => {
        const m = 25;
        await setMin(m);
        expect(isBlocked(await attemptTopup(session, fmt(m - 0.01)))).toBe(true);
    });

    test('TUA-B02: amount equal to the minimum is accepted', async () => {
        const m = 25;
        await setMin(m);
        expect(await attemptTopup(session, fmt(m))).toBe('proceeded');
    });

    test('TUA-B03: amount just above the minimum is accepted', async () => {
        const m = 25;
        await setMin(m);
        expect(await attemptTopup(session, fmt(m + 0.01))).toBe('proceeded');
    });

    test('TUA-B04: raising the minimum takes effect on the next initiation', async () => {
        await setMin(25);
        expect(await attemptTopup(session, '30')).toBe('proceeded');
        await setMin(40);
        expect(isBlocked(await attemptTopup(session, '30'))).toBe(true);
    });

    test('TUA-B05: lowering the minimum takes effect on the next initiation', async () => {
        await setMin(40);
        expect(isBlocked(await attemptTopup(session, '30'))).toBe(true);
        await setMin(5);
        expect(await attemptTopup(session, '30')).toBe('proceeded');
    });

    test('TUA-B06: the minimum is back to its original value after changes', async () => {
        await setMin(77);
        await admin!.api.restoreTopup(admin!.snapshot);
        // restoreTopup already re-reads and asserts equality; read once more independently of its own write path.
        await admin!.api.expectMatchesSnapshot(admin!.snapshot);
    });

    test('TUA-B07: minimum message is localized and shows the configured value', async () => {
        test.skip(true, PENDING);
    });

    test('TUA-B08: server enforces the minimum, not only the UI', async () => {
        test.skip(true, PENDING);
    });

    test('TUA-B09: a preset chip below the minimum cannot bypass the rule', async () => {
        await setMin(600);
        const { topup, page } = session;
        await gotoTopupScreen(session);
        await topup.selectPaymentMethod('mada');
        await page.getByTestId('amount-chip-500').click();
        await page.waitForTimeout(500);
        const blocked = await topup.proceedButton.isDisabled();
        if (!blocked) {
            await topup.proceedButton.click();
            await expect(topup.summaryNextButton).toBeHidden({ timeout: 10000 });
        }
    });

    test('TUA-B10: minimum applied per account type × risk tier (no cross-cell leakage)', async () => {
        test.skip(true, PENDING);
    });

    test('TUA-B11: minimum with decimals — 10.49 blocked, 10.50 accepted', async () => {
        await setMin(10.5);
        expect(isBlocked(await attemptTopup(session, '10.49'))).toBe(true);
        expect(await attemptTopup(session, '10.50')).toBe('proceeded');
    });

    test('TUA-B12: minimum of 0 — only the generic ">0" rule applies', async () => {
        await setMin(0);
        expect(await attemptTopup(session, '0.01')).toBe('proceeded');
    });

    test('TUA-B13: minimum greater than the daily limit — verify on dev what the admin save and the flow do', async () => {
        // Record, don't assume: either the PUT is rejected (good) or it is saved and no amount can succeed.
        const { api, snapshot } = admin!;
        const dailyNow = snapshot.amount.get([...snapshot.amount.keys()][0]!)!.daily;
        let rejected = false;
        try {
            await api.setAmountAllTiers(snapshot, { min: dailyNow + 1000 });
        } catch {
            rejected = true;
        }
        test.info().annotations.push({ type: 'observed', description: rejected ? 'admin API rejected min > daily max' : 'admin API ACCEPTED min > daily max' });
        if (!rejected) {
            expect(isBlocked(await attemptTopup(session, '30'))).toBe(true);
        }
    });

    test('TUA-B14: minimum below the commission tier lower bound — verify on dev (gap outcome)', async () => {
        test.skip(true, PENDING);
    });

    test('TUA-B15: net credit would be ≤ 0 is blocked', async () => {
        test.skip(true, PENDING); // needs a fixed commission ≥ the minimum — implemented with the commission × limits matrix
    });

    test('TUA-B16: minimum persists across sessions and devices', async () => {
        test.skip(true, PENDING);
    });
});
