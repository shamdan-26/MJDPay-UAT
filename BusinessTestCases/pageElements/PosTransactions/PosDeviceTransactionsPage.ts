import { type Page, type Locator, expect } from '@playwright/test';

/**
 * POS Device Transactions — Business (`/business/main/pos-transactions`) and
 * Admin (`/admin/main/pos-transactions`).
 *
 * Tickets: EMI-6011 (FE Web Business — transactions for a selected device/TID,
 * refresh, pagination without duplication, filters, loading/empty/error
 * states), EMI-6013 (FE Web Admin — the same across all devices, plus filter or
 * navigate to a selected device/TID), EMI-6053 (posDeviceId must not be null on
 * the admin rows), EMI-6037 (the device transaction reference must be shown).
 *
 * The two screens differ only in scope and route, so one class serves both —
 * the caller picks the URL via gotoPosBusinessTransactions() /
 * gotoPosAdminTransactions() in PosTransactionsHelper.ts.
 *
 * Locators are best-effort: POS is not in QA-DATA-TESTID-HANDOFF.md, and this
 * is the first page object in the repo for it. Reconcile against the live DOM
 * before using this for CI gating — same caveat as SubWalletsPage.ts.
 */
export class PosDeviceTransactionsPage {
    readonly page: Page;

    readonly transactionsTable: Locator;
    readonly transactionRows: Locator;
    readonly emptyState: Locator;
    readonly loadingIndicator: Locator;
    readonly errorState: Locator;

    // Columns EMI-6011/6013 name, plus the two the defect tickets added.
    readonly terminalIdCells: Locator;
    readonly deviceIdCells: Locator;
    readonly amountCells: Locator;
    readonly statusCells: Locator;
    readonly referenceCells: Locator;

    // Filters
    readonly terminalFilter: Locator;
    readonly statusFilter: Locator;
    readonly applyFiltersButton: Locator;
    readonly resetFiltersButton: Locator;

    // Paging / refresh
    readonly nextPageButton: Locator;
    readonly previousPageButton: Locator;
    readonly refreshButton: Locator;

    readonly errorToast: Locator;

    constructor(page: Page) {
        this.page = page;

        this.transactionsTable = page.getByRole('table')
            .or(page.locator('[class*="pos-transactions"] table, mat-table'))
            .first();
        // Scoped to the table rather than a page-wide prefix match, so a
        // summary card or a stale row from an earlier step cannot be counted.
        this.transactionRows = this.transactionsTable.getByRole('row')
            .filter({ hasNot: page.getByRole('columnheader') });

        this.emptyState = page.getByText(/no transactions|no records|no data/i).first();
        this.loadingIndicator = page.locator('mat-spinner, [class*="spinner"], [class*="loading"]').first();
        this.errorState = page.getByText(/something went wrong|failed to (load|process)|try again/i).first();

        this.terminalIdCells = this.transactionsTable.locator('td[data-column="terminalId"], [class*="terminal-id"]');
        this.deviceIdCells   = this.transactionsTable.locator('td[data-column="posDeviceId"], [class*="device-id"]');
        this.amountCells     = this.transactionsTable.locator('td[data-column="amount"], [class*="amount-cell"]');
        this.statusCells     = this.transactionsTable.locator('td[data-column="processingStatus"], [class*="status-cell"]');
        this.referenceCells  = this.transactionsTable.locator('td[data-column="rrn"], [class*="reference"]');

        this.terminalFilter = page.getByLabel(/terminal|tid/i).or(page.locator('input[id*="terminal"]')).first();
        this.statusFilter   = page.getByLabel(/status/i).or(page.locator('mat-select[id*="status"]')).first();
        this.applyFiltersButton = page.getByRole('button', { name: /apply|search|filter/i }).first();
        this.resetFiltersButton = page.getByRole('button', { name: /reset|clear/i }).first();

        this.nextPageButton     = page.getByRole('button', { name: /next|›|»/i }).first();
        this.previousPageButton = page.getByRole('button', { name: /previous|prev|‹|«/i }).first();
        this.refreshButton      = page.getByRole('button', { name: /refresh|reload/i }).first();

        this.errorToast = page.getByText(/error|failed|went wrong/i).first();
    }

    async waitForList(): Promise<void> {
        await expect(this.transactionsTable.or(this.emptyState)).toBeVisible({ timeout: 20000 });
    }

    async filterByTerminal(terminalId: string): Promise<void> {
        await expect(this.terminalFilter).toBeVisible({ timeout: 15000 });
        await this.terminalFilter.fill(terminalId);
        await this.applyFiltersButton.click();
    }

    async resetFilters(): Promise<void> {
        await expect(this.resetFiltersButton).toBeVisible({ timeout: 15000 });
        await this.resetFiltersButton.click();
    }

    /** Row identity across pages — EMI-6011 requires pagination without duplication. */
    async rowTexts(): Promise<string[]> {
        const count = await this.transactionRows.count();
        const texts: string[] = [];
        for (let i = 0; i < count; i++) {
            texts.push((await this.transactionRows.nth(i).innerText()).trim());
        }
        return texts;
    }

    /** Reads one column, one cell at a time — a null value renders as an empty
     *  cell (EMI-6053), which a whole-row read would not reveal. */
    async columnTexts(column: Locator): Promise<string[]> {
        const count = await column.count();
        const texts: string[] = [];
        for (let i = 0; i < count; i++) {
            texts.push((await column.nth(i).innerText()).trim());
        }
        return texts;
    }

    async goToNextPage(): Promise<void> {
        await expect(this.nextPageButton).toBeVisible({ timeout: 15000 });
        await this.nextPageButton.click();
    }
}
