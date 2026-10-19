import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { envAccount } from '../business/TopupBizApi';
import { AdminOtpConfigPage, createAdminContext } from '../../pageElements/Shared/AdminOtpConfigPage';
import { loginToTopup, gotoTopupScreen, clickSummaryNextAndDetectOtp, TOPUP_UI_ACCOUNT, type TopupSession } from '../helpers/TopupHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Topup × admin Transaction OTP configuration (Admin → System Configurations → OTP → "Transaction OTP" tab).
//
// Rule: the admin creates a record that decides for which top-up amounts the user is asked for an OTP.
// Intended range is 2–10: at 2 and 10 the OTP is shown; below 2 and above 10 it is NOT shown.
//
// Known defects (annotated, expected to fail until fixed — a pass means the defect was fixed):
//   TOC-D1  the admin cannot save a maximum amount above 10.
//   TOC-D2  a Transaction OTP record can be created only once — a second creation is refused.
//
// Locators for the tab are label-based and have not been read off the live DOM yet (see AdminOtpConfigPage);
// the user-side cases use amounts below the admin limits' minimum with no extra handling, so a limit rejection
// reads as "OTP not shown" — keep the top-up limits minimum at or below 1 when running them.
// ─────────────────────────────────────────────────────────────────────────────

// Same shared Merchant account the Topup UI specs use (see TOPUP_UI_ACCOUNT in TopupHelper). On 2026-10-19 it answered
// POST /payments with HTTP 500 even for a plain 30 top-up on dev (TOC-00). Do NOT switch to `merchant2` (E9306): it is
// documented as locked (HTTP 423). Override with TOPUP_OTP_CFG_ACCOUNT="company:mobile" (a Merchant wallet that initiates).
const ACCOUNT = envAccount('TOPUP_OTP_CFG_ACCOUNT') ?? TOPUP_UI_ACCOUNT;

// The top-up record is listed as "Cash-In" on dev (min 2, max attempts 10).
const TOPUP_ROW = /cash-?in|top ?-?up/i;
const FIELD = {
    transaction: { label: /transaction/i, value: 'select:cash-?in|top ?-?up' },
    minAmount: { label: /min(imum)? amount/i },
    maxAmount: { label: /max(imum)? amount/i },
    maxAttempts: { label: /max(imum)? attempts/i },
};
const form = (min: string, max: string, attempts = '3') => ({
    transaction: FIELD.transaction,
    minAmount: { ...FIELD.minAmount, value: min },
    maxAmount: { ...FIELD.maxAmount, value: max },
    maxAttempts: { ...FIELD.maxAttempts, value: attempts },
});

