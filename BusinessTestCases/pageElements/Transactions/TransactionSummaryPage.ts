import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Transaction list + summary detail panel (EMI-5699, EMI-5621, EMI-5544,
 * EMI-5558, EMI-5495, EMI-5626).
 *
 * The list container `#transactions-reports-list` and its datatable rows are
 * confirmed — pageElements/Shared/TransactionsPage.ts already drives them.
 * The commission/VAT and filter locators below are best-effort: Transactions
 * list & filters are listed as "not tagged yet" in QA-DATA-TESTID-HANDOFF.md.
 */
export class TransactionSummaryPage {
    readonly page: Page;

    readonly list: Locator;
    readonly rows: Locator;
    readonly summaryPanel: Locator;

    readonly sourceCommission: Locator;
    readonly sourceVat: Locator;
    readonly destinationCommission: Locator;
    readonly destinationVat: Locator;
    readonly totalAmount: Locator;

    readonly filterButton: Locator;
    readonly transactionTypeFilter: Locator;
    readonly statusFilter: Locator;
    readonly applyFilterButton: Locator;

    readonly errorMessage: Locator;

    constructor(page: Page) {
        this.page = page;

        this.list         = page.locator('#transactions-reports-list');
        this.rows         = this.list.locator('datatable-row-wrapper');
        this.summaryPanel = page.locator('[class*="transaction-summary"], [class*="summary-panel"], mat-dialog-container').first();

        this.sourceCommission      = page.getByText(/source commission/i).first();
        this.sourceVat             = page.getByText(/source vat/i).first();
        this.destinationCommission = page.getByText(/destination commission/i).first();
        this.destinationVat        = page.getByText(/destination vat/i).first();
        this.totalAmount           = page.getByText(/total amount/i).first();

        this.filterButton          = page.getByRole('button', { name: /filter/i }).first();
        this.transactionTypeFilter = page.getByLabel(/transaction type/i).first();
        this.statusFilter          = page.getByLabel(/status/i).first();
        this.applyFilterButton     = page.getByRole('button', { name: /apply|search/i }).first();

        this.errorMessage = page.getByText(/internal server error|500|something went wrong/i).first();
    }

    /** Any commission or VAT line — used where the ticket only says "not displayed". */
    get anyCommissionOrVat(): Locator {
        return this.page.getByText(/commission|vat/i).first();
    }

    async openFirstRowSummary(): Promise<void> {
        await expect(this.rows.first()).toBeVisible({ timeout: 15000 });
        await this.rows.first().click();
    }

    async waitForList(): Promise<void> {
        await expect(this.list).toBeVisible({ timeout: 15000 });
    }
}
