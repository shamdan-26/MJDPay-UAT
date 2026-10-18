// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/security/.
//
// Property-based fuzzing of the registration API: for random hostile input the gateway must never answer 5xx, and
// clearly invalid values must never be accepted (2xx).
//
// Prerequisites : npm i -D fast-check
// Assumptions   : endpoints/headers as in helpers/registrationApi.ts; error status for invalid input is 4xx.
// Safety        : dev only. Capped at NUM_RUNS requests per property; get backend sign-off before raising it.
//                 Each OTP request sends a real SMS/email on environments where delivery works.
import { test, expect } from '@playwright/test';
import { postRegistration, toApiMobile } from '../../helpers/registrationApi';
import { generateFreshKSAMobile } from '../../helpers/RegistrationHelper';

const NUM_RUNS = 25;

// fast-check is loaded dynamically so the draft compiles before the dependency is installed.
async function fc() {
    const specifier = 'fast-check';
    return (await import(specifier)).default ?? (await import(specifier));
}

const HOSTILE = ["' OR '1'='1", '<script>alert(1)</script>', '../../etc/passwd', '${7*7}', '%00', '‮', 'A'.repeat(5000), '0'.repeat(64), '-1', '1e999', 'null', '[]', '{}'];

test.describe('Registration API – fuzzing (DRAFT)', { tag: ['@registration', '@security', '@api', '@fuzz'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'security' }] }, () => {
    test.setTimeout(300_000);

    test('mobile/otp should never answer 5xx and should reject non-numeric mobiles', async ({ request }) => {
        const f = await fc();
        await f.assert(
            f.asyncProperty(f.oneof(f.string({ maxLength: 40 }), f.constantFrom(...HOSTILE)), async (value: string) => {
                const res = await postRegistration(request, '/register/mobile/otp', { mobileNumber: value });
                if (res.status() >= 500) return false;
                // a value with any non-digit (besides a leading +) must not be accepted
                if (/[^0-9+]/.test(value) || !/^\+?966?5\d{8}$/.test(value)) return res.status() >= 400;
                return true;
            }),
            { numRuns: NUM_RUNS },
        );
    });

    test('verify/otp should never answer 5xx and never mint a session for random codes', async ({ request }) => {
        const f = await fc();
        const mobileNumber = toApiMobile(generateFreshKSAMobile());
        const sent = await postRegistration(request, '/register/mobile/otp', { mobileNumber });
        test.skip(sent.status() !== 200, 'Could not request an OTP for the fuzz mobile');
        const { requestId } = await sent.json();
        await f.assert(
            f.asyncProperty(f.oneof(f.string({ maxLength: 12 }), f.constantFrom(...HOSTILE)), async (otp: string) => {
                const res = await postRegistration(request, '/register/verify/otp', { mobileNumber, requestId, otp });
                const body = await res.json().catch(() => ({}));
                return res.status() < 500 && !body?.sessionToken;
            }),
            { numRuns: NUM_RUNS },
        );
    });

    test('profile-registration-type should never answer 5xx for hostile field values (session required)', async ({ request }) => {
        // Needs a registration session; skipped until an OTP source works.
        const { openRegistrationSession } = await import('../../helpers/registrationApi');
        const token = await openRegistrationSession(request, generateFreshKSAMobile());
        test.skip(!token, 'No registration session (OTP unreadable)');
        const f = await fc();
        await f.assert(
            f.asyncProperty(
                f.record({
                    profileType: f.oneof(f.constantFrom('MERCHANT', 'BILLER', 'FREELANCER', 'CUSTOMER'), f.string({ maxLength: 20 })),
                    unifiedNumber: f.oneof(f.string({ maxLength: 20 }), f.constantFrom(...HOSTILE)),
                    nationalId: f.oneof(f.string({ maxLength: 20 }), f.constantFrom(...HOSTILE)),
                    email: f.oneof(f.emailAddress(), f.string({ maxLength: 60 }), f.constantFrom(...HOSTILE)),
                }),
                async (payload: Record<string, string>) => {
                    const res = await postRegistration(request, '/register/profile-registration-type', payload, token!);
                    return res.status() < 500;
                },
            ),
            { numRuns: NUM_RUNS },
        );
        expect(true).toBe(true);
    });
});
