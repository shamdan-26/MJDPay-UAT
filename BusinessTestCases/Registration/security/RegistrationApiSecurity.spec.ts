import { test, expect } from '@playwright/test';
import { nextResidentAsset, generateFreshKSAMobile } from '../RegistrationHelper';
import { REGISTRATION_API, registrationHeaders, postRegistration, toApiMobile, openRegistrationSession } from '../helpers/registrationApi';

// ─────────────────────────────────────────────────────────────────────────────
// Registration API security — authentication, input validation, OTP abuse and
// mass-assignment against the gateway directly (no browser).
//
// Observed on dev while writing this: the gateway answers 400 MISSING_REQUIRED_HEADER
// when the Authorization header is absent, 401 SESSION_INVALID for a bad token,
// and 404 PROFILE_REGISTRATION_REQUEST_NOT_FOUND for an OTP verify with no request.
// The assertions are therefore "never a 2xx, never a 5xx" rather than one exact
// status, except where the contract is unambiguous.
// ─────────────────────────────────────────────────────────────────────────────

const PROTECTED: { method: 'POST' | 'GET'; path: string; body?: unknown }[] = [
    { method: 'POST', path: '/register/profile-registration-type', body: {} },
    { method: 'POST', path: '/register', body: {} },
    { method: 'POST', path: '/register/products', body: {} },
    { method: 'POST', path: '/register/contract/accept', body: {} },
    { method: 'POST', path: '/register/uri/status', body: {} },
    { method: 'GET',  path: '/contracts/preview?profileCode=BIL-0' },
    { method: 'GET',  path: '/contracts/generate-file?profileCode=BIL-0' },
];

test.describe('Registration API – Authentication & session', { tag: ['@registration', '@security', '@api'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'security' }] }, () => {
    for (const ep of PROTECTED) {
        test(`${ep.method} ${ep.path.split('?')[0]} should reject a request with no session token`, async ({ request }) => {
            const res = ep.method === 'POST'
                ? await postRegistration(request, ep.path, ep.body)
                : await request.get(`${REGISTRATION_API}${ep.path}`, { headers: registrationHeaders() });
            expect(res.status(), await res.text()).toBeGreaterThanOrEqual(400);
            expect(res.status()).toBeLessThan(500);
        });

        test(`${ep.method} ${ep.path.split('?')[0]} should reject a forged session token`, async ({ request }) => {
            const forged = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJhdHRhY2tlciJ9.';
            const res = ep.method === 'POST'
                ? await postRegistration(request, ep.path, ep.body, forged)
                : await request.get(`${REGISTRATION_API}${ep.path}`, { headers: registrationHeaders(forged) });
            expect(res.status(), await res.text()).toBeGreaterThanOrEqual(400);
            expect(res.status()).toBeLessThan(500);
        });
    }
});

test.describe('Registration API – Mobile / OTP input validation', { tag: ['@registration', '@security', '@api'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'security' }] }, () => {
    const BAD_MOBILES: [string, string][] = [
        ['letters', 'abc'],
        ['SQL injection', "+966500000000' OR 1=1--"],
        ['script tag', '<script>alert(1)</script>'],
        ['too short', '+96650'],
        ['too long', '+9665000000001234567'],
        ['wrong country code', '+971500000000'],
        ['not starting with 5', '+966400000000'],
        ['empty', ''],
    ];

    for (const [label, mobileNumber] of BAD_MOBILES) {
        test(`POST /register/mobile/otp should not issue an OTP for an invalid mobile (${label})`, async ({ request }) => {
            const res = await postRegistration(request, '/register/mobile/otp', { mobileNumber });
            const body = await res.json().catch(() => ({}));
            expect(res.status(), `Server accepted ${JSON.stringify(mobileNumber)} and answered ${JSON.stringify(body)}`).toBeGreaterThanOrEqual(400);
            expect(res.status()).toBeLessThan(500);
        });
    }

    test('POST /register/mobile/otp should reject a missing mobileNumber', async ({ request }) => {
        const res = await postRegistration(request, '/register/mobile/otp', {});
        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
    });

    test('POST /register/verify/otp should reject a non-numeric OTP without a server error', async ({ request }) => {
        const res = await postRegistration(request, '/register/verify/otp', { mobileNumber: toApiMobile(generateFreshKSAMobile()), otp: "' OR '1'='1" });
        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
    });
});

