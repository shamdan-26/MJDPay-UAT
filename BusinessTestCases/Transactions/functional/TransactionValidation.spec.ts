import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import {
    fetchJson,
    gotoTransactions,
    mockTransactionList,
    mockTransferRejectsEmptyIdempotencyKey,
    mockTransferAcceptsEmptyIdempotencyKey,
    mockTransferBlockedByWalletConfig,
    mockTransferIgnoresWalletConfig,
    mockTransferInsufficientFunds,
    mockTransferHourlyLimitError,
    mockTransferInactiveRecipient,
    mockTransferProfileNotFound,
} from '../TransactionsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Validation (TV-01..TV-08) — MOCK ONLY.
//
// EMI-5525 (empty idempotency key accepted), EMI-5570 (wallet-configuration
// restrictions bypassed), EMI-5803 (hourly-limit error shown instead of
// insufficient funds), EMI-5087 (inactive recipient reported as "profile could
// not be found").
//
// These are all backend validation contracts. Driving them through the real UI
// would need purpose-built accounts (a restricted wallet config, an inactive
// recipient, a balance tuned to 1.85 with a 7.00 commission), none of which
// exist as fixtures — so each assertion targets the API contract directly via
// an in-page fetch, paired with a regression guard on the pre-fix response.
//
// EMI-5803 and EMI-5087 are still To Do at time of writing: their "fixed"
// tests are expected to fail until the fix lands, which is the point.
// ─────────────────────────────────────────────────────────────────────────────

const TRANSFER_PATH = '/api/v1/wallet-transfer';

test.describe('Transaction Validation — Idempotency Key Required (TV-01, EMI-5525)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('TV-01: a transfer with an empty idempotency key should be rejected', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransferRejectsEmptyIdempotencyKey(page);
        await gotoTransactions(page);

        const { status } = await fetchJson(page, TRANSFER_PATH, {
            method: 'POST',
            headers: { idempotencyKey: '' },
            body: { amount: 10, destination: '966500000000' },
        });

        expect(status).toBe(400);
    });

    test('TV-01b: a transfer carrying an idempotency key should be accepted', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransferRejectsEmptyIdempotencyKey(page);
        await gotoTransactions(page);

        const { status } = await fetchJson(page, TRANSFER_PATH, {
            method: 'POST',
            headers: { idempotencyKey: `qa-${Date.now()}` },
            body: { amount: 10, destination: '966500000000' },
        });

        expect(status).toBe(200);
    });

    test('TV-01 (regression guard): the pre-fix backend processed the empty key anyway', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransferAcceptsEmptyIdempotencyKey(page);
        await gotoTransactions(page);

        const { status } = await fetchJson(page, TRANSFER_PATH, {
            method: 'POST',
            headers: { idempotencyKey: '' },
            body: { amount: 10, destination: '966500000000' },
        });

        expect(status).toBe(200);
    });
});

test.describe('Transaction Validation — Wallet Configuration Restrictions (TV-02, EMI-5570)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('TV-02: a transaction type the wallet config disallows should be blocked', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransferBlockedByWalletConfig(page);
        await gotoTransactions(page);

        const { status, body } = await fetchJson(page, TRANSFER_PATH, {
            method: 'POST',
            body: { amount: 10, transactionTypeCode: '999999', destination: '966500000000' },
        });

        expect(status).toBe(400);
        expect(JSON.stringify(body)).toMatch(/not allowed/i);
    });

    test('TV-02 (regression guard): the pre-fix backend let the restricted type through', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransferIgnoresWalletConfig(page);
        await gotoTransactions(page);

        const { status } = await fetchJson(page, TRANSFER_PATH, {
            method: 'POST',
            body: { amount: 10, transactionTypeCode: '999999', destination: '966500000000' },
        });

        expect(status).toBe(200);
    });
});

test.describe('Transaction Validation — Insufficient Funds Messaging (TV-03, EMI-5803)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    // Ticket repro: availableBalance 1.85, amount 1, commission 7, vat 1.05.
    test('TV-03: a balance too low to cover amount + commission should read as insufficient funds', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransferInsufficientFunds(page);
        await gotoTransactions(page);

        const { body } = await fetchJson(page, TRANSFER_PATH, {
            method: 'POST',
            body: { amount: 1, availableBalance: 1.85, commission: 7, vat: 1.05 },
        });

        expect(JSON.stringify(body)).toMatch(/insufficient/i);
        expect(JSON.stringify(body)).not.toMatch(/HOURLY_TRANSACTION_LIMITS_EXCEEDED/);
    });

    test('TV-03 (regression guard): the pre-fix backend returned the hourly-limit code', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransferHourlyLimitError(page);
        await gotoTransactions(page);

        const { body } = await fetchJson(page, TRANSFER_PATH, {
            method: 'POST',
            body: { amount: 1, availableBalance: 1.85, commission: 7, vat: 1.05 },
        });

        expect(JSON.stringify(body)).toMatch(/HOURLY_TRANSACTION_LIMITS_EXCEEDED/);
    });
});

test.describe('Transaction Validation — Inactive B2B Recipient (TV-04, EMI-5087)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('TV-04: transferring to an inactive account should say the recipient is inactive', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransferInactiveRecipient(page);
        await gotoTransactions(page);

        const { body } = await fetchJson(page, TRANSFER_PATH, {
            method: 'POST',
            body: { amount: 10, unifiedNumber: '1270000014' },
        });

        expect(JSON.stringify(body)).toMatch(/inactive/i);
        expect(JSON.stringify(body)).not.toMatch(/profile could not be found/i);
    });

    test('TV-04 (regression guard): the pre-fix backend returned "profile could not be found"', async ({ page }) => {
        await mockTransactionList(page, []);
        await mockTransferProfileNotFound(page);
        await gotoTransactions(page);

        const { body } = await fetchJson(page, TRANSFER_PATH, {
            method: 'POST',
            body: { amount: 10, unifiedNumber: '1270000014' },
        });

        expect(JSON.stringify(body)).toMatch(/profile could not be found/i);
    });
});
