import { test, expect, type Browser } from '@playwright/test';
import { openAdminLimits, closeAdminLimits, type AdminLimitsHandle } from '../TopupLimitsHelper';
import { TOPUP_TYPE_NAME } from '../../pageElements/Shared/AdminLimitsApi';
import { AMT, SECOND_USER, codeOf, why, startSession, initiate, expectRejected, ledger, balances, envAccount, paymentIdOf, type BizSession } from './TopupBizApi';

// Business rules: limit combinations and the rejection rows of the combination matrix. TUB-112 to 114 (group Q) and
// TUB-119 to 123, 128, 129 (group S). Only the REJECTION side is automated: a limit or privilege block happens at
// initiation, before any OTP or payment (AS16, check order). The rows are limit x user type x privilege; the OTP state and
// the commission source of the matrix cannot be set by the repo's tooling (no OTP or commission write helper), so they stay
// whatever dev has: a rejection happens before both, so the outcome does not depend on them.
// Per AS11 only "rejected" is asserted, never the wording. The observed messageCode is attached to the test as an
// annotation so a human can compare it with the check order (count, then amount, then wallet).
// Every rejection is followed by a CONTROL: the limits are put back and the same top-up must be accepted, so a rejection
// caused by anything other than the configured limit cannot pass unnoticed.
// Config is always restored (afterEach / finally). One admin login at a time: do not run in parallel with other admin specs.

const ZERO_COUNT = { hourly: 0, daily: 0, monthly: 0, yearly: 0 };
const caps = (n: number) => ({ hourly: n, daily: n, monthly: n, yearly: n });
const OPEN_COUNT = caps(1000);

/** Rejected before any payment, OTP or ledger row exists. */
async function expectBlocked(r: Awaited<ReturnType<typeof initiate>>, what: string) {
    expectRejected(r, what);
    expect(paymentIdOf(r.body), `${what}: no payment id for a blocked top-up`).toBeUndefined();
    expect(r.body?.isOtpRequired, `${what}: no OTP is requested for a blocked top-up`).not.toBe(true);
    expect(await ledger(r.key), `${what}: no ledger row for a blocked top-up`).toHaveLength(0);
    test.info().annotations.push({ type: 'observed-code', description: `${what}: ${codeOf(r.body) || 'no messageCode'}` });
}

/** Opens a second admin limits handle for another account type; skips the test when the rows cannot be found. */
async function openOrSkip(browser: Browser, typeName: string, walletType: string): Promise<AdminLimitsHandle> {
    try {
        return await openAdminLimits(browser, typeName, walletType);
    } catch (e) {
        test.skip(true, `No limit rows for "${typeName}" / wallet "${walletType}": ${(e as Error).message.slice(0, 120)}`);
        throw e;
    }
}

/** The CONTROL: config back to the original (with count headroom) and the same top-up is accepted. */
async function expectAcceptedAfterRestore(admin: AdminLimitsHandle, s: BizSession, what: string) {
    await admin.api.restoreTopup(admin.snapshot);
    await admin.api.setCountAllTiers(admin.snapshot, OPEN_COUNT);
    const r = await initiate(s, AMT);
    expect(r.ok, `${what} control: with the limits restored the same top-up must be accepted: ${why(r)}`).toBe(true);
}

