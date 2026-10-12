import { test, expect } from '@playwright/test';
import { VALID_PASSWORD } from '../../LoginHelper';
import { API_BASE, commonHeaders, VALID_USERNAME, VALID_TENANT, DEVICE_ID } from '../../helpers/loginApi';


// ─────────────────────────────────────────────────────────────────────────────
// FULL FLOW — chain all 3 pre-auth steps + sign in
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login – Full API Flow (IP → UUID → Sign In)', { tag: ['@login', '@api'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'api' }] }, () => {
    test('API-FLOW-01: should complete the full pre-auth and sign-in chain successfully', async ({ request }) => {
        // Step 1 — get IP
        const ipRes  = await request.get(`${API_BASE}/devices/ip-address`, { headers: commonHeaders() });
        expect(ipRes.status()).toBe(200);
        const { ipAddress } = await ipRes.json();
        expect(typeof ipAddress).toBe('string');

        // Step 2 — register device UUID
        const uuidRes = await request.post(`${API_BASE}/devices/uuid`, {
            data: {
                ipAddress,
                platform:         'web',
                deviceId:         DEVICE_ID,
                applicationId:    DEVICE_ID,
                manufacturerName: 'Google',
                osName:           'Chrome',
                model:            '149.0',
                token:            '',
            },
            headers: commonHeaders(),
        });
        expect(uuidRes.status()).toBe(200);
        const { uuid } = await uuidRes.json();
        expect(uuid).toMatch(/^[0-9a-f-]{36}$/i);

        // Step 3 — sign in
        const signInRes = await request.post(`${API_BASE}/auth/signin`, {
            data: {
                username:     VALID_USERNAME,
                password:     VALID_PASSWORD,
                tenantNumber: VALID_TENANT,
            },
            headers: commonHeaders(),
        });
        expect(signInRes.status()).toBe(200);
        const body = await signInRes.json();
        expect(body.accessToken?.token?.length).toBeGreaterThan(0);
    });
});
