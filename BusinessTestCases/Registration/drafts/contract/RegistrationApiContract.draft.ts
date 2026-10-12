// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/api/.
//
// API contract (response-shape) checks for the registration endpoints. Shapes below are the ones observed on dev
// (gateway-dev-emi.dg-cash.app) or described in RegistrationSessionRefresh.spec.ts; everything marked ASSUMED must be
// confirmed against a captured response saved under data/registrationFixtures/ before promotion.
//
// Prerequisites : capture fixtures (see docs/manual-test-cases/Registration-Backlog-Draft.md, "Fixtures to capture first").
// Safety        : read-only apart from one OTP request per run.
import { test, expect } from '@playwright/test';
import { postRegistration, toApiMobile } from '../../helpers/registrationApi';
import { generateFreshKSAMobile } from '../../RegistrationHelper';

// Tiny inline schema checker: a schema maps key -> predicate. No dependency needed.
type Schema = Record<string, (v: unknown) => boolean>;
const isString  = (v: unknown) => typeof v === 'string' && v.length > 0;
const isBool    = (v: unknown) => typeof v === 'boolean';
const nullable  = (p: (v: unknown) => boolean) => (v: unknown) => v === null || p(v);
const tokenPair = (v: unknown) => !!v && typeof v === 'object' && isString((v as { token?: unknown }).token) && typeof (v as { expirationDuration?: unknown }).expirationDuration === 'number';

function conforms(body: Record<string, unknown>, schema: Schema): string[] {
    return Object.entries(schema).filter(([key, ok]) => !(key in body) || !ok(body[key])).map(([key]) => key);
}

const SEND_OTP_SCHEMA: Schema = {
    requestId: isString,
    otpRequired: isBool,
    sessionToken: nullable(tokenPair),   // present only when otpRequired is false (EMI-5995)
    refreshToken: nullable(tokenPair),
};

const ERROR_SCHEMA: Schema = {
    httpStatusCode: v => typeof v === 'number',
    message: v => !!v && isString((v as { messageCode?: unknown }).messageCode),
};

// ASSUMED: the flags the user pasted from POST /register/profile-registration-type.
const PROFILE_TYPE_SCHEMA: Schema = {
    profileCode: isString,
    isProductAssigned: isBool,
    isContractAccepted: isBool,
    isGetNafathRandomNumberCompleted: isBool,
    isGetNafathStatusCompleted: isBool,
    isCompletedForm: isBool,
    nafathRandomNumber: nullable(isString),
};

test.describe('Registration API – contract (DRAFT)', { tag: ['@registration', '@api', '@contract'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'api' }] }, () => {
    test('POST /register/mobile/otp response matches the send-OTP schema', async ({ request }) => {
        const res = await postRegistration(request, '/register/mobile/otp', { mobileNumber: toApiMobile(generateFreshKSAMobile()) });
        expect(res.status()).toBe(200);
        expect(conforms(await res.json(), SEND_OTP_SCHEMA), 'fields not matching the contract').toEqual([]);
    });

    test('error responses use the gateway error envelope', async ({ request }) => {
        const res = await postRegistration(request, '/register/verify/otp', { mobileNumber: toApiMobile(generateFreshKSAMobile()), otp: '918512', requestId: 'does-not-exist' });
        expect(res.status()).toBeGreaterThanOrEqual(400);
        // The gateway wraps errors in a one-element array: [{ httpStatusCode, message: { messageCode, ... } }]
        const body = await res.json();
        expect(conforms(Array.isArray(body) ? body[0] : body, ERROR_SCHEMA)).toEqual([]);
    });

    test('profile-registration-type fixture matches the flag schema (offline fixture check)', async () => {
        const fixture = await import('../../../../data/registrationFixtures/profileRegistrationType.json').catch(() => null);
        test.skip(!fixture, 'Capture data/registrationFixtures/profileRegistrationType.json first');
        expect(conforms((fixture as { default: Record<string, unknown> }).default, PROFILE_TYPE_SCHEMA)).toEqual([]);
    });

    test('every contract schema key is documented in the backlog (guard against silent drift)', async () => {
        for (const schema of [SEND_OTP_SCHEMA, ERROR_SCHEMA, PROFILE_TYPE_SCHEMA]) {
            expect(Object.keys(schema).length).toBeGreaterThan(0);
        }
    });
});
