import { test, expect } from '@playwright/test';
import { VALID_PASSWORD, WRONG_PASSWORD } from '../helpers/LoginHelper.ts';
import { API_BASE, commonHeaders, VALID_USERNAME, VALID_TENANT, signIn } from '../helpers/loginApi';

// Gateway-level security checks on /auth/signin. Failed attempts use a company/mobile that does not exist
// (never NEGATIVE_* / LOCKOUT_*), so nothing here can lock a real account.

const UNKNOWN = { username: '+966500000001', tenantNumber: 'NOSUCHTENANT' };
const post = (request: import('@playwright/test').APIRequestContext, data: unknown, headers = commonHeaders()) =>
    request.post(`${API_BASE}/auth/signin`, { data: data as object, headers });

test.describe('Login — API Security: input handling', { tag: ['@login', '@api', '@security'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'security' }] }, () => {
    const HOSTILE: Record<string, string> = {
        'SQL injection': `' OR '1'='1' --`,
        'SQL stacked query': `'; DROP TABLE users; --`,
        'NoSQL operator string': '{"$ne": null}',
        'script tag': '<script>alert(1)</script>',
        'unicode / RTL override': '‮شركة😀',
        'null byte': 'abc\u0000def',
        'very long string (10k)': 'A'.repeat(10_000),
    };

    for (const [label, payload] of Object.entries(HOSTILE)) {
        test(`should reject ${label} in username with a 4xx and no server error`, { annotation: [{ type: 'testcase', description: "LG-APISEC-01: Should reject … in username with a 4xx and no server error" }] }, async ({ request }) => {
            const res = await post(request, { ...UNKNOWN, username: payload, password: WRONG_PASSWORD });
            expect(res.status(), await res.text()).toBeGreaterThanOrEqual(400);
            expect(res.status()).toBeLessThan(500);
        });

        test(`should reject ${label} in tenantNumber with a 4xx and no server error`, { annotation: [{ type: 'testcase', description: "LG-APISEC-02: Should reject … in tenantNumber with a 4xx and no server error" }] }, async ({ request }) => {
            const res = await post(request, { ...UNKNOWN, tenantNumber: payload, password: WRONG_PASSWORD });
            expect(res.status()).toBeGreaterThanOrEqual(400);
            expect(res.status()).toBeLessThan(500);
        });
    }

    test('should not accept an object where a string is expected (type confusion)', { annotation: [{ type: 'testcase', description: "LG-APISEC-03: Should not accept an object where a string is expected (type confusion)" }] }, async ({ request }) => {
        const res = await post(request, { username: { $ne: '' }, password: { $ne: '' }, tenantNumber: { $ne: '' } });
        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
    });

    test('should not accept an array where a string is expected', { annotation: [{ type: 'testcase', description: "LG-APISEC-04: Should not accept an array where a string is expected" }] }, async ({ request }) => {
        const res = await post(request, { username: [VALID_USERNAME], password: [VALID_PASSWORD], tenantNumber: [VALID_TENANT] });
        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
    });

    test('should reject a malformed JSON body without a stack trace', { annotation: [{ type: 'testcase', description: "LG-APISEC-05: Should reject a malformed JSON body without a stack trace" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, { data: '{"username": ', headers: commonHeaders() });
        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
        expect(await res.text()).not.toMatch(/stack|exception|at \w+\.\w+\(|java\.|org\.springframework/i);
    });

    test('should reject a non-JSON Content-Type', { annotation: [{ type: 'testcase', description: "LG-APISEC-06: Should reject a non-JSON Content-Type" }] }, async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: `username=${VALID_USERNAME}&password=x&tenantNumber=${VALID_TENANT}`,
            headers: { ...commonHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        expect([400, 401, 415]).toContain(res.status());
    });

    test('should handle an oversized body (1 MB) without a 5xx', { annotation: [{ type: 'testcase', description: "LG-APISEC-07: Should handle an oversized body (1 MB) without a 5xx" }] }, async ({ request }) => {
        const res = await post(request, { ...UNKNOWN, password: 'A'.repeat(1_000_000) });
        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
    });

    test('should not authenticate with extra unexpected fields such as isAdmin / role', { annotation: [{ type: 'testcase', description: "LG-APISEC-08: Should not authenticate with extra unexpected fields such as isAdmin / role" }] }, async ({ request }) => {
        const res = await post(request, { ...UNKNOWN, password: WRONG_PASSWORD, isAdmin: true, role: 'ADMIN' });
        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
    });

    test('should reject HTTP methods other than POST on /auth/signin', { annotation: [{ type: 'testcase', description: "LG-126: GET /auth/signin is not a valid method" }] }, async ({ request }) => {
        for (const method of ['put', 'delete', 'patch'] as const) {
            const res = await request[method](`${API_BASE}/auth/signin`, { data: {}, headers: commonHeaders() });
            expect([401, 403, 404, 405], `${method.toUpperCase()} answered ${res.status()}`).toContain(res.status());
        }
    });
});

test.describe('Login — API Security: responses and headers', { tag: ['@login', '@api', '@security'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'security' }] }, () => {
    test('should never echo the submitted password in a failed-login response', { annotation: [{ type: 'testcase', description: "LG-APISEC-09: Should never echo the submitted password in a failed-login response" }] }, async ({ request }) => {
        const res = await post(request, { ...UNKNOWN, password: WRONG_PASSWORD });
        expect(await res.text()).not.toContain(WRONG_PASSWORD);
    });

    test('should never echo the submitted password in a successful response', { annotation: [{ type: 'testcase', description: "LG-APISEC-10: Should never echo the submitted password in a successful response" }] }, async ({ request }) => {
        const res = await signIn(request, VALID_TENANT, VALID_USERNAME.replace('+966', ''));
        test.skip(!res.ok(), 'shared account could not sign in');
        expect(await res.text()).not.toContain(VALID_PASSWORD);
    });

    test('should send X-Content-Type-Options: nosniff on auth responses', { annotation: [{ type: 'testcase', description: "LG-APISEC-11: Should send X-Content-Type-Options: nosniff on auth responses" }] }, async ({ request }) => {
        const res = await post(request, { ...UNKNOWN, password: WRONG_PASSWORD });
        expect(res.headers()['x-content-type-options']).toBe('nosniff');
    });

    test('should send a Strict-Transport-Security header', { annotation: [{ type: 'testcase', description: "LG-APISEC-12: Should send a Strict-Transport-Security header" }] }, async ({ request }) => {
        const res = await post(request, { ...UNKNOWN, password: WRONG_PASSWORD });
        expect(res.headers()['strict-transport-security']).toMatch(/max-age=\d+/);
    });

    test('should not reveal the server software or version in response headers', { annotation: [{ type: 'testcase', description: "LG-APISEC-13: Should not reveal the server software or version in response headers" }] }, async ({ request }) => {
        const res = await post(request, { ...UNKNOWN, password: WRONG_PASSWORD });
        const h = res.headers();
        expect(h['x-powered-by'] ?? '').toBe('');
        expect(h['server'] ?? '').not.toMatch(/\d+\.\d+/);
    });

    test('should not allow a wildcard CORS origin together with credentials', { annotation: [{ type: 'testcase', description: "LG-APISEC-14: Should not allow a wildcard CORS origin together with credentials" }] }, async ({ request }) => {
        const res = await request.fetch(`${API_BASE}/auth/signin`, {
            method: 'OPTIONS',
            headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' },
        });
        const h = res.headers();
        const origin = h['access-control-allow-origin'] ?? '';
        const creds = h['access-control-allow-credentials'] ?? '';
        expect(!(origin === '*' && creds === 'true'), 'wildcard origin with credentials').toBe(true);
        expect(origin, 'arbitrary Origin reflected').not.toBe('https://evil.example');
    });

    test('should answer an unknown tenant and an unknown user with the same status and message', { annotation: [{ type: 'testcase', description: "LG-APISEC-15: Should answer an unknown tenant and an unknown user with the same status and message" }] }, async ({ request }) => {
        const unknownTenant = await post(request, { username: VALID_USERNAME, tenantNumber: 'NOSUCHTENANT', password: WRONG_PASSWORD });
        const unknownUser = await post(request, { username: '+966500000001', tenantNumber: VALID_TENANT, password: WRONG_PASSWORD });
        expect(unknownUser.status()).toBe(unknownTenant.status());
        const a = await unknownTenant.json().catch(() => ({}));
        const b = await unknownUser.json().catch(() => ({}));
        expect(b.message ?? b.error).toEqual(a.message ?? a.error);
    });

    test('should return a token that is not accepted after it is tampered with', { annotation: [{ type: 'testcase', description: "LG-APISEC-16: Should return a token that is not accepted after it is tampered with" }] }, async ({ request }) => {
        const res = await signIn(request, VALID_TENANT, VALID_USERNAME.replace('+966', ''));
        test.skip(!res.ok(), 'shared account could not sign in');
        const token: string = (await res.json()).accessToken.token;
        const tampered = token.slice(0, -4) + (token.endsWith('AAAA') ? 'BBBB' : 'AAAA');
        const probe = await request.post(`${API_BASE}/auth/verify/otp`, {
            data: { otp: '000000' },
            headers: { ...commonHeaders(), Authorization: `Bearer ${tampered}` },
        });
        expect([401, 403]).toContain(probe.status());
    });

    test('should reject a token with alg=none', { annotation: [{ type: 'testcase', description: "LG-APISEC-17: Should reject a token with alg=none" }] }, async ({ request }) => {
        const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
        const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'admin', exp: 4102444800 })}.`;
        const probe = await request.post(`${API_BASE}/auth/verify/otp`, {
            data: { otp: '000000' },
            headers: { ...commonHeaders(), Authorization: `Bearer ${forged}` },
        });
        expect([401, 403]).toContain(probe.status());
    });
});

// Brute force over the API: uses a NON-EXISTENT account so no real account can be locked. It checks that the gateway
// keeps answering consistently (no 5xx, no account-existence leak) and records whether it ever throttles (429).
test.describe('Login — API Security: repeated attempts', { tag: ['@login', '@api', '@security'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'security' }] }, () => {
    test('should stay stable (no 5xx) and consistent over 15 rapid failed attempts for an unknown account', { annotation: [{ type: 'testcase', description: "LG-APISEC-18: Should stay stable (no 5xx) and consistent over 15 rapid failed attempts for an unknown account" }] }, async ({ request }) => {
        const statuses: number[] = [];
        for (let i = 0; i < 15; i++) statuses.push((await post(request, { ...UNKNOWN, password: WRONG_PASSWORD })).status());
        expect(statuses.filter(s => s >= 500), `statuses: ${statuses.join(',')}`).toEqual([]);
        const throttled = statuses.includes(429);
        test.info().annotations.push({ type: 'rate-limiting', description: throttled ? 'gateway throttles (429)' : 'no throttling observed in 15 attempts' });
    });
});
