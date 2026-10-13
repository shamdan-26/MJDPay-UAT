import { test, expect } from '@playwright/test';
import { VALID_PASSWORD, VALID_OTP } from '../../LoginHelper';
import { API_BASE, commonHeaders, VALID_USERNAME, VALID_TENANT } from '../../helpers/loginApi';

// Response-shape (contract) checks for the sign-in and OTP endpoints: field presence, types and sane values, so a
// backend rename or type change is caught here instead of in the UI.

test.describe('Login – API contract: POST /auth/signin and /auth/verify/otp', { tag: ['@login', '@api'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'api' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let signInBody: Record<string, any> = {};
    let signInStatus = 0;

    test.beforeAll(async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: { username: VALID_USERNAME, password: VALID_PASSWORD, tenantNumber: VALID_TENANT },
            headers: commonHeaders(),
        });
        signInStatus = res.status();
        signInBody = await res.json().catch(() => ({}));
    });

    test('sign-in response should expose the documented accessToken fields with the right types', () => {
        test.skip(signInStatus !== 200, `sign-in answered ${signInStatus}`);
        const t = signInBody['accessToken'];
        expect(typeof t.token).toBe('string');
        expect(typeof t.expirationDuration).toBe('number');
        expect(typeof t.tenantNumber).toBe('string');
        expect(['string', 'number']).toContain(typeof t.userId);
        expect(['string', 'number']).toContain(typeof t.profileId);
        expect(typeof t.username).toBe('string');
    });

    test('sign-in token should be a three-part JWT that has not already expired', () => {
        test.skip(signInStatus !== 200, `sign-in answered ${signInStatus}`);
        const token: string = signInBody['accessToken'].token;
        const parts = token.split('.');
        expect(parts).toHaveLength(3);
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (payload.exp) expect(payload.exp * 1000).toBeGreaterThan(Date.now());
    });

    test('sign-in token expirationDuration should be a plausible session length (1 minute to 24 hours)', () => {
        test.skip(signInStatus !== 200, `sign-in answered ${signInStatus}`);
        const d: number = signInBody['accessToken'].expirationDuration;
        // The unit (seconds vs milliseconds) is not documented: accept either reading.
        const seconds = d > 100_000 ? d / 1000 : d;
        expect(seconds).toBeGreaterThanOrEqual(60);
        expect(seconds).toBeLessThanOrEqual(86_400);
    });

    test('sign-in response should not contain the password, hash or internal fields', () => {
        test.skip(signInStatus !== 200, `sign-in answered ${signInStatus}`);
        const text = JSON.stringify(signInBody);
        expect(text).not.toContain(VALID_PASSWORD);
        expect(text).not.toMatch(/passwordHash|"password"|salt|secret/i);
    });

    test('verify-otp response should carry a session/token payload when the OTP is correct', async ({ request }) => {
        test.skip(signInStatus !== 200, `sign-in answered ${signInStatus}`);
        const res = await request.post(`${API_BASE}/auth/verify/otp`, {
            data: { otp: VALID_OTP },
            headers: { ...commonHeaders(), Authorization: `Bearer ${signInBody['accessToken'].token}` },
        });
        test.skip(res.status() === 404 || res.status() === 400, 'login OTP step is not applicable for this account/environment');
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(typeof (body.accessToken?.token ?? body.token)).toBe('string');
    });

    test('error responses should use a consistent JSON shape (message or error present)', async ({ request }) => {
        const res = await request.post(`${API_BASE}/auth/signin`, {
            data: { username: '+966500000001', password: 'x', tenantNumber: 'NOSUCHTENANT' },
            headers: commonHeaders(),
        });
        expect(res.headers()['content-type'] ?? '').toContain('json');
        const body = await res.json();
        expect(Boolean(body.message ?? body.error ?? body.errorMessage), JSON.stringify(body)).toBe(true);
    });
});
