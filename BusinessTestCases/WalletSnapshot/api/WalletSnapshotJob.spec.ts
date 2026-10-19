import { test, expect } from '@playwright/test';
import { API_BASE, JOBS_API_BASE, JOBS_PATH, PENDING_INTERNAL_NETWORK } from '../helpers/WalletSnapshotHelper.ts';

// Wallet Snapshot Job trigger (EMI-6115) — POST /api/v1/wallet-snapshot-jobs
// on an internal-only host (JOBS_API_BASE), not the public gateway. See
// docs/business-knowledge/EMI-6115-Refined-Ticket.md for the full contract
// and the two independent observations (this suite's captures + the
// implementing engineer's own comment) that the endpoint appears to have no
// application-level authentication.
//
// Test IDs (WSJ-xx) map 1:1 to docs/manual-test-cases/audit-additions.json's
// "Wallet Snapshot Pipeline" sheet, sub "Snapshot Job Trigger (EMI-6115)".
//
// WS-06 is the only one that runs for real from this sandbox — it hits the
// PUBLIC gateway, confirmed live (2026-10) to answer 404 for this path,
// proving the trigger is not exposed there. Every other case needs network
// access to the internal host, confirmed unreachable from this sandbox
// (connection attempts to 10.243.128.20 time out — the same internal subnet
// as the dev SQL Server), so they are test.skip() pending that access.
// This endpoint MUTATES real data (runs an actual snapshot job) — even once
// reachable, these should never run unattended in CI; gate them the same way
// PosTransactions' ACH release/reject tests gate on POS_ACH_ALLOW_MUTATIONS.

test.describe('Wallet Snapshot Job Trigger', () => {
    test('WSJ-06: the trigger path is not routed by the public gateway (404, not the internal host\'s behavior)', async ({ request }) => {
        const res = await request.post(`${API_BASE}${JOBS_PATH}?cutoffTime=2026-09-27T13%3A49%3A29%2B03%3A00`);
        expect(res.status(), 'public gateway must not expose the internal job-trigger path').toBe(404);
    });

    test('WSJ-01: a valid cutoffTime returns 200 with an empty body', async ({ request }) => {
        test.skip(true, PENDING_INTERNAL_NETWORK);
    });

    test('WSJ-02: a missing cutoffTime returns 400', async ({ request }) => {
        test.skip(true, PENDING_INTERNAL_NETWORK);
    });

    test('WSJ-03: a malformed cutoffTime returns 400, not a silent 200', async ({ request }) => {
        test.skip(true, PENDING_INTERNAL_NETWORK);
    });

    test('WSJ-04: a successful trigger produces readable snapshot data for that cutoff via EMI-6127\'s GET endpoints', async ({ request }) => {
        test.skip(true, PENDING_INTERNAL_NETWORK + ' — also needs an admin token, see WalletSnapshotList.spec.ts');
    });

    test('WSJ-05 [SECURITY]: a garbage/absent Authorization header does not change the outcome (apparent lack of app-layer auth)', async ({ request }) => {
        test.skip(true, PENDING_INTERNAL_NETWORK);
    });

    test('WSJ-07: re-triggering the same cutoffTime twice — undocumented idempotency/generation behavior', async ({ request }) => {
        test.skip(true, PENDING_INTERNAL_NETWORK);
    });

    test('WSJ-08: a single wallet\'s processing failure does not stop the rest of the batch', async ({ request }) => {
        test.skip(true, PENDING_INTERNAL_NETWORK + ' — also needs a controlled bad-wallet fixture, not currently available');
    });

    test('WSJ-09: a fully-verified wallet ends its run with exactly 3 wallet_snapshot_events (COMPUTED, resolved-status, SEALED)', async ({ request }) => {
        test.skip(true, PENDING_INTERNAL_NETWORK);
    });

    test('WSJ-10: a non-fully-verified wallet ends its run with exactly 2 wallet_snapshot_events, never 1', async ({ request }) => {
        test.skip(true, PENDING_INTERNAL_NETWORK);
    });
});