test.describe('Registration API – OTP brute force', { tag: ['@registration', '@security', '@api'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'security' }] }, () => {
    test('repeated wrong OTPs should never yield a session and should end in a lockout', async ({ request }) => {
        test.setTimeout(120_000);
        const mobileNumber = toApiMobile(generateFreshKSAMobile());
        const sent = await postRegistration(request, '/register/mobile/otp', { mobileNumber });
        test.skip(sent.status() !== 200, `Could not request an OTP for ${mobileNumber} (status ${sent.status()})`);
        const { requestId } = await sent.json();

        const statuses: number[] = [];
        let sessionIssued = false;
        for (let i = 0; i < 12; i++) {
            const res = await postRegistration(request, '/register/verify/otp', { mobileNumber, requestId, otp: String(100000 + i * 7919).slice(0, 6) });
            statuses.push(res.status());
            const body = await res.json().catch(() => ({}));
            if (res.ok() || body?.sessionToken) sessionIssued = true;
        }
        test.info().annotations.push({ type: 'wrong-otp-statuses', description: statuses.join(',') });

        expect(sessionIssued, 'A wrong OTP produced a session').toBe(false);
        expect(statuses.some(s => s >= 500), `Server error during brute force: ${statuses}`).toBe(false);
        // A lockout shows up as a status/message that differs from the plain "wrong OTP" response
        // seen on the first attempt (e.g. 423/429 or a different messageCode).
        expect(new Set(statuses).size > 1 || statuses.every(s => s === 429 || s === 423),
            `No lockout after 12 wrong OTPs — every attempt answered ${statuses[0]}`).toBe(true);
    });

    test('OTP requests for one mobile should be rate-limited', async ({ request }) => {
        test.setTimeout(120_000);
        const mobileNumber = toApiMobile(generateFreshKSAMobile());
        const statuses: number[] = [];
        for (let i = 0; i < 12; i++) {
            const res = await postRegistration(request, '/register/mobile/otp', { mobileNumber });
            statuses.push(res.status());
        }
        test.info().annotations.push({ type: 'otp-request-statuses', description: statuses.join(',') });
        expect(statuses.some(s => s >= 500), `Server error: ${statuses}`).toBe(false);
        expect(statuses.some(s => s === 429 || s === 423 || s === 400), `12 OTP requests in a row were all accepted: ${statuses}`).toBe(true);
    });
});

test.describe('Registration API – Session-bound abuse', { tag: ['@registration', '@security', '@api'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'security' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let token: string | null = null;
    let asset: ReturnType<typeof nextResidentAsset>;

    test.beforeAll(async ({ request }) => {
        asset = nextResidentAsset();
        token = await openRegistrationSession(request, asset.mobile);
    });

    test('profile-registration-type should ignore client-supplied progress flags (mass assignment)', async ({ request }) => {
        test.skip(!token, 'Could not open a registration session (OTP unreadable)');
        const res = await postRegistration(request, '/register/profile-registration-type', {
            profileType: 'MERCHANT',
            unifiedNumber: asset.crn,
            nationalId: asset.nationalId,
            email: 'security-probe@example.com',
            isContractAccepted: true,
            isProductAssigned: true,
            isCompletedForm: true,
            isGetNafathStatusCompleted: true,
        }, token!);
        const body = await res.json().catch(() => ({}));
        test.skip(res.status() >= 400 && /already|registered|exist/i.test(JSON.stringify(body)), 'Identity already registered — nothing to assert');
        expect(res.status(), JSON.stringify(body)).toBeLessThan(500);
        for (const flag of ['isContractAccepted', 'isProductAssigned', 'isCompletedForm', 'isGetNafathStatusCompleted']) {
            expect(body[flag], `${flag} was set from client input: ${JSON.stringify(body)}`).not.toBe(true);
        }
    });

    test('contract/accept should be rejected before Products and Contract steps are completed', async ({ request }) => {
        test.skip(!token, 'Could not open a registration session (OTP unreadable)');
        const res = await postRegistration(request, '/register/contract/accept', { profileCode: 'BIL-000000' }, token!);
        expect(res.ok(), `Contract accepted without completing the journey: ${await res.text()}`).toBe(false);
    });

    test('a session token should not be usable against another applicant\'s contract', async ({ request }) => {
        test.skip(!token, 'Could not open a registration session (OTP unreadable)');
        const res = await request.get(`${REGISTRATION_API}/contracts/preview?profileCode=BIL-000001`, { headers: registrationHeaders(token!) });
        expect(res.ok(), `Foreign profile contract readable: ${(await res.text()).slice(0, 200)}`).toBe(false);
    });

    test('a used OTP should not verify twice', async ({ request }) => {
        test.skip(!token, 'Could not open a registration session (OTP unreadable)');
        // The session above consumed the OTP; replaying any code for the same mobile must not mint a new session.
        const res = await postRegistration(request, '/register/verify/otp', { mobileNumber: toApiMobile(asset.mobile), otp: '000000' });
        const body = await res.json().catch(() => ({}));
        expect(Boolean(body?.sessionToken), `Replayed OTP minted a session: ${JSON.stringify(body)}`).toBe(false);
    });
});

test.describe('Registration API – Concurrency', { tag: ['@registration', '@security', '@api'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'security' }] }, () => {
    test('two applicants submitting the same CRN at the same time should not both be accepted', async ({ request }) => {
        test.setTimeout(180_000);
        const a = nextResidentAsset();
        const b = nextResidentAsset();
        const [tokenA, tokenB] = await Promise.all([openRegistrationSession(request, a.mobile), openRegistrationSession(request, b.mobile)]);
        test.skip(!tokenA || !tokenB, 'Could not open two registration sessions (OTP unreadable)');

        const submit = (token: string, nationalId: string, email: string) =>
            postRegistration(request, '/register/profile-registration-type', { profileType: 'MERCHANT', unifiedNumber: a.crn, nationalId, email }, token);
        const [ra, rb] = await Promise.all([
            submit(tokenA!, a.nationalId, 'race-a@example.com'),
            submit(tokenB!, b.nationalId, 'race-b@example.com'),
        ]);
        const accepted = [ra, rb].filter(r => r.status() === 201).length;
        expect(accepted, `Both concurrent submissions of CRN ${a.crn} were accepted (${ra.status()}, ${rb.status()})`).toBeLessThanOrEqual(1);
        expect([ra, rb].some(r => r.status() >= 500), `Server error under concurrency: ${ra.status()}, ${rb.status()}`).toBe(false);
    });
});
