/**
 * Transaction Reversal (EMI-2028, epic EMI-2208) and Transaction Adjustment
 * (EMI-2219, epic EMI-2209) — Financial Operations Manager (Admin Portal)
 * actions on existing transactions. No Business Portal UI surface for either.
 */

export const API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev.majdpay.com';

export function commonHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Accept': '*/*',
    };
}
