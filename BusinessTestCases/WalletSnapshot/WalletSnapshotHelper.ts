/**
 * Wallet Snapshot Admin API (EMI-6127) — two read-only Admin-portal endpoints
 * over the existing wallet-snapshot subsystem (wallet_snapshots /
 * wallet_snapshot_events / wallet_snapshot_verifications). No Business Portal
 * UI surface; no write/management endpoint ships with this ticket.
 * See docs/business-knowledge/EMI-6127-Refined-Ticket.md for the full
 * refinement, the two known defects, and the gap list.
 *
 * Both routes are confirmed live in dev (2026-09-29): an unauthenticated call
 * answers 401, not 404. There is no confirmed pure-API admin sign-in contract
 * yet — the business-portal `/auth/signin` + `tenantNumber` flow returns 401
 * for admin credentials (a separate auth realm) — so tests needing an
 * ADMIN_GET_WALLET_SNAPSHOTS-scoped token are test.skip() pending that access,
 * the same rationale already used by TransactionOperations/Reconciliation.
 *
 * Headers are an EXACT match to a real captured Admin Portal browser request
 * against gateway-dev.majdpay.com/api/v1/admin/wallet-snapshots (2026-10),
 * including the browser-injected ones (Connection, Origin, Referer,
 * Sec-Fetch-*, User-Agent, sec-ch-ua*) — not just the app-level subset Login's
 * own commonHeaders() sends (Login/api/signin/ (LoginApi*.spec.ts)). Re-verified live
 * (2026-10) that this fuller header set still produces the same 401 on an
 * unauthenticated call. `device-finger-print` is intentionally omitted here:
 * the real value is generated client-side per session and itself embeds the
 * current access token, so it has no safe static equivalent for an automated
 * test.
 */

export const API_BASE = process.env['API_BASE_URL'] ?? 'https://gateway-dev-emi.dg-cash.app';
export const LIST_PATH = '/api/v1/admin/wallet-snapshots';
export const detailPath = (id: string | number): string => `${LIST_PATH}/${id}`;

export const PENDING_ADMIN_TOKEN = 'pending an ADMIN_GET_WALLET_SNAPSHOTS-scoped Admin Portal token (EMI-6127) — see WalletSnapshotHelper.ts';

/**
 * EMI-6115's on-demand job trigger — a different host entirely, not the
 * public gateway (confirmed unreachable from outside the internal network in
 * this session, same subnet as the dev SQL Server). See
 * docs/business-knowledge/EMI-6115-Refined-Ticket.md.
 */
export const JOBS_API_BASE = process.env['WALLET_SNAPSHOT_JOBS_BASE_URL'] ?? 'http://10.243.128.20:9094';
export const JOBS_PATH = '/api/v1/wallet-snapshot-jobs';

export const PENDING_INTERNAL_NETWORK = 'pending network access to the internal wallet-snapshot-jobs host (EMI-6115) — unreachable from this sandbox, see WalletSnapshotHelper.ts';

export type WalletSnapshotStatus = 'COMPUTED' | 'VERIFIED' | 'REPAIR_QUEUED' | 'VARIANCE_PENDING' | 'FAILED' | 'SEALED';

export const ALL_STATUSES: WalletSnapshotStatus[] = [
    'COMPUTED', 'VERIFIED', 'REPAIR_QUEUED', 'VARIANCE_PENDING', 'FAILED', 'SEALED',
];

export function commonHeaders(): Record<string, string> {
    return {
        'Accept': '*/*',
        'Accept-Language': 'en_uk',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'Origin': 'https://dev.majdpay.com',
        'Referer': 'https://dev.majdpay.com/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
        'channel': 'ONLINE',
        'latitude': '32.023868354717514',
        'locale': 'en_uk',
        'longitude': '35.887239083362864',
        'platform': 'web',
        'platformType': 'web',
        'sec-ch-ua': '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'toster_ID': `toster_ID_${Date.now()}`,
    };
}

export function authHeaders(token: string): Record<string, string> {
    return { ...commonHeaders(), Authorization: `Bearer ${token}` };
}
