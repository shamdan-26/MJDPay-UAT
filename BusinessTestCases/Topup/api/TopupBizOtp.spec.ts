import { test, expect } from '@playwright/test';
import { DEV_PAYMENTS_DOWN, raiseHeadroom, AMT, why, startSession, initiate, verifyOtp, paymentIdOf, paymentMethodId, balances, expectRejected, WRONG_OTP, type BizSession } from '../helpers/TopupBizApi.ts';

// Business rules: OTP gate before the card payment. TUB-49..51 (group G).
// Dev uses a fixed OTP (918512), so "OTP is tied to this user and this top-up" (TUB-53) cannot be proven here and is
// listed as not automated. These cases skip when OTP is switched off for top-up (admin config, operationCode 102).

test.describe('Topup business – OTP', { tag: ['@topup', '@business', '@api'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'api' }] }, () => {
    test.skip(DEV_PAYMENTS_DOWN, 'DEV OUTAGE: POST /api/v1/payments returns HTTP 500 for every request on dev (2026-10-20), so payment-initiation cases cannot be judged. Set TOPUP_DEV_PAYMENTS_DOWN=0 once dev is fixed.');
    // One worker per file: a second login as the same account invalidates the first session (401 SESSION_INVALID).
    test.describe.configure({ mode: 'serial' });
    let s: BizSession;
    let restoreLimits: (() => Promise<void>) | undefined;
    let methodId: number;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180_000); // hook timeout is separate from the describe/test timeout: UI login + admin work
        restoreLimits = await raiseHeadroom(browser);
        s = await startSession(browser);
        methodId = await paymentMethodId(s);
    });

    test.afterAll(async () => {
        test.setTimeout(120_000);
        await s?.dispose();
        await restoreLimits?.();
    });

    async function otpPayment() {
        const p = await initiate(s, AMT, { methodId });
        expect(p.ok, `initiate: ${why(p)}`).toBe(true);
        test.skip(!p.body?.isOtpRequired, 'OTP is off for top-up on this environment');
        return p;
    }

    test('TUB-49: with OTP required, nothing is posted before the OTP is verified', { annotation: [{ type: 'testcase', description: 'TUB-49: initiated payment is PENDING and the balance is unchanged until verify' }] }, async () => {
        const before = await balances(s);
        const p = await otpPayment();
        expect(p.body.status).toBe('PENDING');
        expect((await balances(s)).available).toBe(before.available);
    });

    test('TUB-50: a wrong OTP does not continue and does not post', { annotation: [{ type: 'testcase', description: 'TUB-50: wrong OTP -> rejected, payment not POSTED, balance unchanged' }] }, async () => {
        const p = await otpPayment();
        const before = await balances(s);
        const v = await verifyOtp(s, paymentIdOf(p.body)!, WRONG_OTP, {}, methodId);
        expectRejected(v, 'wrong OTP');
        expect(v.body?.status).not.toBe('POSTED');
        expect((await balances(s)).available).toBe(before.available);
    });

    test('TUB-51: repeated wrong OTPs end the attempt', { annotation: [{ type: 'testcase', description: 'TUB-51: after repeated wrong OTPs even the correct OTP no longer completes this payment' }] }, async () => {
        const p = await otpPayment();
        for (let i = 0; i < 6; i++) expectRejected(await verifyOtp(s, paymentIdOf(p.body)!, WRONG_OTP, {}, methodId), `wrong OTP #${i + 1}`);
        const correct = await verifyOtp(s, paymentIdOf(p.body)!, undefined, {}, methodId);
        // Attempt limit on dev is "about 3-4" (docs/manual-test-cases Topup-Admin-Config-Matrix TUA-A11): locked, not exact.
        expectRejected(correct, 'correct OTP after the attempt limit');
    });
});
