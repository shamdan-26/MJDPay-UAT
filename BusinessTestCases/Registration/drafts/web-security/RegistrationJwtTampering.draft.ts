// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/security/.
//
// Token tampering against the registration session (sessionToken) and refresh (refreshToken, EMI-5995) mechanisms.
// Extends the "forged token" cases in security/RegistrationApiSecurity.spec.ts with specific JWT attack shapes.
// Every tampered token must be rejected with a 4xx — never 2xx, never 5xx.
//
// Prerequisites : a real session token for the claim-mutation cases (needs a working OTP); the structural cases
//                 (alg=none, empty signature, garbage) need no session and run today.
// Assumptions   : the session token is a JWT (three base64url parts) — the dev token shape is unverified;
//                 the refresh endpoint is POST /register/session/refresh with the refresh token in a `refreshToken` header.
import { test, expect } from '@playwright/test';
import { postRegistration, openRegistrationSession, registrationHeaders, REGISTRATION_API } from '../../helpers/registrationApi';
import { generateFreshKSAMobile } from '../../RegistrationHelper';

const b64url = (o: unknown) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const parts = (jwt: string) => jwt.split('.') as [string, string, string];
const decode = (seg: string) => JSON.parse(Buffer.from(seg, 'base64url').toString('utf8')) as Record<string, unknown>;

const GARBAGE_REFRESH = ['not', 'a', 'real', 'refresh'].join('-');
const PROTECTED_PATH = '/register/profile-registration-type';
const BODY = { profileType: 'MERCHANT', unifiedNumber: '0000000000', nationalId: '0000000000', email: 'jwt-probe@example.com' };

async function expectRejected(request: import('@playwright/test').APIRequestContext, token: string, label: string) {
    const res = await postRegistration(request, PROTECTED_PATH, BODY, token);
    expect(res.status(), `${label}: ${await res.text()}`).toBeGreaterThanOrEqual(400);
    expect(res.status(), `${label} caused a server error`).toBeLessThan(500);
}

test.describe('Registration – JWT tampering (DRAFT)', { tag: ['@registration', '@security', '@api'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'security' }] }, () => {
    test.describe('structural attacks (no session needed)', () => {
        const header = b64url({ alg: 'none', typ: 'JWT' });
        const payload = b64url({ sub: 'attacker', exp: Math.floor(Date.now() / 1000) + 3600 });

        test('alg=none token is rejected', async ({ request }) => { await expectRejected(request, `${header}.${payload}.`, 'alg=none'); });
        test('empty signature is rejected', async ({ request }) => { await expectRejected(request, `${b64url({ alg: 'HS256', typ: 'JWT' })}.${payload}.`, 'empty signature'); });
        test('random signature is rejected', async ({ request }) => { await expectRejected(request, `${b64url({ alg: 'HS256', typ: 'JWT' })}.${payload}.${b64url('x'.repeat(32))}`, 'random signature'); });
        test('token with an expired exp claim is rejected', async ({ request }) => {
            await expectRejected(request, `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: 'a', exp: 1 })}.${b64url('sig')}`, 'expired exp');
        });
        for (const [label, token] of [['two segments', 'aaa.bbb'], ['one segment', 'aaaa'], ['whitespace', '   '], ['very long', 'a.'.repeat(5000)], ['SQL in token', "' OR '1'='1.x.y"]] as const) {
            test(`malformed token (${label}) is rejected without a server error`, async ({ request }) => { await expectRejected(request, token, label); });
        }
        test('Authorization with a non-Bearer scheme is rejected', async ({ request }) => {
            const res = await request.post(`${REGISTRATION_API}${PROTECTED_PATH}`, { data: BODY, headers: { ...registrationHeaders(), Authorization: 'Basic YWRtaW46YWRtaW4=' } });
            expect(res.status()).toBeGreaterThanOrEqual(400);
            expect(res.status()).toBeLessThan(500);
        });
    });

    test.describe('claim mutation of a real session (needs OTP)', () => {
        let token: string | null = null;
        test.beforeAll(async ({ request }) => { token = await openRegistrationSession(request, generateFreshKSAMobile()); });

        test('changing the subject claim invalidates the signature', async ({ request }) => {
            test.skip(!token, 'No registration session (OTP unreadable)');
            const [h, p, s] = parts(token!);
            await expectRejected(request, `${h}.${b64url({ ...decode(p), sub: 'someone-else' })}.${s}`, 'altered sub');
        });
        test('extending the exp claim invalidates the signature', async ({ request }) => {
            test.skip(!token, 'No registration session (OTP unreadable)');
            const [h, p, s] = parts(token!);
            await expectRejected(request, `${h}.${b64url({ ...decode(p), exp: 4102444800 })}.${s}`, 'extended exp');
        });
        test('switching alg to none on a real token is rejected', async ({ request }) => {
            test.skip(!token, 'No registration session (OTP unreadable)');
            const [, p] = parts(token!);
            await expectRejected(request, `${b64url({ alg: 'none', typ: 'JWT' })}.${p}.`, 'real payload, alg none');
        });
        test('the refresh token cannot be used as a session token', async ({ request }) => {
            test.skip(!token, 'No registration session (OTP unreadable)');
            // ASSUMED: the verify response also returns a refreshToken; reuse is blocked by design (EMI-5995 isolation).
            const res = await request.post(`${REGISTRATION_API}/register/session/refresh`, { headers: registrationHeaders(token!, { refreshToken: token! }), data: {} });
            expect(res.status()).toBeGreaterThanOrEqual(400);
            expect(res.status()).toBeLessThan(500);
        });
        test('a refresh with a garbage refresh token is rejected', async ({ request }) => {
            test.skip(!token, 'No registration session (OTP unreadable)');
            const res = await request.post(`${REGISTRATION_API}/register/session/refresh`, { headers: registrationHeaders(token!, { refreshToken: GARBAGE_REFRESH }), data: {} });
            expect(res.status()).toBeGreaterThanOrEqual(400);
            expect(res.status()).toBeLessThan(500);
        });
    });
});
