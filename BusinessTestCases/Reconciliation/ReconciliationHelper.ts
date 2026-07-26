/**
 * Reconciliation & End-of-Day (EOD) processing (epic EMI-2177, stories
 * EMI-4537/4538/4541/4542/4543/4549/4550/4551; EOD tickets EMI-636, EMI-637,
 * EMI-710, EMI-5258, EMI-5920; regression bug EMI-5771).
 *
 * These are backend/Finance-Ops jobs and Admin-Portal screens — there is no
 * Business Portal (merchant/biller) UI surface for any of it, so unlike
 * W2W/PayBill/Topup this suite has no page objects. It's modeled as API-level
 * checks against the job endpoints the tickets themselves reference (see
 * EMI-5771's repro steps), following the same `request`-fixture pattern as
 * `Login/api/LoginAPIFlow.spec.ts`. Every test is `test.skip()`'d pending
 * access to the Castlemock mock server + Admin Portal / Ops tooling these
 * jobs run against in UAT — remove test.skip() once that access exists.
 */

export const API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev.majdpay.com';

// Endpoint referenced directly in EMI-5771's repro steps.
export const INCOMING_BANK_TRANSACTIONS_JOB = `${API_BASE}/api/v1/job/incoming-bank-transactions`;

export function commonHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Accept': '*/*',
    };
}
