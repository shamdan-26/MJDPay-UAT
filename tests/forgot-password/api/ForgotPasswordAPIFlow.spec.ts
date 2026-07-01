import { test, expect } from '@playwright/test';
import { VALID_COMPANY, VALID_MOBILE } from '../../pageObjects/ForgotPasswordHelper';

declare const process: { env: Record<string, string | undefined> };

const API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev.majdpay.com';
const MOBILE   = `+966${VALID_MOBILE}`;

// ─────────────────────────────────────────────────────────────────────────────
// Forgot Password – API Flow
//
// Covers the 2-endpoint chain triggered by the forgot-password form:
//
//  Step 1 – Verify Identity
//   1. POST /auth/passwords/forget           — validates company + mobile
//
//  Step 2 – OTP Configuration (auto-called after API 1 succeeds)
//   2. GET  /otp/otp-settings/q
//            ?operationCode=FORGET_PASSWORD  — fetches OTP config
//
// After both succeed the user is navigated to /business/auth/change-password.
// ─────────────────────────────────────────────────────────────────────────────

// ── Happy Path ────────────────────────────────────────────────────────────────

test.describe('Forgot Password – API 1: POST /auth/passwords/forget', () => {
    test.describe.configure({ mode: 'serial' });

    test('API-01: should return 200 for valid company number and mobile number', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: {
                companyNumber: VALID_COMPANY,
                mobileNumber:  MOBILE,
            },
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status()).toBe(200);
    });

    test('API-01a: should respond with JSON content-type', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: {
                companyNumber: VALID_COMPANY,
                mobileNumber:  MOBILE,
            },
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.headers()['content-type']).toMatch(/application\/json/);
    });

    // ── Missing fields ────────────────────────────────────────────────────────

    test('API-N1: should return 400 when companyNumber is missing', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: { mobileNumber: MOBILE },
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status()).toBe(400);
    });

    test('API-N2: should return 400 when mobileNumber is missing', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: { companyNumber: VALID_COMPANY },
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status()).toBe(400);
    });

    test('API-N3: should return 400 when body is empty', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: {},
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status()).toBe(400);
    });

    // ── Invalid credentials ───────────────────────────────────────────────────

    test('API-N4: should return 401 for an unrecognised company number', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: {
                companyNumber: 'INVALID_CO',
                mobileNumber:  MOBILE,
            },
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status()).toBe(401);
    });

    test('API-N5: should return 401 for an unrecognised mobile number', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: {
                companyNumber: VALID_COMPANY,
                mobileNumber:  '+966500000000',
            },
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status()).toBe(401);
    });

    test('API-N6: should return 401 when both company and mobile are unrecognised', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: {
                companyNumber: 'WRONGCO',
                mobileNumber:  '+966500000001',
            },
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status()).toBe(401);
    });

    test('API-N7: should return 400 or 401 when mobile is sent without country code', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: {
                companyNumber: VALID_COMPANY,
                mobileNumber:  VALID_MOBILE,
            },
            headers: { 'Content-Type': 'application/json' },
        });

        expect([400, 401]).toContain(res.status());
    });

    // ── Security ──────────────────────────────────────────────────────────────

    test('API-S1: error response should not expose stack traces or database details', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: {
                companyNumber: 'INVALID',
                mobileNumber:  '+966500000000',
            },
            headers: { 'Content-Type': 'application/json' },
        });

        const text = await res.text();
        expect(text).not.toMatch(/stack|exception|sql|null pointer|traceback|ORA-|JDBC/i);
    });

    test('API-S2: error status should be identical whether company or mobile is wrong (prevents user enumeration)', async ({ request }) => {
        const wrongCompany = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: { companyNumber: 'WRONG', mobileNumber: MOBILE },
            headers: { 'Content-Type': 'application/json' },
        });
        const wrongMobile = await request.post(`${API_BASE}/auth/passwords/forget`, {
            data: { companyNumber: VALID_COMPANY, mobileNumber: '+966500000001' },
            headers: { 'Content-Type': 'application/json' },
        });

        expect(wrongCompany.status()).toBe(wrongMobile.status());
    });

    test('API-S3: should use POST method — credentials must not appear in the URL', async ({ request }) => {
        // If the endpoint accepted GET it would expose credentials in server logs / proxies.
        // Sending a GET to this route must NOT return 200.
        const res = await request.get(`${API_BASE}/auth/passwords/forget`);
        expect(res.status()).not.toBe(200);
    });
});

// ── OTP Settings ──────────────────────────────────────────────────────────────

test.describe('Forgot Password – API 2: GET /otp/otp-settings/q', () => {
    test.describe.configure({ mode: 'serial' });

    test('API-02: should return 200 for operationCode=FORGET_PASSWORD', async ({ request }) => {
        const res = await request.get(
            `${API_BASE}/otp/otp-settings/q?operationCode=FORGET_PASSWORD`
        );

        expect(res.status()).toBe(200);
    });

    test('API-02a: response should contain required OTP config fields', async ({ request }) => {
        const res = await request.get(
            `${API_BASE}/otp/otp-settings/q?operationCode=FORGET_PASSWORD`
        );

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('length');
        expect(body).toHaveProperty('validityInSeconds');
        expect(body).toHaveProperty('canResendOtpAfterInSeconds');
        expect(body).toHaveProperty('enabled');
    });

    test('API-02b: OTP length should be a positive integer', async ({ request }) => {
        const res  = await request.get(
            `${API_BASE}/otp/otp-settings/q?operationCode=FORGET_PASSWORD`
        );
        const body = await res.json();

        expect(typeof body.length).toBe('number');
        expect(body.length).toBeGreaterThan(0);
    });

    test('API-02c: validityInSeconds should be a positive integer', async ({ request }) => {
        const res  = await request.get(
            `${API_BASE}/otp/otp-settings/q?operationCode=FORGET_PASSWORD`
        );
        const body = await res.json();

        expect(typeof body.validityInSeconds).toBe('number');
        expect(body.validityInSeconds).toBeGreaterThan(0);
    });

    test('API-02d: canResendOtpAfterInSeconds should be a non-negative integer', async ({ request }) => {
        const res  = await request.get(
            `${API_BASE}/otp/otp-settings/q?operationCode=FORGET_PASSWORD`
        );
        const body = await res.json();

        expect(typeof body.canResendOtpAfterInSeconds).toBe('number');
        expect(body.canResendOtpAfterInSeconds).toBeGreaterThanOrEqual(0);
    });

    test('API-02e: enabled flag should be a boolean', async ({ request }) => {
        const res  = await request.get(
            `${API_BASE}/otp/otp-settings/q?operationCode=FORGET_PASSWORD`
        );
        const body = await res.json();

        expect(typeof body.enabled).toBe('boolean');
    });

    // ── Negative: OTP settings ────────────────────────────────────────────────

    test('API-N8: should return 400 or 404 for an unknown operationCode', async ({ request }) => {
        const res = await request.get(
            `${API_BASE}/otp/otp-settings/q?operationCode=INVALID_OP`
        );

        expect([400, 404]).toContain(res.status());
    });

    test('API-N9: should return 400 when operationCode query param is omitted', async ({ request }) => {
        const res = await request.get(`${API_BASE}/otp/otp-settings/q`);
        expect(res.status()).toBe(400);
    });
});
