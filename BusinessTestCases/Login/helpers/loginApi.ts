import type { APIRequestContext } from '@playwright/test';
import { VALID_MOBILE, VALID_PASSWORD, VALID_COMPANY } from './LoginHelper.ts';
import { browserIdentityHeaders } from '../../../support/deviceFingerprint';
import { boxStep } from '../../shared/boxStep.ts';

// Shared API config for the Login API specs (api/signin, api/document-expiry).
// Kept out of LoginHelper.ts so UI/functional specs do not pull in API-only values.

export const API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev-emi.dg-cash.app';

export const VALID_USERNAME = `+966${VALID_MOBILE}`;
export const VALID_TENANT   = VALID_COMPANY;

export const DEVICE_ID = '97775405aa6144fc2e034bebc258bdf2';

/** Body the web app sends to POST /devices/uuid (see LoginApiDeviceUuid / LoginApiFullFlow). */
export const devicePayload = (deviceId: string = DEVICE_ID, ipAddress = '0.0.0.0') => ({
    ipAddress, platform: 'web', deviceId, applicationId: deviceId,
    manufacturerName: 'Google', osName: 'Chrome', model: '149.0', token: '',
});

// The gateway answers an empty HTTP 412 unless `device-finger-print` is well-formed, matches the `user-agent` header and
// names a REGISTERED device (field 01 = the uuid POST /devices/uuid returns, field 04 = the deviceId registered).
// See support/deviceFingerprint.ts. POST /devices/uuid is idempotent: this uuid is what dev returned for DEVICE_ID on
// 2026-10-14. If dev is reset the gateway says DEVICE_DOES_NOT_EXIST and signIn() re-registers and retries once.
let deviceUuid = process.env['LOGIN_DEVICE_UUID'] ?? '3297e2a1-d813-432f-a79c-544fb97b4777';

/** Registers DEVICE_ID with the gateway (idempotent) and uses the returned uuid for every later call in this worker. */
export async function registerDevice(request: APIRequestContext): Promise<string> {
    return boxStep('registerDevice', async () => {
    const res = await request.post(`${API_BASE}/devices/uuid`, { data: devicePayload(), headers: commonHeaders() });
    if (res.status() !== 200) throw new Error(`POST /devices/uuid returned ${res.status()}: ${await res.text()}`);
    deviceUuid = (await res.json()).uuid as string;
    return deviceUuid;
    });
}

export function commonHeaders(): Record<string, string> {
    return {
        ...browserIdentityHeaders({ deviceUuid, deviceId: DEVICE_ID }),
        'Content-Type':        'application/json',
        'Accept':              '*/*',
        'Accept-Language':     'en_uk',
        'locale':              'en_uk',
        'platform':            'web',
        'platformType':        'web',
        'channel':             'ONLINE',
        'toster_ID':           `toster_ID_${Date.now()}`,
        'latitude':            '24.7136',
        'longitude':           '46.6753',
    };
}

/** POST /auth/signin with the common headers; password defaults to the shared merchant password. */
export async function signIn(request: APIRequestContext, company: string, mobile: string, password: string = VALID_PASSWORD, extraHeaders: Record<string, string> = {}) {
    return boxStep('signIn', async () => {
    const send = () => request.post(`${API_BASE}/auth/signin`, {
        data: { username: `+966${mobile}`, password, tenantNumber: company },
        headers: { ...commonHeaders(), ...extraHeaders },
    });
    const res = await send();
    if (res.status() === 404 && (await res.text()).includes('DEVICE_DOES_NOT_EXIST')) {
        await registerDevice(request);
        return send();
    }
    return res;
    });
}
