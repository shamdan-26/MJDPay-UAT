import { test, expect } from '../../fixtures';
import {
    BLOCKED_COMPANY,
    BLOCKED_MOBILE,
    VALID_COMPANY,
    VALID_MOBILE,
    submitStep1AndGetResult,
} from '../ForgotPasswordHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Account states on step 1 — real backend. Checks how unknown and blocked identities are treated:
// they must not advance, must not reveal which part was wrong, and must not leak internals.
// ─────────────────────────────────────────────────────────────────────────────

const tags = { tag: ['@forgotpassword', '@functional', '@account-states'], annotation: [{ type: 'feature', description: 'ForgotPassword' }, { type: 'layer', description: 'functional' }] };

const UNKNOWN_COMPANY = 'Z9999';
const UNKNOWN_MOBILE  = '511111111';
const TECH_LEAK = /stack|exception|sql|database|null pointer|traceback|internal server error/i;

test.describe('Forgot Password — Account States', tags, () => {
    test.describe.configure({ mode: 'serial' });

    test('unknown company and unknown mobile get the same status and message (no enumeration)', { annotation: [{ type: 'testcase', description: 'FP-85: Unknown company and unknown mobile are indistinguishable' }] }, async ({ page }) => {
        const wrongCompany = await submitStep1AndGetResult(page, UNKNOWN_COMPANY, VALID_MOBILE);
        const wrongMobile  = await submitStep1AndGetResult(page, VALID_COMPANY, UNKNOWN_MOBILE);

        expect(wrongCompany.status).not.toBeNull();
        expect(wrongCompany.status).toBe(wrongMobile.status);
        expect(wrongCompany.body).toBe(wrongMobile.body);
    });

    test('blocked account does not advance to step 2 or open the OTP dialog', { annotation: [{ type: 'testcase', description: 'FP-86: Blocked account cannot start a reset' }] }, async ({ page, forgotPassword }) => {
        const result = await submitStep1AndGetResult(page, BLOCKED_COMPANY, BLOCKED_MOBILE);

        await test.info().attach('blocked-step1-response', { body: JSON.stringify({ status: result.status, body: result.body }, null, 2), contentType: 'application/json' });
        expect(result.status).not.toBe(200);
        await expect(forgotPassword.newPasswordInput).toBeHidden();
        await expect(page.locator('div.my-modal-container')).toBeHidden();
    });

    test('rejected identities never expose technical details in the response or page', { annotation: [{ type: 'testcase', description: 'FP-87: Rejected identities do not leak internals' }] }, async ({ page }) => {
        for (const [company, mobile] of [[UNKNOWN_COMPANY, UNKNOWN_MOBILE], [BLOCKED_COMPANY, BLOCKED_MOBILE]]) {
            const result = await submitStep1AndGetResult(page, company, mobile);
            expect(result.status, `status for ${company}`).toBeLessThan(500);
            expect(result.body).not.toMatch(TECH_LEAK);
            expect(result.pageText).not.toMatch(TECH_LEAK);
        }
    });
});
