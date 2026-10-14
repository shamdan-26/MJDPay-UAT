import { test, expect } from '@playwright/test';
import { API_BASE, commonHeaders } from '../../helpers/loginApi';


// ─────────────────────────────────────────────────────────────────────────────
// API 1 — GET /devices/ip-address
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login – API 1: GET /devices/ip-address', { tag: ['@login', '@api'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'api' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    test('API-01: should return 200', { annotation: [{ type: 'testcase', description: "LG-111: GET /devices/ip-address succeeds" }] }, async ({ request }) => {
        const res = await request.get(`${API_BASE}/devices/ip-address`, {
            headers: commonHeaders(),
        });

        expect(res.status()).toBe(200);
    });

    test('API-01a: response should contain an ipAddress field', { annotation: [{ type: 'testcase', description: "LG-API-01a: Response should contain an ipAddress field" }] }, async ({ request }) => {
        const res  = await request.get(`${API_BASE}/devices/ip-address`, {
            headers: commonHeaders(),
        });
        const body = await res.json();

        expect(body).toHaveProperty('ipAddress');
        expect(typeof body.ipAddress).toBe('string');
        expect(body.ipAddress.length).toBeGreaterThan(0);
    });

    test('API-01b: response should use JSON content-type', { annotation: [{ type: 'testcase', description: "LG-API-01b: Response should use JSON content-type" }] }, async ({ request }) => {
        const res = await request.get(`${API_BASE}/devices/ip-address`, {
            headers: commonHeaders(),
        });

        expect(res.headers()['content-type']).toMatch(/application\/json/);
    });
});
