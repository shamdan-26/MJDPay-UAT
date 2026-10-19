import { test, expect } from '@playwright/test';
import { VALID_PASSWORD, WRONG_PASSWORD } from '../../helpers/LoginHelper.ts';
import { API_BASE, commonHeaders, VALID_USERNAME, VALID_TENANT } from '../../helpers/loginApi';


// ─────────────────────────────────────────────────────────────────────────────
// API 3 — POST /auth/signin
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login – API 3: POST /auth/signin', { tag: ['@login', '@api'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'api' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    // ── Happy path ────────────────────────────────────────────────────────────

    test('API-03: should return 200 with valid credentials', { annotation: [{ type: 'testcase', description: "LG-115: POST /auth/signin succeeds with valid credentials" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     VALID_USERNAME,
                password:     VALID_PASSWORD,
                tenantNumber: VALID_TENANT,
            },
            headers: commonHeaders(),
        });

        expect(res.status()).toBe(200);
    });

    test('API-03a: response body should contain an accessToken object', { annotation: [{ type: 'testcase', description: "LG-API-03a: Response body should contain an accessToken object" }] }, async ({ request }) => {
        const res  = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     VALID_USERNAME,
                password:     VALID_PASSWORD,
                tenantNumber: VALID_TENANT,
            },
            headers: commonHeaders(),
        });
        const body = await res.json();

        expect(body).toHaveProperty('accessToken');
        expect(body.accessToken).toHaveProperty('token');
        expect(body.accessToken).toHaveProperty('expirationDuration');
        expect(body.accessToken).toHaveProperty('profileId');
        expect(body.accessToken).toHaveProperty('username');
        expect(body.accessToken).toHaveProperty('userId');
        expect(body.accessToken).toHaveProperty('tenantNumber');
    });

    test('API-03b: accessToken.token should be a non-empty string', { annotation: [{ type: 'testcase', description: "LG-API-03b: AccessToken.token should be a non-empty string" }] }, async ({ request }) => {
        const res  = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     VALID_USERNAME,
                password:     VALID_PASSWORD,
                tenantNumber: VALID_TENANT,
            },
            headers: commonHeaders(),
        });
        const body = await res.json();

        expect(typeof body.accessToken.token).toBe('string');
        expect(body.accessToken.token.length).toBeGreaterThan(0);
    });

    test('API-03c: accessToken.tenantNumber should match the submitted tenant', { annotation: [{ type: 'testcase', description: "LG-116: accessToken.tenantNumber matches submitted tenant" }] }, async ({ request }) => {
        const res  = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     VALID_USERNAME,
                password:     VALID_PASSWORD,
                tenantNumber: VALID_TENANT,
            },
            headers: commonHeaders(),
        });
        const body = await res.json();

        expect(body.accessToken.tenantNumber).toBe(VALID_TENANT);
    });

    test('API-03d: accessToken.expirationDuration should be a positive number', { annotation: [{ type: 'testcase', description: "LG-117: accessToken.expirationDuration is a positive number" }] }, async ({ request }) => {
        const res  = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     VALID_USERNAME,
                password:     VALID_PASSWORD,
                tenantNumber: VALID_TENANT,
            },
            headers: commonHeaders(),
        });
        const body = await res.json();

        expect(typeof body.accessToken.expirationDuration).toBe('number');
        expect(body.accessToken.expirationDuration).toBeGreaterThan(0);
    });

    test('API-03e: response should use JSON content-type', { annotation: [{ type: 'testcase', description: "LG-API-03e: Response should use JSON content-type" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     VALID_USERNAME,
                password:     VALID_PASSWORD,
                tenantNumber: VALID_TENANT,
            },
            headers: commonHeaders(),
        });

        expect(res.headers()['content-type']).toMatch(/application\/json/);
    });

    // ── Missing fields ────────────────────────────────────────────────────────

    test('API-N3: should return 400 when body is empty', { annotation: [{ type: 'testcase', description: "LG-118: POST /auth/signin rejects empty body" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data:    {},
            headers: commonHeaders(),
        });

        expect([400, 422]).toContain(res.status());
    });

    test('API-N4: should return 400 when username is missing', { annotation: [{ type: 'testcase', description: "LG-119: POST /auth/signin rejects missing username" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: { password: VALID_PASSWORD, tenantNumber: VALID_TENANT },
            headers: commonHeaders(),
        });

        expect([400, 422]).toContain(res.status());
    });

    test('API-N5: should return 400 when password is missing', { annotation: [{ type: 'testcase', description: "LG-120: POST /auth/signin rejects missing password" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: { username: VALID_USERNAME, tenantNumber: VALID_TENANT },
            headers: commonHeaders(),
        });

        expect([400, 422]).toContain(res.status());
    });

    test('API-N6: should return 400 when tenantNumber is missing', { annotation: [{ type: 'testcase', description: "LG-121: POST /auth/signin rejects missing tenantNumber" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: { username: VALID_USERNAME, password: VALID_PASSWORD },
            headers: commonHeaders(),
        });

        expect([400, 422]).toContain(res.status());
    });

    // ── Invalid credentials ───────────────────────────────────────────────────

    test('API-N7: should return 401 with a wrong password', { annotation: [{ type: 'testcase', description: "LG-122: POST /auth/signin returns 401 on wrong password" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     VALID_USERNAME,
                password:     WRONG_PASSWORD,
                tenantNumber: VALID_TENANT,
            },
            headers: commonHeaders(),
        });

        expect(res.status()).toBe(401);
    });

    test('API-N8: should return 401 with an unrecognised tenant number', { annotation: [{ type: 'testcase', description: "LG-123: POST /auth/signin returns 401 on unrecognised tenant" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     VALID_USERNAME,
                password:     VALID_PASSWORD,
                tenantNumber: 'INVALID99',
            },
            headers: commonHeaders(),
        });

        expect(res.status()).toBe(401);
    });

    test('API-N9: should return 401 with an unrecognised username', { annotation: [{ type: 'testcase', description: "LG-124: POST /auth/signin returns 401 on unrecognised username" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     '+966500000000',
                password:     VALID_PASSWORD,
                tenantNumber: VALID_TENANT,
            },
            headers: commonHeaders(),
        });

        expect(res.status()).toBe(401);
    });

    test('API-N10: should return 400 or 401 when mobile is sent without +966 country code', { annotation: [{ type: 'testcase', description: "LG-125: POST /auth/signin rejects mobile without country code" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     '500021788',
                password:     VALID_PASSWORD,
                tenantNumber: VALID_TENANT,
            },
            headers: commonHeaders(),
        });

        expect([400, 401]).toContain(res.status());
    });

    // ── Security ──────────────────────────────────────────────────────────────

    test('API-S1: error response should not expose stack traces or database details', { annotation: [{ type: 'testcase', description: "LG-145: Error responses carry no internal detail" }] }, async ({ request }) => {
        const res  = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     '+966500000000',
                password:     WRONG_PASSWORD,
                tenantNumber: 'WRONG',
            },
            headers: commonHeaders(),
        });
        const text = await res.text();

        expect(text).not.toMatch(/stack|exception|sql|null pointer|traceback|ORA-|JDBC/i);
    });

    test('API-S2: error status should be identical whether tenant or username is wrong (prevents enumeration)', { annotation: [{ type: 'testcase', description: "LG-API-S2: Error status should be identical whether tenant or username is wrong (prevents enumeration)" }] }, async ({ request }) => {
        const wrongTenant = await request.post(`${API_BASE}/auth/signin`, {
            data: { username: VALID_USERNAME, password: VALID_PASSWORD, tenantNumber: 'WRONG' },
            headers: commonHeaders(),
        });
        const wrongUser = await request.post(`${API_BASE}/auth/signin`, {
            data: { username: '+966500000001', password: VALID_PASSWORD, tenantNumber: VALID_TENANT },
            headers: commonHeaders(),
        });

        expect(wrongTenant.status()).toBe(wrongUser.status());
    });

    test('API-S3: GET to /auth/signin must not return 200 — credentials must not appear in URLs', { annotation: [{ type: 'testcase', description: "LG-126: GET /auth/signin is not a valid method" }] }, async ({ request }) => {
        const res = await request.get(`${API_BASE}/auth/signin`);

        expect(res.status()).not.toBe(200);
    });
});
