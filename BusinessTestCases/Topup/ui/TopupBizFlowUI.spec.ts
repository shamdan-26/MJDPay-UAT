import { test, expect } from '@playwright/test';
import { findTopupCase, loginToTopup, gotoTopupScreen, reachOtpScreen, TOPUP_UI_ACCOUNT, type TopupSession } from '../TopupHelper';
import { proceedToSummary, readBalanceBefore, raiseMerchantCountHeadroom, ledgerFor, watchInitiation, SKIP_LEDGER_ASSERTIONS } from './TopupBizUiHelper';
import { closeSqlPool } from '../../../support/sqlServerClient';

// Business rules of the top-up flow, through the browser, with the DB read as evidence only. TUB-48 (cancel at the summary has
// no side effects), TUB-49 (nothing is posted before the OTP is verified), TUB-51 (repeated wrong OTPs end the attempt) and
// TUB-85 (a double submit leaves exactly one ledger entry). Legacy API versions: business/TopupBizFlowIntegrity.spec.ts (48),
// business/TopupBizOtp.spec.ts (49, 51), business/TopupBizIdempotency.spec.ts (85).
//
// Real initiations in this file: TUB-49, 51 and 85 each start one top-up and abandon it at the OTP step (3 per run). Dev counts
// unpaid top-ups against the hourly COUNT cap of 5 for Merchant Cashin (AS4 conflict), so run this file on its own, not right
// after another payment-heavy file. raiseMerchantCountHeadroom raises the Merchant hourly count cap for the run and restores it in afterAll.
// One account, one session: run with --workers=1.

const WRONG_OTP = '194857'; // on purpose not FIXED_OTP
const MAX_WRONG_TRIES = 6;

