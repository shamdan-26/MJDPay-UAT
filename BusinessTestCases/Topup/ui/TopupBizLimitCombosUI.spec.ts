import { test, expect } from '@playwright/test';
import { loginToTopup, gotoTopupScreen, TOPUP_UI_ACCOUNT, type TopupSession } from '../TopupHelper';
import { openAdminLimits, closeAdminLimits, attemptTopup, attemptInfo, isBlocked, type AdminLimitsHandle, type TopupAttempt } from '../TopupLimitsHelper';
import { TOPUP_TYPE_NAME } from '../../pageElements/Shared/AdminLimitsApi';
import testAccounts from '../../../data/testAccounts.json';

// Biller block account: the shared Biller (Y4171, data/testAccounts.json) with the shared default password. loginToTopup's own default
// (Q9557 + the LOGIN_PASSWORD env var) is rejected on dev, so it is never relied on here. The Biller limit type, wallet type and
// commission used below are those of any Biller account.
const BILLER_ACCOUNT = { company: testAccounts.biller.company, mobile: testAccounts.biller.mobile, password: testAccounts.defaultPassword };

// Business rules: several limits at once, and the matrix rows that are limit x account type. TUB-112, 113, 114 (Biller) and
// TUB-120, 128 (Merchant), driven through the browser: the admin config is changed with the admin-portal helper, then the
// top-up is attempted on the Amount screen. The attempt stops before payment (attemptTopup never pays).
// The legacy API version is business/TopupBizCombinations.spec.ts (same ids, different layer).
//
// Every block is followed by a CONTROL: the limits go back (count raised) and the SAME top-up must now proceed, so a block
// caused by anything other than the configured limit cannot pass. Per AS11 only "blocked" is asserted, never the wording;
// the step where the flow stopped is attached as an annotation so a human can compare it with the check order (AS16).
// Real initiations: each control that proceeds starts one top-up on the dev gateway and counts against the hourly COUNT cap
// (unpaid top-ups count, AS4 conflict): 3 on the Biller account and 2 on the Merchant account per run.
// One admin login at a time and one app session per account: run with --workers=1.

const AMOUNT = '100';
const OPEN_COUNT = { hourly: 1000, daily: 1000, monthly: 1000, yearly: 1000 };
const ZERO_COUNT = { hourly: 0, daily: 0, monthly: 0, yearly: 0 };
const capAmounts = (cap: number) => ({ min: 0, hourly: cap, daily: cap, monthly: cap, yearly: cap });

async function closeStrays(session: TopupSession | undefined) {
    if (!session) return;
    for (const stray of session.page.context().pages()) {
        if (stray !== session.page) await stray.close().catch(() => { /* already closed */ });
    }
    session.topup.resetActivePage();
}

/** Blocked before payment, with the step where it stopped attached for the human check of the order (AS16). */
async function expectBlocked(session: TopupSession, what: string) {
    const attempt: TopupAttempt = await attemptTopup(session, AMOUNT);
    test.info().annotations.push({ type: 'blocked-at', description: `${what}: ${attempt}` });
    // A server failure is not a limit rejection: it would make the block look proven for the wrong reason.
    expect(attempt, `${what}: the server failed (HTTP 5xx at Next) instead of rejecting by limit. Backend answer: ${attemptInfo.detail}`).not.toBe('server-error');
    expect(isBlocked(attempt), `${what}: the top-up must be stopped before payment, got "${attempt}"`).toBe(true);
}

/** The CONTROL: original limits back (count raised so the control is not stopped by usage), the same top-up proceeds. */
async function expectProceedsAfterRestore(admin: AdminLimitsHandle, session: TopupSession, what: string) {
    await admin.api.restoreTopup(admin.snapshot);
    await admin.api.setCountAllTiers(admin.snapshot, OPEN_COUNT);
    // The message is built after attemptTopup finished, so attemptInfo.detail holds the backend's answer when the flow stopped at Next.
    expect(await attemptTopup(session, AMOUNT), `${what} control: with the limits restored the same top-up must proceed. Backend answer at Next: ${attemptInfo.detail || 'n/a'}`).toBe('proceeded');
}

test.describe.configure({ mode: 'serial' });

