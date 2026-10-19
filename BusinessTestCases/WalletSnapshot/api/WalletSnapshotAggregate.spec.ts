import { test } from '@playwright/test';
import { PENDING_ADMIN_TOKEN, PENDING_INTERNAL_NETWORK } from '../helpers/WalletSnapshotHelper.ts';

// Wallet Snapshot Aggregate (EMI-6124) — WalletSnapshotFacade.start(cutoff),
// the composition root over EMI-6116–6123/6126. This ticket has no behavior
// of its own beyond composition and failure isolation: every sub-ticket's own
// passing check IS evidence this ticket works (see
// docs/business-knowledge/EMI-6124-Refined-Ticket.md §3). What's distinct and
// worth testing here specifically is the END-TO-END composition across a
// single run's mixed wallet fixtures, and cross-wallet consistency — neither
// of which any single sub-ticket's own test exercises in isolation.
//
// Test IDs (WAG-xx) map 1:1 to docs/manual-test-cases/audit-additions.json's
// "Wallet Snapshot Pipeline" sheet, sub "Aggregate Complete Snapshot Logic
// (EMI-6124)". Failure isolation (this ticket's AC #4 resilience guarantee)
// is deliberately NOT duplicated here — it's WSJ-08 in
// WalletSnapshotJob.spec.ts, a genuine twin by WRITING-TEST-CASES.md's
// merge rule, not a separate case.
//
// Both cases need a triggered run (EMI-6115, internal-network-only) AND an
// admin token to read the result (EMI-6127) — the two blockers combine here
// since this is inherently an end-to-end check across both tickets.

test.describe('Wallet Snapshot Aggregate — end-to-end composition', () => {
    test('WAG-01: a single run correctly composes every sub-ticket rule simultaneously, across a mix of wallet states (normal / provisional / DRIFT)', async ({ request }) => {
        test.skip(true, `${PENDING_INTERNAL_NETWORK} — also needs ${PENDING_ADMIN_TOKEN}, plus fixtures for all four wallet states`);
    });

    test('WAG-02: two wallets with structurally identical ledger histories produce identical snapshot computations', async ({ request }) => {
        test.skip(true, `${PENDING_INTERNAL_NETWORK} — also needs ${PENDING_ADMIN_TOKEN}, plus two matched wallet fixtures`);
    });

    // WAG-03 (concurrency/load race-freedom) is intentionally absent — it's an
    // Open Question needing a load-test plan outside this suite's black-box
    // API testing approach, not something to fabricate a skip() for.
});