test.describe('Topup business – UI – flow rules', { tag: ['@topup', '@ui', '@business'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180000);

    let session: TopupSession;
    let restoreLimits: (() => Promise<void>) | undefined;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(300000);
        restoreLimits = await raiseMerchantCountHeadroom(browser); // raises the Merchant hourly count cap; admin login first, never overlapping the app login
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

    test.afterEach(async () => {
        for (const stray of session.page.context().pages()) {
            if (stray !== session.page) await stray.close().catch(() => { /* already closed */ });
        }
        session.topup.resetActivePage();
    });

    test('TUB-48: cancelling at the summary has no side effects', { annotation: [{ type: 'testcase', description: 'TUB-48: cancel at the summary -> no initiation call, balance unchanged' }, { type: 'not-covered', description: 'The ledger cannot be read: no payment exists, so there is no key to look up.' }] }, async () => {
        const { topup, page } = session;
        const data = findTopupCase('VISA');
        const before = await readBalanceBefore(session);
        const watch = watchInitiation(page);
        try {
            await topup.selectPaymentMethod('visa');
            await topup.enterAmount(data.amount);
            await proceedToSummary(session);
            await topup.clickSummaryCancelButton();
            await expect(topup.inputAmount).toBeVisible({ timeout: 15000 });
        } finally {
            watch.stop();
        }
        expect(watch.keys, 'cancelling at the summary must not start a payment').toHaveLength(0);
        await gotoTopupScreen(session);
        expect(await readBalanceBefore(session), 'balance after cancelling at the summary').toBe(before);
    });

    test('TUB-49: with OTP required nothing is posted before the OTP is verified', { annotation: [{ type: 'testcase', description: 'TUB-49: at the OTP step the ledger holds only a PENDING row and the balance is unchanged' }] }, async () => {
        const { page, otp } = session;
        const before = await readBalanceBefore(session);
        const watch = watchInitiation(page);
        try {
            await reachOtpScreen(session, 'visa', findTopupCase('VISA'));
        } finally {
            watch.stop();
        }
        test.skip(!(await otp.inputs.first().isVisible().catch(() => false)), 'The OTP step did not appear: OTP is off for top-ups on this environment');
        expect(watch.keys.length, 'one initiation call for this flow').toBe(1);
        if (!SKIP_LEDGER_ASSERTIONS) {
            const rows = await ledgerFor(watch.keys[0]!, false);
            expect(rows.length, 'a PENDING row exists once the payment is initiated').toBeGreaterThan(0);
            expect(rows.filter(r => r.status !== 'PENDING'), 'nothing is settled before the OTP is verified').toHaveLength(0);
        }
        await otp.cancelButton.click({ timeout: 3000 }).catch(() => { /* best-effort cleanup */ });
        await gotoTopupScreen(session);
        expect(await readBalanceBefore(session), 'balance after abandoning at the OTP step').toBe(before);
    });

    test('TUB-51: repeated wrong OTPs end the attempt', { annotation: [{ type: 'testcase', description: 'TUB-51: after repeated wrong codes the OTP step is left and nothing is posted' }] }, async () => {
        const { page, otp } = session;
        const before = await readBalanceBefore(session);
        let popups = 0;
        const onPage = () => { popups++; };
        page.context().on('page', onPage);
        const watch = watchInitiation(page);
        let tries = 0;
        try {
            await reachOtpScreen(session, 'visa', findTopupCase('VISA'));
            test.skip(!(await otp.inputs.first().isVisible().catch(() => false)), 'The OTP step did not appear: OTP is off for top-ups on this environment');
            while (tries < MAX_WRONG_TRIES && await otp.inputs.first().isVisible().catch(() => false)) {
                await otp.fillAndVerify(WRONG_OTP);
                tries++;
                await page.waitForTimeout(1500);
            }
        } finally {
            watch.stop();
            page.context().off('page', onPage);
        }
        test.info().annotations.push({ type: 'wrong-tries-until-the-step-ended', description: String(tries) });
        expect(await otp.inputs.first().isVisible().catch(() => false), `the OTP step must end after repeated wrong codes (tried ${tries})`).toBe(false);
        expect(popups, 'a wrong code must never open the gateway popup').toBe(0);
        if (watch.keys[0] && !SKIP_LEDGER_ASSERTIONS) {
            const rows = await ledgerFor(watch.keys[0], false);
            expect(rows.filter(r => r.status === 'SUCCESS'), 'nothing is credited').toHaveLength(0);
        }
        await gotoTopupScreen(session);
        expect(await readBalanceBefore(session), 'balance after repeated wrong OTPs').toBe(before);
    });

    test('TUB-85: a double submit leaves exactly one ledger entry', { annotation: [{ type: 'testcase', description: 'TUB-85: two clicks on Next -> one PENDING ledger row for the key, nothing else (success-time posting is covered by the outcome specs)' }] }, async () => {
        const { page, topup, otp } = session;
        const data = findTopupCase('VISA');
        let popups = 0;
        const onPage = () => { popups++; };
        page.context().on('page', onPage);
        const watch = watchInitiation(page);
        try {
            await topup.selectPaymentMethod('visa');
            await topup.enterAmount(data.amount);
            await proceedToSummary(session);
            await expect(topup.summaryNextButton).toBeEnabled({ timeout: 15000 });
            // Two clicks on the SAME element in one task = a true double submit (dblclick() would hit the next screen).
            await topup.summaryNextButton.evaluate((el: HTMLElement) => { el.click(); el.click(); });
            await expect.poll(async () => popups > 0 || await otp.inputs.first().isVisible().catch(() => false), { timeout: 20000, message: 'neither the OTP screen nor the gateway popup appeared after Next' }).toBe(true);
            await page.waitForTimeout(3000);
        } finally {
            watch.stop();
            page.context().off('page', onPage);
        }
        expect(watch.keys, 'one initiation call for one user action').toHaveLength(1);
        const rows = await ledgerFor(watch.keys[0]!, false);
        expect(rows.filter(r => r.status === 'PENDING'), 'exactly one PENDING ledger row for the key').toHaveLength(1);
        expect(rows.filter(r => r.status !== 'PENDING'), 'no terminal row for an unfinished top-up').toHaveLength(0);
        await otp.cancelButton.click({ timeout: 3000 }).catch(() => { /* best-effort cleanup */ });
    });
});
