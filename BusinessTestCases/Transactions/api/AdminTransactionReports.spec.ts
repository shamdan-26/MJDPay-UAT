import { test } from '@playwright/test';

// Admin Transaction Reports (AR-01..AR-06) — EMI-5537 (report download 500s),
// EMI-5381 (report dates land one day earlier than selected), EMI-5402 (Pending
// Transactions column empty in the Excel export despite the API failing),
// EMI-5165 (duplicate rows in transaction_failed_reasons when the Payment TTL
// job runs), EMI-5626 (transaction filter resets after an admin updates a
// transaction).
//
// All Admin Portal features with no Business Portal surface, so every test is
// skipped pending Admin Portal automation access — kept in the suite rather
// than omitted, same rationale as TransactionOperations/ and
// BankTransferCommission.spec.ts.

const PENDING = 'pending Admin Portal transaction-reporting automation access';

test.describe('Admin Transaction Reports – Download', () => {
    test('AR-01: downloading a transaction report returns a file rather than a 500 (EMI-5537)', async ({ request }) => {
        test.skip(true, `${PENDING} (EMI-5537)`);
    });

    test('AR-02: a report requested for a given date range covers exactly that range, not one day earlier (EMI-5381)', async ({ request }) => {
        test.skip(true, `${PENDING} (EMI-5381)`);
    });

    test('AR-03: the Pending Transactions column is populated in the Excel export (EMI-5402)', async ({ request }) => {
        test.skip(true, `${PENDING} (EMI-5402)`);
    });

    test('AR-04: a failure in the pending-transactions API surfaces an error instead of silently emitting a blank column (EMI-5402)', async ({ request }) => {
        test.skip(true, `${PENDING} (EMI-5402)`);
    });
});

test.describe('Admin Transaction Reports – Data Integrity', () => {
    test('AR-05: running the Payment TTL job does not insert duplicate transaction_failed_reasons rows (EMI-5165)', async ({ request }) => {
        test.skip(true, `${PENDING} (EMI-5165)`);
    });

    test('AR-06: the transaction filter survives an admin updating a transaction (EMI-5626)', async ({ request }) => {
        test.skip(true, `${PENDING} (EMI-5626)`);
    });
});
