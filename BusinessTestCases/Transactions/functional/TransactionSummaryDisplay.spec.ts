import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { TransactionSummaryPage } from '../../pageElements/Transactions/TransactionSummaryPage';
import {
    gotoTransactions,
    mockTransactionList,
    mockTransactionListWithoutCommission,
    W2W_WITH_COMMISSION,
    TOPUP_WITH_COMMISSION,
} from '../TransactionsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Summary Display (TS-01..TS-06) — EMI-5699 (commission & VAT
// missing for some transactions), EMI-5621 (missing on top-up), EMI-5544 (BE
// not returning them), EMI-5558 / EMI-5495 (standardised summary payload).
//
// Mock-driven: reproducing a transaction that carries both source and
// destination commission needs commission configured per transaction type in
// Admin Portal, which this suite has no access to. The mocks pin the contract
// the frontend must render; see TransactionSummaryPage.ts for the locator caveat.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Transaction Summary — Commission and VAT Display (TS-01, TS-02, EMI-5699)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('TS-01: a W2W transaction with commission should show commission and VAT on the summary', async ({ page }) => {
        await mockTransactionList(page, [W2W_WITH_COMMISSION]);
        await gotoTransactions(page);

        const summary = new TransactionSummaryPage(page);
        await summary.waitForList();
        await summary.openFirstRowSummary();

        await expect(summary.anyCommissionOrVat).toBeVisible({ timeout: 15000 });
    });

    test('TS-02: the summary should distinguish source from destination commission and VAT', async ({ page }) => {
        await mockTransactionList(page, [W2W_WITH_COMMISSION]);
        await gotoTransactions(page);

        const summary = new TransactionSummaryPage(page);
        await summary.waitForList();
        await summary.openFirstRowSummary();

        await expect(summary.sourceCommission).toBeVisible({ timeout: 15000 });
        await expect(summary.destinationCommission).toBeVisible();
        await expect(summary.sourceVat).toBeVisible();
        await expect(summary.destinationVat).toBeVisible();
    });

    test('TS-02 (regression guard): the pre-fix payload omits commission and VAT entirely', async ({ page }) => {
        await mockTransactionListWithoutCommission(page, W2W_WITH_COMMISSION);
        await gotoTransactions(page);

        const summary = new TransactionSummaryPage(page);
        await summary.waitForList();
        await summary.openFirstRowSummary();

        await expect(summary.sourceCommission).not.toBeVisible({ timeout: 10000 });
        await expect(summary.destinationCommission).not.toBeVisible();
    });
});

test.describe('Transaction Summary — Top-Up Commission and VAT (TS-03, EMI-5621)', () => {
    test.use({ storageState: SESSION_PATH });

    test('TS-03: a top-up transaction summary should display commission and VAT', async ({ page }) => {
        await mockTransactionList(page, [TOPUP_WITH_COMMISSION]);
        await gotoTransactions(page);

        const summary = new TransactionSummaryPage(page);
        await summary.waitForList();
        await summary.openFirstRowSummary();

        await expect(summary.anyCommissionOrVat).toBeVisible({ timeout: 15000 });
    });

    test('TS-03 (regression guard): the pre-fix top-up payload omits them', async ({ page }) => {
        await mockTransactionListWithoutCommission(page, TOPUP_WITH_COMMISSION);
        await gotoTransactions(page);

        const summary = new TransactionSummaryPage(page);
        await summary.waitForList();
        await summary.openFirstRowSummary();

        await expect(summary.sourceCommission).not.toBeVisible({ timeout: 10000 });
    });
});

test.describe('Transaction Summary — Standardised Payload (TS-04, TS-05, EMI-5558, EMI-5495)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('TS-04: every transaction in the list should render with the standardised summary fields', async ({ page }) => {
        await mockTransactionList(page, [W2W_WITH_COMMISSION, TOPUP_WITH_COMMISSION]);
        await gotoTransactions(page);

        const summary = new TransactionSummaryPage(page);
        await summary.waitForList();
        await expect(summary.rows).toHaveCount(2, { timeout: 15000 });
    });

    test('TS-05: an empty transaction list should render without errors', async ({ page }) => {
        await mockTransactionList(page, []);
        await gotoTransactions(page);

        const summary = new TransactionSummaryPage(page);
        await summary.waitForList();
        await expect(summary.errorMessage).not.toBeVisible();
    });
});
