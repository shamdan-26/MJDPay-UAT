import { test, expect } from '../../../fixtures';
import { assertToast } from '../../../toastMessages';
import { LOGIN_URL, VALID_PASSWORD, CREATED_ACCOUNTS } from '../../LoginHelper';
import { signIn } from '../../helpers/loginApi';

// Account-state coverage that depends on provisioned accounts. Every env var below is optional: the test skips
// with a clear message when its account is not provided.
//   PENDING_COMPANY / PENDING_MOBILE        business registered but not yet approved
//   REJECTED_COMPANY / REJECTED_MOBILE      business whose registration was rejected
//   EXPIRED_PW_COMPANY / EXPIRED_PW_MOBILE / EXPIRED_PW_PASSWORD   account that must change its password
const env = (name: string) => process.env[name] ?? '';

const STATES = [
    { label: 'pending approval', company: env('PENDING_COMPANY'), mobile: env('PENDING_MOBILE'), vars: 'PENDING_COMPANY / PENDING_MOBILE', password: VALID_PASSWORD },
    { label: 'rejected registration', company: env('REJECTED_COMPANY'), mobile: env('REJECTED_MOBILE'), vars: 'REJECTED_COMPANY / REJECTED_MOBILE', password: VALID_PASSWORD },
    { label: 'expired password', company: env('EXPIRED_PW_COMPANY'), mobile: env('EXPIRED_PW_MOBILE'), vars: 'EXPIRED_PW_COMPANY / EXPIRED_PW_MOBILE', password: env('EXPIRED_PW_PASSWORD') || VALID_PASSWORD },
];

test.describe('Login — Account States', { tag: ['@login', '@functional', '@credentials'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    for (const s of STATES) {
        test(`should not reach the OTP step for an account with ${s.label}`, async ({ page, loginPage, otp }) => {
            test.skip(!s.company || !s.mobile, `Set ${s.vars} to run this case`);
            await loginPage.goto(LOGIN_URL);
            await loginPage.fillAndSubmit(s.company, s.mobile, s.password);
            await assertToast(page);
            await expect(otp.heading).not.toBeVisible();
            await expect(page).toHaveURL(LOGIN_URL);
        });

        test(`should return a non-200 sign-in response for an account with ${s.label}`, async ({ request }) => {
            test.skip(!s.company || !s.mobile, `Set ${s.vars} to run this case`);
            const res = await signIn(request, s.company, s.mobile, s.password);
            expect(res.status()).not.toBe(200);
            expect(res.status()).toBeLessThan(500);
        });
    }
});

// Registration-created accounts (data/testAccounts.json → createdAccounts) can sign in.
// Their passwords are NOT the shared default: each registration emails its own login details. Signing in with a wrong
// password counts towards the 3-attempt lockout, and several of these accounts are used by other modules, so this
// loop is opt-in: set CREATED_ACCOUNTS_PASSWORD to a password you know they all share (e.g. after an admin reset).
const CREATED_PASSWORD = process.env['CREATED_ACCOUNTS_PASSWORD'] ?? '';

test.describe('Login — Registration-created accounts can sign in', { tag: ['@login', '@api', '@integration'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'integration' }] }, () => {
    test.skip(!CREATED_PASSWORD, 'Set CREATED_ACCOUNTS_PASSWORD (a password shared by all createdAccounts) — wrong guesses would lock accounts other modules use');

    for (const account of CREATED_ACCOUNTS) {
        test(`should sign in ${account.company} / ${account.mobile} through the gateway`, async ({ request }) => {
            const res = await signIn(request, account.company, account.mobile, CREATED_PASSWORD);
            expect(res.status(), await res.text()).toBe(200);
            const body = await res.json();
            expect(body.accessToken?.tenantNumber).toBe(account.company);
        });
    }
});
