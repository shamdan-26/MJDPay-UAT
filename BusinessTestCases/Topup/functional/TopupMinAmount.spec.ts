import { test, expect } from '@playwright/test';
import testAccounts from '../../../data/testAccounts.json';
import { envAccount, startSession, initiate, expectRejected, why, ledger } from '../business/TopupBizApi';
import { loginToCommissionManagement } from '../../CommissionManagement/CommissionManagementHelper';
import { TOPUP_TYPE_NAME } from '../../pageElements/Shared/AdminLimitsApi';
import { loginToTopup,gotoTopupScreen, type TopupSession } from '../TopupHelper';
import {
    openAdminLimits, closeAdminLimits, attemptTopup, isBlocked,
    type AdminLimitsHandle,
} from '../TopupLimitsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Topup × admin-configured MINIMUM amount (TUA-B…, docs/manual-test-cases/Topup-Admin-Config-Matrix.md §B).
//
// The minimum is the `min` field of the admin Manage Limits → Transaction row for the account's transaction type
// ("Merchant Cashin", WEB, Merchant wallet) — not a separate setting (see AdminLimitsApi header). Every test writes the minimum for
// LOW/MEDIUM/HIGH (the account's tier isn't assumed), drives the real top-up UI up to — never through — payment, and
// afterAll restores the snapshot taken before the first change and re-reads it (§0.2: limits always return to the
// original value).
//
// Open item [CONFIRM-1]: whether the minimum is judged on the gross amount or net of commission. These cases use
// gross (the approved assumption); the net-credit ≤ 0 edge (TUA-B15) lives with the commission matrix.
// ─────────────────────────────────────────────────────────────────────────────

// Q9557 (loginToTopup's default) is rejected on dev and the Biller Y4171 answered POST /payments with HTTP 500 (wallet likely at its
// ceiling), so this suite runs on a Merchant account with the matching "Merchant Cashin" limit row. Switch account with
// TOPUP_MIN_ACCOUNT="company:mobile" when that wallet fills up too (it must be a Merchant wallet).
const MIN_ACCOUNT = envAccount('TOPUP_MIN_ACCOUNT')
    ?? { company: testAccounts.merchant.company, mobile: testAccounts.merchant.mobile, password: testAccounts.defaultPassword };
const fmt = (n: number) => n.toFixed(2);
// Cases that do not need the lazy top-up UI login: admin-only (B00, B06, B10) or with their own API login (B07, B08).
const ADMIN_ONLY = /TUA-B(00x?|06|07|08|10)\b/;
const messageOf = (body: any): string => String((Array.isArray(body) ? body[0] : body)?.message?.plainText ?? '');

