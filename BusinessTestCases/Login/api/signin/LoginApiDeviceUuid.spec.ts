import { test, expect } from '@playwright/test';
import { API_BASE, commonHeaders, DEVICE_ID } from '../../helpers/loginApi';


// ─────────────────────────────────────────────────────────────────────────────
// API 2 — POST /devices/uuid
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login – API 2: POST /devices/uuid', { tag: ['@login', '@api'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'api' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    const devicePayload = {
        ipAddress:        '0.0.0.0',
        platform:         'web',
        deviceId:         DEVICE_ID,
        applicationId:    DEVICE_ID,
        manufacturerName: 'Google',
        osName:           'Chrome',
        model:            '149.0',
        token:            '',
    };

    test('API-02: should return 200 with a UUID', async ({ request }) => {
        const res = await request.post(`${API_BASE}/devices/uuid`, {
            data:    devicePayload,
            headers: commonHeaders(),
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('uuid');
    });

    test('API-02a: uuid should be a non-empty string in UUID format', async ({ request }) => {
        const res  = await request.post(`${API_BASE}/devices/uuid`, {
            data:    devicePayload,
            headers: commonHeaders(),
        });
        const body = await res.json();

        expect(typeof body.uuid).toBe('string');
        expect(body.uuid).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
    });

    test('API-02b: response should use JSON content-type', async ({ request }) => {
        const res = await request.post(`${API_BASE}/devices/uuid`, {
            data:    devicePayload,
            headers: commonHeaders(),
        });

        expect(res.headers()['content-type']).toMatch(/application\/json/);
    });

    // ── Negative ──────────────────────────────────────────────────────────────

    test('API-N1: should return 400 when body is empty', async ({ request }) => {
        const res = await request.post(`${API_BASE}/devices/uuid`, {
            data:    {},
            headers: commonHeaders(),
        });

        expect([400, 422]).toContain(res.status());
    });

    test('API-N2: should return 400 when deviceId is missing', async ({ request }) => {
        const { deviceId: _, ...payload } = devicePayload as Record<string, unknown>;
        const res = await request.post(`${API_BASE}/devices/uuid`, {
            data:    payload,
            headers: commonHeaders(),
        });

        expect([400, 422]).toContain(res.status());
    });
});
