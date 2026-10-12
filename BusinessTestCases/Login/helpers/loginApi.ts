import type { APIRequestContext } from '@playwright/test';
import { VALID_MOBILE, VALID_PASSWORD, VALID_COMPANY } from '../LoginHelper';

// Shared API config for the Login API specs (api/signin, api/document-expiry).
// Kept out of LoginHelper.ts so UI/functional specs do not pull in API-only values.

export const API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev.majdpay.com';

export const VALID_USERNAME = `+966${VALID_MOBILE}`;
export const VALID_TENANT   = VALID_COMPANY;

export const DEVICE_ID          = '97775405aa6144fc2e034bebc258bdf2';
export const DEVICE_FINGERPRINT = 'test-fingerprint-hash-api-testing';

export function commonHeaders(): Record<string, string> {
    return {
        'Content-Type':        'application/json',
        'Accept':              '*/*',
        'Accept-Language':     'en_uk',
        'locale':              'en_uk',
        'platform':            'web',
        'platformType':        'web',
        'channel':             'ONLINE',
        'toster_ID':           `toster_ID_${Date.now()}`,
        'device-finger-print': DEVICE_FINGERPRINT,
        'latitude':            '24.7136',
        'longitude':           '46.6753',
    };
}

/** POST /auth/signin with the common headers; password defaults to the shared merchant password. */
export async function signIn(request: APIRequestContext, company: string, mobile: string, password: string = VALID_PASSWORD) {
    return request.post(`${API_BASE}/auth/signin`, {
        data: { username: `+966${mobile}`, password, tenantNumber: company },
        headers: commonHeaders(),
    });
}