test.describe('Topup business – UI – limit combinations (Biller)', { tag: ['@topup', '@ui', '@business'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(240000);

    let admin: AdminLimitsHandle | undefined;
    let session: TopupSession;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(300000); // hooks do not inherit the describe timeout: admin login first, then the app login
        admin = await openAdminLimits(browser);
        session = await loginToTopup(browser, BILLER_ACCOUNT);
    });

    test.afterEach(async () => {
        await closeStrays(session);
        await admin!.api.restoreTopup(admin!.snapshot);
    });

    test.afterAll(async () => {
        try {
            await closeAdminLimits(admin);
        } finally {
            await session?.page.close().catch(() => { /* already closed */ });
        }
    });

    const readBalance = async (): Promise<number> => {
        await gotoTopupScreen(session);
        return session.topup.getBalanceBeforeTopup();
    };

    test('TUB-112: count and amount both fail', { annotation: [{ type: 'testcase', description: 'TUB-112: Count 0 plus a tiny amount cap -> the top-up is stopped before payment; restoring the limits lets it proceed' }] }, async () => {
        // Known defect (found 2026-10-18 on dev): with count 0 plus an amount cap the Next step answers HTTP 500
        // INTERNAL_SERVER_ERROR instead of a limit rejection. Expected to fail; this test starts failing the run
        // ("expected to fail but passed") once the backend is fixed - then remove this line.
        test.fail(true, 'Known defect: count 0 + amount cap returns HTTP 500 instead of a limit rejection');
        await admin!.api.setCountAllTiers(admin!.snapshot, ZERO_COUNT);
        await admin!.api.setAmountAllTiers(admin!.snapshot, capAmounts(5));
        await expectBlocked(session, 'count 0 and amount cap 5');
        await expectProceedsAfterRestore(admin!, session, 'TUB-112');
    });

    test('TUB-113: amount and wallet both fail', { annotation: [{ type: 'testcase', description: 'TUB-113: amount cap 5 plus the wallet at its max balance -> stopped before payment; restoring lets it proceed' }] }, async () => {
        const balance = await readBalance();
        test.skip(balance < 2, 'Balance too small to set a wallet ceiling at it (max balance must stay above the minimum)');
        await admin!.api.setAmountAllTiers(admin!.snapshot, capAmounts(5));
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: Math.floor(balance) });
        await expectBlocked(session, 'amount cap 5 and wallet at max');
        await expectProceedsAfterRestore(admin!, session, 'TUB-113');
    });

    test('TUB-114: count, amount and wallet all fail', { annotation: [{ type: 'testcase', description: 'TUB-114: Count 0, amount cap 5 and wallet at max -> stopped before payment (one stop, not several); restoring lets it proceed' }] }, async () => {
        const balance = await readBalance();
        test.skip(balance < 2, 'Balance too small to set a wallet ceiling at it (max balance must stay above the minimum)');
        await admin!.api.setCountAllTiers(admin!.snapshot, ZERO_COUNT);
        await admin!.api.setAmountAllTiers(admin!.snapshot, capAmounts(5));
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: Math.floor(balance) });
        await expectBlocked(session, 'count 0, amount cap 5 and wallet at max');
        await expectProceedsAfterRestore(admin!, session, 'TUB-114');
    });
});

test.describe('Topup business – UI – limit rejections (Merchant)', { tag: ['@topup', '@ui', '@business'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(240000);

    let admin: AdminLimitsHandle | undefined;
    let adminSkipReason = '';
    let session: TopupSession;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(300000);
        try {
            admin = await openAdminLimits(browser, TOPUP_TYPE_NAME.MERCHANT, 'Merchant');
        } catch (e) {
            adminSkipReason = `No limit rows for "${TOPUP_TYPE_NAME.MERCHANT}" / wallet "Merchant": ${(e as Error).message.slice(0, 120)}`;
        }
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
    });

    test.afterEach(async () => {
        await closeStrays(session);
        if (admin) await admin.api.restoreTopup(admin.snapshot);
    });

    test.afterAll(async () => {
        try {
            await closeAdminLimits(admin);
        } finally {
            await session?.page.close().catch(() => { /* already closed */ });
        }
    });

    test('TUB-120: Merchant, amount cap exceeded', { annotation: [{ type: 'testcase', description: 'TUB-120: Merchant with an amount cap of 5 -> stopped before payment; restoring lets the same top-up proceed' }] }, async () => {
        test.skip(!admin, adminSkipReason);
        await admin!.api.setCountAllTiers(admin!.snapshot, OPEN_COUNT);
        await admin!.api.setAmountAllTiers(admin!.snapshot, capAmounts(5));
        await expectBlocked(session, 'Merchant amount cap 5');
        await expectProceedsAfterRestore(admin!, session, 'TUB-120');
    });

    test('TUB-128: Merchant, count cap exceeded', { annotation: [{ type: 'testcase', description: 'TUB-128: Merchant with Count 0 -> stopped before payment; restoring lets the same top-up proceed' }] }, async () => {
        test.skip(!admin, adminSkipReason);
        await admin!.api.setCountAllTiers(admin!.snapshot, ZERO_COUNT);
        await expectBlocked(session, 'Merchant count 0');
        await expectProceedsAfterRestore(admin!, session, 'TUB-128');
    });
});