test.describe('Topup — admin Transaction OTP range (2–10)', { tag: ['@topup', '@functional', '@topup-admin-config'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(240000);

    let adminContext: BrowserContext;
    let adminPage: Page;
    let admin: AdminOtpConfigPage;
    let session: TopupSession | undefined;
    let createdTopupRecord = false;
    // Top-up record present before the suite touched anything — never deleted by the cleanup.
    let topupRecordPreexisted = false;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180_000);
        adminContext = await createAdminContext(browser);
        adminPage = await adminContext.newPage();
        admin = new AdminOtpConfigPage(adminPage);
        await admin.login();
        await admin.openTransactionOtpTab();
        topupRecordPreexisted = (await admin.readTransactionOtpRows()).some(r => TOPUP_ROW.test(r.transaction));
    });

    test.afterAll(async () => {
        try {
            if (createdTopupRecord && !topupRecordPreexisted) {
                await admin.openTransactionOtpTab();
                const removed = await admin.deleteTransactionOtpRow(TOPUP_ROW);
                if (!removed) console.warn('TopupOtpAdminConfig: the created Top-up record could not be deleted from the UI — remove it manually.');
            }
        } finally {
            await session?.page.close().catch(() => { /* already closed */ });
            await adminContext?.close().catch(() => { /* already closed */ });
        }
    });

    /** Drives the real top-up UI to Summary → Next and reports whether the OTP screen opened. */
    let lastObserved = '';

    async function otpShownFor(amount: string): Promise<boolean> {
        lastObserved = '';
        session ??= await loginToTopup(adminContext.browser()!, ACCOUNT);
        await gotoTopupScreen(session);
        await session.topup.selectPaymentMethod('mada');
        await session.topup.enterAmount(amount);
        await session.topup.clickProceedButton();
        await session.topup.waitForSummaryToSettle().catch(() => { /* blocked amounts may not show a total */ });
        const summary = await session.topup.summaryNextButton.isVisible().catch(() => false);
        if (!summary) {
            lastObserved = `amount ${amount}: stopped before Summary Next (no OTP possible)`;
            test.info().annotations.push({ type: 'observed', description: lastObserved });
            return false;
        }
        // Record what the app answered on Next, so "no OTP" can be told apart from a rejected initiation.
        const initiation = session.page
            .waitForResponse(r => r.request().method() === 'POST' && /\/api\/v1\/payments$/.test(r.url()), { timeout: 20000 })
            .catch(() => null);
        const shown = await clickSummaryNextAndDetectOtp(session.topup, session.otp);
        const res = await initiation;
        const body = res ? (await res.text().catch(() => '')).slice(0, 300) : 'no /payments response seen';
        lastObserved = `amount ${amount}: otpShown=${shown}, POST /payments → ${res ? res.status() : '-'} ${body}`;
        test.info().annotations.push({ type: 'observed', description: lastObserved });
        // A server error means the payment was never initiated, so "no OTP" says nothing about the range rule —
        // fail as inconclusive instead of letting an expected-false amount pass on a 500.
        if (res && res.status() >= 500) {
            throw new Error(`Inconclusive: payment initiation failed with HTTP ${res.status()}, so the OTP rule was not exercised. ${lastObserved} ` +
                'Use another account (TOPUP_OTP_CFG_ACCOUNT="company:mobile", Merchant wallet) or check the 5.00 commission vs a 2.00 amount.');
        }
        return shown;
    }

    test('TOC-01: the Transaction OTP tab lists the transactions with minimum amount, max attempts and status', async () => {
        const rows = await admin.readTransactionOtpRows();
        expect(rows.length, 'the tab lists at least one transaction OTP record').toBeGreaterThan(0);
        for (const r of rows) {
            expect(r.minimumAmount, `${r.transaction}: minimum amount is numeric`).toMatch(/\d/);
            expect(r.maxAttempts, `${r.transaction}: max attempts is numeric`).toMatch(/^\d+$/);
        }
    });

    test('TOC-02: a Top-up record with range 2–10 can be created', async () => {
        test.skip(topupRecordPreexisted, 'a Top-up record already exists; creating another is covered by TOC-D2');
        const r = await admin.createTransactionOtpConfiguration(form('2', '10'));
        createdTopupRecord = r.accepted;
        expect(r.accepted, `creation with min 2 / max 10 accepted (${r.error})`).toBe(true);
        const row = (await admin.readTransactionOtpRows()).find(x => TOPUP_ROW.test(x.transaction));
        expect(row?.minimumAmount, 'the new Top-up record shows minimum amount 2').toBe('2');
    });

    test('TOC-00: control — a plain top-up of 30 initiates on this account (no HTTP 5xx)', async () => {
        // Separates "dev initiation is broken for this account" from "the OTP range rule". If this fails, the
        // range cases below are skipped (serial suite): pick another account with TOPUP_OTP_CFG_ACCOUNT="company:mobile".
        await otpShownFor('30'); // throws "Inconclusive" on a 5xx; the OTP outcome at 30 is not asserted here
        test.info().annotations.push({ type: 'observed', description: lastObserved });
    });

    for (const [amount, expected] of [['1', false], ['2', true], ['10', true], ['11', false]] as const) {
        test(`TOC-03: top-up of ${amount} → OTP ${expected ? 'is shown' : 'is NOT shown'} (range 2–10)`, async () => {
            const shown = await otpShownFor(amount);
            expect(shown, lastObserved).toBe(expected);
        });
    }

    test('TOC-D1: a maximum amount above 10 can be saved (KNOWN DEFECT: refused)', async () => {
        test.fail(true, 'Known defect: the system refuses a maximum amount above 10.');
        test.skip(!createdTopupRecord && topupRecordPreexisted, 'cannot create a record for Top-up here — see TOC-D2');
        const r = await admin.createTransactionOtpConfiguration(form('2', '50'));
        test.info().annotations.push({ type: 'observed', description: `max 50: accepted=${r.accepted} ${r.error}` });
        expect(r.accepted, `max amount 50 accepted (${r.error})`).toBe(true);
    });

    test('TOC-D2: a second Transaction OTP record can be created (KNOWN DEFECT: creation works only once)', async () => {
        test.fail(true, 'Known defect: after the first record is created no further record can be created.');
        const before = (await admin.readTransactionOtpRows()).length;
        const r = await admin.createTransactionOtpConfiguration(form('2', '10'));
        test.info().annotations.push({ type: 'observed', description: `second create: accepted=${r.accepted} ${r.error}` });
        expect(r.accepted, `second creation accepted (${r.error})`).toBe(true);
        expect((await admin.readTransactionOtpRows()).length, 'a new row appeared').toBeGreaterThan(before);
    });
});
