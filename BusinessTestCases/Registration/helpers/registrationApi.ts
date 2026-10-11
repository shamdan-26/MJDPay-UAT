import type { APIRequestContext, APIResponse } from '@playwright/test';
import { getOtpFromDb } from './registrationOtp';

declare const process: { env: Record<string, string | undefined> };

/** The dev API gateway the registration wizard calls (confirmed from the browser's network tab). */
export const REGISTRATION_API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev-emi.dg-cash.app';
export const REGISTRATION_API = `${REGISTRATION_API_BASE}/emi-profile/api/v1`;

/** Headers the gateway insists on — without them it answers 400 MISSING_REQUIRED_HEADER before any business logic runs. */
export function registrationHeaders(token?: string, extra: Record<string, string> = {}): Record<string, string> {
    return {
        'Content-Type':        'application/json',
        'Accept':              '*/*',
        'Accept-Language':     'en_uk',
        'locale':              'en_uk',
        'platform':            'web',
        'platformType':        'web',
        'channel':             'ONLINE',
        'toster_ID':           `toster_ID_${Date.now()}`,
        'device-finger-print': 'test-fingerprint-hash-api-testing',
        'latitude':            '24.7136',
        'longitude':           '46.6753',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
    };
}

export function toApiMobile(localMobile: string): string {
    return `+966${localMobile.replace(/^\+?966/, '').replace(/^0/, '')}`;
}

export async function postRegistration(
    request: APIRequestContext,
    path: string,
    data: unknown,
    token?: string,
    extraHeaders: Record<string, string> = {},
): Promise<APIResponse> {
    return request.post(`${REGISTRATION_API}${path}`, { data, headers: registrationHeaders(token, extraHeaders) });
}

/**
 * Opens a registration session for `localMobile` over the API (send OTP → verify OTP) and returns the session token,
 * or null when it cannot be obtained (OTP unreadable / rejected) so callers can skip instead of failing.
 */
export async function openRegistrationSession(request: APIRequestContext, localMobile: string): Promise<string | null> {
    const mobileNumber = toApiMobile(localMobile);
    const sent = await postRegistration(request, '/register/mobile/otp', { mobileNumber });
    if (sent.status() !== 200) return null;
    const sentBody = await sent.json().catch(() => ({}));
    if (sentBody.sessionToken?.token ?? (typeof sentBody.sessionToken === 'string' ? sentBody.sessionToken : null)) {
        return sentBody.sessionToken?.token ?? sentBody.sessionToken;
    }
    try {
        const otp = await getOtpFromDb(localMobile);
        const verified = await postRegistration(request, '/register/verify/otp', { mobileNumber, otp, requestId: sentBody.requestId });
        if (verified.status() !== 200) return null;
        const body = await verified.json().catch(() => ({}));
        return body.sessionToken?.token ?? (typeof body.sessionToken === 'string' ? body.sessionToken : null);
    } catch {
        return null;
    }
}