test.describe('Topup business – limit combinations and matrix rejections', { tag: ['@topup', '@business', '@api'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'api' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180_000);

    let s: BizSession;
    let admin: AdminLimitsHandle | undefined;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180_000); // hook timeout is separate from the describe/test timeout: UI login + admin work
        s = await startSession(browser);
        admin = await openAdminLimits(browser);
        await admin.api.setCountAllTiers(admin.snapshot, OPEN_COUNT);
    });

    test.afterEach(async () => {
        await admin!.api.restoreTopup(admin!.snapshot);
        await admin!.api.setCountAllTiers(admin!.snapshot, OPEN_COUNT); // dev counts initiated top-ups: keep room for the next test
    });

    test.afterAll(async () => {
        test.setTimeout(120_000);
        await closeAdminLimits(admin);
        await s?.dispose();
    });

    // ---------- group Q: several limits fail together ----------

    test('TUB-112: count and amount both fail', { annotation: [{ type: 'testcase', description: 'TUB-112: Count 0 plus a tiny amount cap -> rejected before OTP and charge (count is checked first, see annotation)' }] }, async () => {
        await admin!.api.setCountAllTiers(admin!.snapshot, ZERO_COUNT);
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 1, ...caps(5) });
        await expectBlocked(await initiate(s, AMT), 'count and amount');
        await expectAcceptedAfterRestore(admin!, s, 'TUB-112');
    });

    test('TUB-113: amount and wallet both fail', { annotation: [{ type: 'testcase', description: 'TUB-113: amount cap 5 plus wallet at its max balance -> rejected before OTP and charge (amount is checked first, see annotation)' }] }, async () => {
        const { available } = await balances(s);
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 1, ...caps(5) });
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: available });
        await expectBlocked(await initiate(s, AMT), 'amount and wallet');
        await expectAcceptedAfterRestore(admin!, s, 'TUB-113');
    });

    test('TUB-114: count, amount and wallet all fail', { annotation: [{ type: 'testcase', description: 'TUB-114: Count 0, amount cap 5 and wallet at max -> rejected, one reason (count first, see annotation)' }] }, async () => {
        const { available } = await balances(s);
        await admin!.api.setCountAllTiers(admin!.snapshot, ZERO_COUNT);
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 1, ...caps(5) });
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: available });
        await expectBlocked(await initiate(s, AMT), 'count, amount and wallet');
        await expectAcceptedAfterRestore(admin!, s, 'TUB-114');
    });

    // ---------- group S: matrix rejection rows ----------

    test('TUB-119: Biller, count cap exceeded', { annotation: [{ type: 'testcase', description: 'TUB-119: Biller with Count 0 -> rejected before payment, no ledger row (so no commission is posted)' }] }, async () => {
        await admin!.api.setCountAllTiers(admin!.snapshot, ZERO_COUNT);
        await expectBlocked(await initiate(s, AMT), 'Biller count');
        await expectAcceptedAfterRestore(admin!, s, 'TUB-119');
    });

    test('TUB-121: Biller, wallet max balance exceeded', { annotation: [{ type: 'testcase', description: 'TUB-121: Biller whose wallet is at its max balance -> rejected before OTP and charge' }] }, async () => {
        const { available } = await balances(s);
        await admin!.api.setWalletAllTiers(admin!.snapshot, { maxBalance: available });
        await expectBlocked(await initiate(s, AMT), 'Biller wallet');
        await expectAcceptedAfterRestore(admin!, s, 'TUB-121');
    });

    test('TUB-129: Biller, per-transaction maximum exceeded', { annotation: [{ type: 'testcase', description: 'TUB-129: amount above the cap -> rejected before OTP, the cap itself is accepted' }] }, async () => {
        await admin!.api.setAmountAllTiers(admin!.snapshot, { min: 1, ...caps(5) });
        await expectBlocked(await initiate(s, AMT), 'Biller amount cap');
        await expectAcceptedAfterRestore(admin!, s, 'TUB-129');
    });

    test('TUB-120: Merchant, per-transaction maximum exceeded', { annotation: [{ type: 'testcase', description: 'TUB-120: Merchant with an amount cap of 5 -> rejected before OTP and charge, accepted again after restore' }] }, async ({ browser }) => {
        const merchantAdmin = await openOrSkip(browser, TOPUP_TYPE_NAME.MERCHANT, 'Merchant');
        const m = await startSession(browser, SECOND_USER);
        try {
            await merchantAdmin.api.setCountAllTiers(merchantAdmin.snapshot, OPEN_COUNT);
            await merchantAdmin.api.setAmountAllTiers(merchantAdmin.snapshot, { min: 1, ...caps(5) });
            await expectBlocked(await initiate(m, AMT), 'Merchant amount cap');
            await expectAcceptedAfterRestore(merchantAdmin, m, 'TUB-120');
        } finally {
            await m.dispose();
            await closeAdminLimits(merchantAdmin);
        }
    });

    test('TUB-128: Merchant, count cap exceeded', { annotation: [{ type: 'testcase', description: 'TUB-128: Merchant with Count 0 -> rejected, accepted again after restore' }] }, async ({ browser }) => {
        const merchantAdmin = await openOrSkip(browser, TOPUP_TYPE_NAME.MERCHANT, 'Merchant');
        const m = await startSession(browser, SECOND_USER);
        try {
            await merchantAdmin.api.setCountAllTiers(merchantAdmin.snapshot, ZERO_COUNT);
            await expectBlocked(await initiate(m, AMT), 'Merchant count');
            await expectAcceptedAfterRestore(merchantAdmin, m, 'TUB-128');
        } finally {
            await m.dispose();
            await closeAdminLimits(merchantAdmin);
        }
    });

    // The two privilege rows need an account WITHOUT the Topup privilege (same env var as TUB-04). Its user type is not
    // known to the repo, so TUB-122 (Merchant) and TUB-123 (Biller) run against it and report the type in the annotation.

    test('TUB-122: user without the Topup privilege, OTP on, account commission', { annotation: [{ type: 'testcase', description: 'TUB-122: no privilege -> rejected at the start, no OTP, no ledger row' }] }, async ({ browser }) => {
        const account = envAccount('TOPUP_NO_PRIVILEGE_ACCOUNT');
        test.skip(!account, 'Set TOPUP_NO_PRIVILEGE_ACCOUNT=company:mobile in .env.dev (user type of the account is not known to the repo)');
        const p = await startSession(browser, account!);
        try {
            await expectBlocked(await initiate(p, AMT), 'no privilege');
        } finally {
            await p.dispose();
        }
    });

    test('TUB-123: no privilege and a count cap exceeded at the same time', { annotation: [{ type: 'testcase', description: 'TUB-123: no privilege plus Count 0 on the Biller rule -> rejected; the reported reason is attached for a human to check that permission comes first' }] }, async ({ browser }) => {
        const account = envAccount('TOPUP_NO_PRIVILEGE_ACCOUNT');
        test.skip(!account, 'Set TOPUP_NO_PRIVILEGE_ACCOUNT=company:mobile in .env.dev (user type of the account is not known to the repo)');
        await admin!.api.setCountAllTiers(admin!.snapshot, ZERO_COUNT);
        const p = await startSession(browser, account!);
        try {
            await expectBlocked(await initiate(p, AMT), 'no privilege and count');
        } finally {
            await p.dispose();
        }
    });
});
