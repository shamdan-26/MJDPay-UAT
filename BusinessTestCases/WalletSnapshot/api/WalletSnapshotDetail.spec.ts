import { test, expect } from '@playwright/test';
import { API_BASE, detailPath, commonHeaders, PENDING_ADMIN_TOKEN } from '../helpers/WalletSnapshotHelper.ts';

// Wallet Snapshot Admin API (EMI-6127) — GET /api/v1/admin/wallet-snapshots/{id}
// (detail: adds discrepancies + validationDetails on top of the list shape).
// See docs/business-knowledge/EMI-6127-Refined-Ticket.md for the full
// contract, the two known defects, and the gap list.
//
// Test IDs (WS-xx) map 1:1 to docs/manual-test-cases/audit-additions.json's
// "Wallet Snapshot Admin" sheet (WS-01..WS-24) — see there for the full case
// text this automates. WS-02/WS-04 run for real — WS-02 is confirmed live
// against dev (2026-09-29): an unauthenticated call answers 401, not 404,
// proving the route is deployed. WS-04 is an invalid-token proxy for "lacks
// ADMIN_GET_WALLET_SNAPSHOTS" — see WalletSnapshotList.spec.ts's header for
// why it's a proxy, not the exact scenario. Everything else needs a real
// ADMIN_GET_WALLET_SNAPSHOTS-scoped token and is test.skip() pending Admin
// Portal tooling access, same as TransactionOperations/Reconciliation.

test.describe('Wallet Snapshot Admin – Detail', () => {
    test('WS-02: GET wallet-snapshots/{id} without a token is rejected with 401, not 404', async ({ request }) => {
        const res = await request.get(`${API_BASE}${detailPath(101)}`, { headers: commonHeaders() });
        expect(res.status(), 'route must be deployed (401) rather than absent (404)').toBe(401);
    });

    test('WS-04 [proxy]: GET wallet-snapshots/{id} with an invalid/unprivileged token is rejected with 401', async ({ request }) => {
        const res = await request.get(`${API_BASE}${detailPath(101)}`, {
            headers: { ...commonHeaders(), Authorization: 'Bearer not-a-real-token' },
        });
        expect(res.status()).toBe(401);
    });

    test('WS-22: a non-existent id returns 404 WALLET_SNAPSHOT_NOT_FOUND — only proven by a mocked test upstream, unconfirmed live', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-15: discrepancies is populated on detail with all four bucket fields', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-16: validationDetails is ordered by occurredAt ascending', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test("WS-17: validationDetails only contains events matching this snapshot's own runId — an event from a different runId never leaks in", async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-18: with zero matching events, validationDetails is [] and reason is null', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-19: reason equals the latest (by occurredAt) non-null event reason, not just the last array entry', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WS-20: when events exist but every reason is null, the top-level reason is null', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    // KNOWN DEFECT — expected to fail once runnable. Assert the CORRECT
    // mapping, not today's buggy one: do not "fix" this test to match the bug.
    test('WS-21 [KNOWN DEFECT]: validationDetails[].verificationSteps is populated when the underlying event has verification data (currently always null — verificationSteps/verifications MapStruct name mismatch)', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });
});
