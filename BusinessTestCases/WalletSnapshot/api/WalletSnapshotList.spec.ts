import { test, expect } from '@playwright/test';
import { API_BASE, LIST_PATH, commonHeaders, ALL_STATUSES, PENDING_ADMIN_TOKEN } from '../WalletSnapshotHelper';

// Wallet Snapshot Admin API (EMI-6127) — GET /api/v1/admin/wallet-snapshots
// (paged list). See docs/business-knowledge/EMI-6127-Refined-Ticket.md for
// the full contract, the two known defects, and the gap list.
//
// Test IDs (WS-xx) map 1:1 to docs/manual-test-cases/audit-additions.json's
// "Wallet Snapshot Admin" sheet (WS-01..WS-24) — see there for the full case
// text this automates. WS-01/WS-03 run for real — WS-01 is confirmed live
// against dev (2026-09-29): an unauthenticated call answers 401, not 404,
// proving the route is deployed. WS-03 is an invalid-token proxy for "lacks
// ADMIN_GET_WALLET_SNAPSHOTS" — it can't distinguish a valid-but-underprivileged
// token from a garbage one, since no admin token can be minted purely via API
// yet, but both are expected to land on the same 401 UNAUTHORIZED_EXCEPTION.
// Everything else needs a real ADMIN_GET_WALLET_SNAPSHOTS-scoped token and is
// test.skip() pending Admin Portal tooling access, same as
// TransactionOperations/Reconciliation. WS-23/WS-24 (the two Open Question gap
// cases — cutoff-time filtering, management actions) are intentionally absent
// here: neither exists to test.

test.describe('Wallet Snapshot Admin – List', () => {
    test('WS-01: GET wallet-snapshots without a token is rejected with 401, not 404', async ({ request }) => {
        const res = await request.get(`${API_BASE}${LIST_PATH}`, { headers: commonHeaders() });
        expect(res.status(), 'route must be deployed (401) rather than absent (404)').toBe(401);
    });

    test('WS-03 [proxy]: GET wallet-snapshots with an invalid/unprivileged token is rejected with 401', async ({ request }) => {
        const res = await request.get(`${API_BASE}${LIST_PATH}`, {
            headers: { ...commonHeaders(), Authorization: 'Bearer not-a-real-token' },
        });
        expect(res.status()).toBe(401);
    });

    test('WS-09: default pagination is page=0, size=20 when both are omitted', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-10: explicit page/size are honored and totals (totalElements/totalPages) are consistent', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test(`WS-08: status filter is an exact match — checked across all six enum values (${ALL_STATUSES.join(', ')})`, async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-05: walletCode filter is a case-insensitive exact match when no wildcard is supplied', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-06: walletCode filter behaves as a wildcard LIKE when the caller supplies %', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-07: fromDate/toDate bounds are inclusive — a snapshot dated exactly on either bound is included', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-11: page ordering is consistent across repeated identical calls (no explicit ORDER BY exists — do not assert a sort order)', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-12: closingBalances correctly populates both current and available', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    // KNOWN DEFECT — expected to fail once runnable. Assert the CORRECT
    // mapping, not today's buggy one: do not "fix" this test to match the bug.
    test('WS-13 [KNOWN DEFECT]: openingBalances/movementBalances populate available (currently swapped into current)', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-14: list rows never populate discrepancies/validationDetails (detail-only fields)', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });
});
