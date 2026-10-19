import { test, expect } from '@playwright/test';
import { API_BASE, detailPath, commonHeaders, PENDING_ADMIN_TOKEN } from '../helpers/WalletSnapshotHelper.ts';

// Wallet Snapshot Pipeline — the internal calculation/validation steps that
// have no REST endpoint of their own (EMI-6116, 6117, 6118, 6119, 6121, 6122,
// 6123, 6126), all verified only as an outcome inside a triggered run's
// snapshot rows, read back through EMI-6127's detail endpoint. See each
// ticket's own docs/business-knowledge/EMI-<n>-Refined-Ticket.md and the
// shared docs/business-knowledge/Wallet-Snapshot-Pipeline-Architecture.md.
//
// Test IDs (WWC/WRB/WCB/WVB/WVL/WBM/WVF/WOB-xx) map 1:1 to
// docs/manual-test-cases/audit-additions.json's "Wallet Snapshot Pipeline"
// sheet. Every case here needs BOTH an ADMIN_GET_WALLET_SNAPSHOTS-scoped
// token (see WalletSnapshotList.spec.ts) AND a way to trigger a fresh run
// for a known wallet/cutoff (EMI-6115 — internal-network-only, see
// WalletSnapshotJob.spec.ts), so all are test.skip() pending both.
//
// WBM-01 (movement = closing - opening) is the cheapest to unblock first: it
// needs no fresh trigger at all, just ANY existing snapshot row already
// reachable via the detail endpoint.

test.describe('Wallet Snapshot Pipeline — calculation and validation outcomes', () => {
    test('WWC-01: every account wallet at run start appears exactly once across all pages', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN + ' — also needs a way to trigger a fresh run (EMI-6115)');
    });

    test('WRB-01: closing balance is the latest Running Balance entry at or before the cutoff, never one after it', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WRB-02: a wallet with no Running Balance record in range follows EMI-6123\'s continue/DRIFT branching, not an error', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WCB-01: closingBalances exactly matches all four fields of the selected Running Balance record', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WCB-02: closingBalances.available and .current are both populated (unaffected by the known opening/movement defect)', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WVB-01: STRUCTURAL_INVARIANTS verification is PASS when current == available + reserveDebit exactly', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WVB-02: a new wallet\'s first snapshot gets a PROVISIONAL_PASS/PROVISIONAL_FAIL outcome, not a plain PASS/FAIL', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WVL-01: INCREMENTAL_LEDGER verification reconciles movementBalances against EMI-6120\'s own Ledger Balance Calculation API', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN + ' — also needs a live call to EMI-6120\'s API for cross-check');
    });

    test('WVL-03: a deliberate ledger/running-balance mismatch produces FAIL and a non-VERIFIED snapshot status', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN + ' — also needs a constructed mismatch fixture');
    });

    test('WBM-01: movementBalances exactly equals closingBalances minus openingBalances, per field, on ANY existing snapshot', async ({ request }) => {
        // Cheapest case in this file — needs no fresh trigger, just any
        // existing snapshot id reachable via the detail endpoint. Still
        // skipped today because even that read needs an admin token.
        test.skip(true, PENDING_ADMIN_TOKEN);
        const res = await request.get(`${API_BASE}${detailPath(101)}`, { headers: commonHeaders() });
        const body = await res.json();
        for (const field of ['reserveDebit', 'reserveCredit', 'current'] as const) {
            const expected = body.closingBalances[field] - body.openingBalances[field];
            expect(body.movementBalances[field]).toBeCloseTo(expected, 6);
        }
        // 'available' deliberately excluded — see WBM-02 / EMI-6127's known defect.
    });

    test('WBM-03: a net-debit period produces a correctly negative movement value, not an absolute figure', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN + ' — also needs a wallet with a known net-debit period');
    });

    test('WVF-01: a wallet with a Running Balance record and an available ledger value resolves to a normal (non-DRIFT) status', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN);
    });

    test('WVF-02: no Running Balance record + zero ledger value resolves normally, not DRIFT', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN + ' — also needs a matching fixture');
    });

    test('WVF-03: no Running Balance record + non-zero ledger value is marked DRIFT', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN + ' — also needs a matching fixture, and DRIFT\'s schema representation confirmed (EMI-6114 WSD-04)');
    });

    test('WOB-01: a wallet\'s new openingBalances exactly equals its prior sealed snapshot\'s closingBalances', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN + ' — needs two consecutive triggered runs for the same wallet');
    });

    test('WOB-02: a wallet with no previous snapshot gets provisionalOpening=true and a zeroed opening balance', async ({ request }) => {
        test.skip(true, PENDING_ADMIN_TOKEN + ' — needs a brand-new wallet\'s first-ever cutoff run');
    });
});
