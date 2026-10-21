import { test, expect } from '@playwright/test';
import { loginToTopup, gotoTopupScreen, reachOtpScreen, findTopupCase, TOPUP_UI_ACCOUNT, type TopupSession } from '../helpers/TopupHelper.ts';
import { readBalanceBefore, watchInitiation } from '../ui/TopupBizUiHelper';

// Functional business rule about the transaction OTP: TUB-50 (a wrong code does not continue and does not charge).
// The wrong code is NOT 918512 or all zeros: dev accepts its documented bypass codes at this step too (see
// functional/TopupNegative.spec.ts), so 194857 is used. Only the effect is asserted, never the error wording (AS11):
// the gateway popup must not open, the OTP step stays, and the balance does not move.
// One real initiation (the OTP step comes after POST /api/v1/payments). One account = one session: --workers=1.

test.describe('Topup business – functional – OTP', { tag: ['@topup', '@functional', '@business'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180000);

    let session: TopupSession;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180000);
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
    });

    test.afterAll(async () => {
        await session?.page.close().catch(() => { /* already closed */ });
    });

    test.afterEach(async () => {
        for (const stray of session.page.context().pages()) {
            if (stray !== session.page) await stray.close().catch(() => { /* already closed */ });
        }
        session.topup.resetActivePage();
    });

    test('TUB-50: a wrong OTP does not continue and does not charge', { annotation: [{ type: 'testcase', description: 'TUB-50: a wrong code -> rejected, no gateway popup, the user stays on the OTP step, the balance is unchanged' }] }, async () => {
        const { page, otp } = session;
        await gotoTopupScreen(session);
        const before = await readBalanceBefore(session);
        const initiation = watchInitiation(page);
        try {
            await reachOtpScreen(session, 'visa', findTopupCase('VISA'));
            await otp.fillAndVerify('194857');
            const popup = await page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
            if (popup) await popup.close(); // must not happen; do not leak it into the next test
            expect(popup, 'a wrong code must not open the gateway popup').toBeNull();
            await expect(otp.inputs.first(), 'the user stays on the OTP step').toBeVisible();
        } finally {
            initiation.stop();
        }
        test.info().annotations.push({ type: 'observed', description: `initiations seen: ${initiation.keys.length}` });
        await gotoTopupScreen(session);
        expect(await readBalanceBefore(session), 'nothing was charged or credited').toBe(before);
    });
});