test.describe('Topup — admin minimum top-up amount', { tag: ['@topup', '@functional', '@topup-admin-config'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(240000);

    let admin: AdminLimitsHandle | undefined;
    let session: TopupSession;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180_000); // hook timeout is separate from the describe/test timeout: UI login + admin work
        admin = await openAdminLimits(browser, TOPUP_TYPE_NAME.MERCHANT, 'Merchant');
    });

    // The top-up user logs in lazily so the admin-only cases (TUA-B00, B06, B10) run without the user side.
    test.beforeEach(async ({ browser }) => {
        if (ADMIN_ONLY.test(test.info().title) || session) return;
        session = await loginToTopup(browser, MIN_ACCOUNT);
    });

    test.afterAll(async () => {
        try {
            await closeAdminLimits(admin);
        } finally {
            await session?.page.close().catch(() => { /* already closed */ });
        }
    });

    const setMin = async (m: number) => admin!.api.setAmountAllTiers(admin!.snapshot, { min: m });

    test('TUA-B00: setup — the admin minimum is written and read back, other limits untouched', async () => {
        const { api, snapshot } = admin!;
        await setMin(25);
        const rows = await api.getTransactionLimits();
        const before = [...snapshot.amount.values()]; // same order as snapshot.cells
        expect(snapshot.cells.length, 'at least one risk tier was captured').toBeGreaterThan(0);
        for (const [i, cell] of snapshot.cells.entries()) {
            const now = await api.getAmountCell(cell, rows);
            expect(now, `${cell.typeName} ${cell.risk} ${cell.platform}: min is 25, hourly/daily/monthly/yearly unchanged`)
                .toEqual({ ...before[i]!, min: 25 });
        }
    });

    test('TUA-B00x: diagnostic — with the ORIGINAL limits a plain top-up initiation is not a server error', async ({ browser }) => {
        // Separates "dev initiation is broken for this account" from "the minimum value triggers the 500". Creates one unpaid pending
        // top-up (it counts against the hourly/daily count limit, like every initiation).
        const { api, snapshot } = admin!;
        await api.restoreTopup(snapshot); // original limits, re-read and compared
        const originalMin = Math.max(...[...snapshot.amount.values()].map(v => v.min));
        const amount = Math.max(30, originalMin + 1);
        const s = await startSession(browser, MIN_ACCOUNT);
        try {
            const r = await initiate(s, fmt(amount));
            test.info().annotations.push({ type: 'observed', description: `original minimum ${originalMin}, initiation of ${fmt(amount)}: ${why(r)}` });
            expect(r.status, `a plain ${fmt(amount)} initiation with the original limits must not be a server error: ${why(r)}`).toBeLessThan(500);
        } finally {
            await s.dispose();
        }
    });

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

    test('TUA-B07: minimum message is localized and shows the configured value', async ({ browser }) => {
        // Read from the initiation answer (the same text the app shows), once per language and once per configured minimum, so a
        // hard-coded or stale number would show. Digits may be Arabic-Indic in the Arabic text.
        const s = await startSession(browser, MIN_ACCOUNT);
        try {
            const shown: string[] = [];
            for (const [min, lang] of [[25, 'en'], [25, 'ar'], [40, 'en']] as const) {
                await setMin(min);
                const r = await initiate(s, fmt(min - 0.01), { headers: { 'accept-language': lang } });
                expectRejected(r, `below the minimum ${min} (${lang})`);
                const text = messageOf(r.body);
                shown.push(`${lang}/${min}: ${text}`);
                const arabicDigits = String(min).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!);
                expect(text, `message names the configured minimum ${min}: ${why(r)}`).toMatch(new RegExp(`${min}|${arabicDigits}`));
            }
            test.info().annotations.push({ type: 'observed', description: shown.join(' | ') });
        } finally {
            await s.dispose();
        }
    });

    test('TUA-B08: server enforces the minimum, not only the UI', async ({ browser }) => {
        const s = await startSession(browser, MIN_ACCOUNT);
        try {
            await setMin(25);
            const r = await initiate(s, fmt(25 - 0.01));
            expectRejected(r, 'initiation at 24.99 with minimum 25');
            expect(await ledger(r.key), 'no pending top-up row was created').toHaveLength(0);
        } finally {
            await s.dispose();
        }
    });

    test('TUA-B09: a preset chip below the minimum cannot bypass the rule', async () => {
        await setMin(600);
        const { topup, page, otp } = session;
        await gotoTopupScreen(session);
        await topup.selectPaymentMethod('mada');
        await page.getByTestId('amount-chip-500').click();
        await page.waitForTimeout(500);
        if (await topup.proceedButton.isDisabled()) return; // rejected on the amount screen
        await topup.proceedButton.click();
        // Like every other case here, the minimum may only be enforced when Next sends the initiation (the Summary still opens).
        const summary = await topup.summaryNextButton.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
        if (!summary) return; // rejected at Proceed
        await topup.waitForSummaryToSettle().catch(() => { /* summary may not show a total when blocked late */ });
        const initiation = page.waitForResponse(r => r.request().method() === 'POST' && /\/api\/v1\/payments$/.test(r.url()), { timeout: 15000 }).catch(() => null);
        await topup.summaryNextButton.click();
        const res = await initiation;
        expect(res?.ok(), 'the 500 chip must not be accepted when the minimum is 600').not.toBe(true);
        await expect(otp.inputs.first()).toBeHidden();
    });

    test('TUA-B10: minimum applied per account type × risk tier (no cross-cell leakage)', async () => {
        // Config level: a different minimum per Merchant risk tier must land only on its own tier, and the Biller type must not move.
        // (Judging a user against their own cell needs one dedicated account per cell — matrix §0.4 — which dev does not have.)
        const { api, snapshot } = admin!;
        const biller = await api.snapshotTopup(TOPUP_TYPE_NAME.BILLER, 'WEB', 'Biller');
        try {
            const before = [...snapshot.amount.values()]; // same order as snapshot.cells
            const wanted = snapshot.cells.map((_, i) => 20 + 10 * i);
            for (const [i, cell] of snapshot.cells.entries()) await api.putAmountCell(cell, { ...before[i]!, min: wanted[i]! });
            const rows = await api.getTransactionLimits();
            for (const [i, cell] of snapshot.cells.entries()) {
                expect((await api.getAmountCell(cell, rows)).min, `${cell.typeName} ${cell.risk}: its own minimum`).toBe(wanted[i]);
            }
            await api.expectMatchesSnapshot(biller); // Biller rows untouched by the Merchant writes
        } finally {
            await api.restoreTopup(biller);
        }
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

    test('TUA-B14: minimum below the commission tier lower bound — verify on dev (gap outcome)', async ({ browser }) => {
        // Record, don't assume (matrix: "verify on dev"): what happens when the minimum is below the commission tier's lower bound.
        const { context, commission } = await loginToCommissionManagement(browser);
        try {
            const cell = admin!.snapshot.cells[0]!;
            const row = await commission.apiFindCommission(cell.typeCode, 'WEB');
            test.skip(!row, `no default commission row for ${cell.typeName} on WEB`);
            test.skip(row!.min <= 1, `the commission tier starts at ${row!.min}: there is no gap below it to test`);
            const m = row!.min - 1;
            await setMin(m);
            const outcome = await attemptTopup(session, fmt(m));
            test.info().annotations.push({ type: 'observed', description: `minimum ${m} < commission tier min ${row!.min}: top-up outcome "${outcome}"` });
            expect(outcome).toBeTruthy();
        } finally {
            await context.close().catch(() => { /* already closed */ });
        }
    });

    test('TUA-B15: net credit would be ≤ 0 is blocked', async ({ browser }) => {
        // Needs an active FIXED commission on this type: one cannot be created (one rule per type+platform, edit defect TU-CM03),
        // so this runs only when dev already holds one.
        const { context, commission } = await loginToCommissionManagement(browser);
        try {
            const row = await commission.apiFindCommission(admin!.snapshot.cells[0]!.typeCode, 'WEB');
            test.skip(!row || row.type !== 'FIXED' || !row.isActive, 'needs an active FIXED commission on this type (cannot be created: one rule per type+platform, TU-CM03)');
            const a = Math.max(row!.min, 0.01);
            test.skip(a > row!.amountValue, `the tier starts at ${row!.min}, above the fixed commission ${row!.amountValue}: net credit stays positive`);
            await setMin(a);
            const outcome = await attemptTopup(session, fmt(a));
            expect(outcome, `net credit would be ${a - row!.amountValue} (≤ 0), so the top-up must stop`).not.toBe('proceeded');
        } finally {
            await context.close().catch(() => { /* already closed */ });
        }
    });

    test('TUA-B16: minimum persists across sessions and devices', async ({ browser }) => {
        // A fresh admin login reads the stored value; a fresh top-up login is judged against it. The mobile app half stays manual.
        await setMin(25);
        const second = await openAdminLimits(browser, TOPUP_TYPE_NAME.MERCHANT, 'Merchant');
        const fresh = await loginToTopup(browser, MIN_ACCOUNT);
        try {
            for (const v of second.snapshot.amount.values()) expect(v.min, 'a second admin login sees the stored minimum').toBe(25);
            expect(isBlocked(await attemptTopup(fresh, fmt(25 - 0.01)))).toBe(true);
        } finally {
            await second.context.close().catch(() => { /* already closed */ }); // read-only: no restore, the first handle owns it
            await fresh.page.close().catch(() => { /* already closed */ });
        }
    });
});
