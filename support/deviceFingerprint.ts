import { createHash } from 'crypto';

/**
 * Builds a `device-finger-print` header value the dev gateway accepts for direct API calls.
 *
 * Why this exists: a direct /auth/signin with a made-up fingerprint is answered with an empty HTTP 412 (Precondition
 * Failed). Found 2026-10-14 by replaying the web app's request and changing one thing at a time:
 *   no/short user-agent → 412 · made-up fingerprint → 412 · no fingerprint → 401 · unregistered device → 404 DEVICE_DOES_NOT_EXIST
 *   the web app's exact headers → 200.
 *
 * Format, decoded from the web app's value: a list of fields, each `tag(2 digits) + length(4 digits) + value`, followed by
 * the SHA-256 hex digest of everything before it:
 *   01 device uuid    — returned by POST /devices/uuid for the device id registered in field 04
 *   02 "ipAddress"    — the literal placeholder the app sends (any other value → 412)
 *   03 User-Agent     — must equal the request's own `user-agent` header
 *   04 device id      — the 32-hex `deviceId` sent to POST /devices/uuid (the pair 01/04 must match what was registered)
 *   05 (free)         06 timestamp in ms (13 digits; an old one is accepted)     07 time zone (free)
 *   08 web app id (constant, see WEB_APP_ID)     09 fixed salt
 */

/** A browser-like User-Agent. Send it as the `user-agent` header together with the fingerprint built from the same value. */
export const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0';

const FIXED_SALT = 'Am_*359184dkfPOIU@QWER45K__3Zxcv';
/**
 * Field 08. The web app sends the same value from every browser, and the gateway rejects (412) any other value, an empty
 * one, or the device uuid (checked 2026-10-14). It behaves like the web client's application id.
 */
const WEB_APP_ID = 'f7bdbb59-46c5-4eba-85c1-8fdf6812ce50';

const field = (tag: string, value: string): string => `${tag}${String(value.length).padStart(4, '0')}${value}`;

export type FingerprintInput = {
    /** uuid returned by POST /devices/uuid for `deviceId`. */
    deviceUuid: string;
    /** the `deviceId` that was registered. */
    deviceId: string;
    userAgent?: string;
};

export function buildDeviceFingerprint({ deviceUuid, deviceId, userAgent = BROWSER_USER_AGENT }: FingerprintInput): string {
    const body =
        field('01', deviceUuid) +
        field('02', 'ipAddress') +
        field('03', userAgent) +
        field('04', deviceId) +
        field('05', '') +
        field('06', String(Date.now())) +
        field('07', 'Asia/Riyadh') +
        field('08', WEB_APP_ID) +
        field('09', FIXED_SALT);
    return body + createHash('sha256').update(body).digest('hex');
}

/** The two headers a direct gateway call needs to look like the web app (user-agent and a matching fingerprint). */
export function browserIdentityHeaders(input: Omit<FingerprintInput, 'userAgent'>, userAgent: string = BROWSER_USER_AGENT): Record<string, string> {
    return { 'user-agent': userAgent, 'device-finger-print': buildDeviceFingerprint({ ...input, userAgent }) };
}
