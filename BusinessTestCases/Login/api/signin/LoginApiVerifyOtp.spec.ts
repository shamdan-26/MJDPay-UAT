import { test, expect } from '@playwright/test';
import { VALID_PASSWORD, VALID_OTP, INVALID_OTP } from '../../helpers/LoginHelper.ts';
import { API_BASE, commonHeaders, VALID_USERNAME, VALID_TENANT } from '../../helpers/loginApi';


// ─────────────────────────────────────────────────────────────────────────────
// API 4 — POST /auth/verify/otp  (skipped when OTP is disabled)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login – API 4: POST /auth/verify/otp', { tag: ['@login', '@api'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'api' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let accessToken = '';

    test.beforeAll(async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     VALID_USERNAME,
                password:     VALID_PASSWORD,
                tenantNumber: VALID_TENANT,
            },
            headers: commonHeaders(),
        });
        if (res.ok()) {
            const body = await res.json();
            accessToken = body?.accessToken?.token ?? '';
        }
    });

    test('API-04: should return 200 with valid OTP (dev env — OTP is 918512)', { annotation: [{ type: 'testcase', description: "LG-127: POST /auth/verify/otp succeeds with correct OTP" }] }, async ({ request }) => {
        test.skip(!accessToken, 'Sign-in did not return an accessToken — skipping OTP verification');

        const res = await request.post(`${API_BASE}/auth/verify/otp`, {
            data: { otp: VALID_OTP },
            headers: {
                ...commonHeaders(),
                Authorization: `Bearer ${accessToken}`,
            },
        });

        expect([200, 201]).toContain(res.status());
    });

    test('API-N11: should return 401 with an incorrect OTP', { annotation: [{ type: 'testcase', description: "LG-128: POST /auth/verify/otp rejects incorrect OTP" }] }, async ({ request }) => {
        test.skip(!accessToken, 'Sign-in did not return an accessToken — skipping OTP verification');

        const res = await request.post(`${API_BASE}/auth/verify/otp`, {
            data: { otp: INVALID_OTP },
            headers: {
                ...commonHeaders(),
                Authorization: `Bearer ${accessToken}`,
            },
        });

        expect(res.status()).toBe(401);
    });

    test('API-N12: should return 400 when OTP field is missing', { annotation: [{ type: 'testcase', description: "LG-129: POST /auth/verify/otp rejects missing OTP field" }] }, async ({ request }) => {
        test.skip(!accessToken, 'Sign-in did not return an accessToken — skipping OTP verification');

        const res = await request.post(`${API_BASE}/auth/verify/otp`, {
            data: {},
            headers: {
                ...commonHeaders(),
                Authorization: `Bearer ${accessToken}`,
            },
        });

        expect([400, 422]).toContain(res.status());
    });

    test('API-N13: should return 401 when Authorization header is missing', { annotation: [{ type: 'testcase', description: "LG-130: POST /auth/verify/otp rejects missing auth header" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/verify/otp`, {
            data:    { otp: VALID_OTP },
            headers: commonHeaders(),
        });

        expect(res.status()).toBe(401);
    });
});
