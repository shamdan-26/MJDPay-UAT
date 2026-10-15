import { type Page, type Locator, expect } from '@playwright/test';

/**
 * ACH Records — Admin Portal (`/admin/main/ach-records`).
 *
 * Tickets: EMI-6015 (the screen itself — paginated records across all devices,
 * backend-supported filters that can be reset, only backend-declared actions
 * shown, release/reject behind a confirmation that refreshes state after
 * success, loading/empty/progress/success/error states), EMI-6063 (Status
 * column renders the raw i18n key `Main.Ach_records.Status_successful`),
 * EMI-6064 (Wallet Code column missing), EMI-6065 (no View Details action; the
 * Date column belongs in the details view instead of the table).
 *
 * Locators are best-effort: the Admin Portal is absent from
 * QA-DATA-TESTID-HANDOFF.md. Reconcile against the live DOM before using this
 * for CI gating.
 */
export class AchRecordsPage {
    readonly page: Page;

    readonly recordsTable: Locator;
    readonly recordRows: Locator;
    readonly columnHeaders: Locator;
    readonly emptyState: Locator;
    readonly loadingIndicator: Locator;

    // Columns
    readonly statusCells: Locator;
    readonly walletCodeCells: Locator;
    readonly batchRefCells: Locator;

    // Actions (EMI-6015, EMI-6065)
    readonly viewDetailsButton: Locator;
    readonly detailsPanel: Locator;
    readonly releaseButton: Locator;
    readonly rejectButton: Locator;
    readonly confirmActionButton: Locator;
    readonly actionProgressIndicator: Locator;

    // Filters
    readonly terminalFilter: Locator;
    readonly statusFilter: Locator;
    readonly applyFiltersButton: Locator;
    readonly resetFiltersButton: Locator;

    readonly successToast: Locator;
    readonly errorToast: Locator;

    constructor(page: Page) {
        this.page = page;

        this.recordsTable = page.getByRole('table')
            .or(page.locator('[class*="ach-records"] table, mat-table'))
            .first();
        this.recordRows = this.recordsTable.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
        this.columnHeaders = this.recordsTable.getByRole('columnheader');

        this.emptyState = page.getByText(/no (ach )?records|no data/i).first();
        this.loadingIndicator = page.locator('mat-spinner, [class*="spinner"], [class*="loading"]').first();

        this.statusCells     = this.recordsTable.locator('td[data-column="status"], [class*="status-cell"]');
        this.walletCodeCells = this.recordsTable.locator('td[data-column="walletCode"], [class*="wallet-code"]');
        this.batchRefCells   = this.recordsTable.locator('td[data-column="reconBatchRefNum"], [class*="batch-ref"]');

        this.viewDetailsButton = page.getByRole('button', { name: /view\s*details|details/i }).first();
        this.detailsPanel      = page.getByRole('dialog').or(page.locator('[class*="ach-details"], [class*="record-details"]')).first();
        this.releaseButton     = page.getByRole('button', { name: /^release$/i }).first();
        this.rejectButton      = page.getByRole('button', { name: /^reject$/i }).first();
        this.confirmActionButton = page.getByRole('button', { name: /confirm|yes|proceed/i }).last();
        this.actionProgressIndicator = page.locator('[class*="progress"], mat-progress-bar, mat-spinner').first();

        this.terminalFilter = page.getByLabel(/terminal|tid/i).or(page.locator('input[id*="terminal"]')).first();
        this.statusFilter   = page.getByLabel(/status/i).or(page.locator('mat-select[id*="status"]')).first();
        this.applyFiltersButton = page.getByRole('button', { name: /apply|search|filter/i }).first();
        this.resetFiltersButton = page.getByRole('button', { name: /reset|clear/i }).first();

        this.successToast = page.getByTestId('toast-message').or(page.getByText(/successfully/i)).first();
        this.errorToast   = page.getByText(/error|failed|went wrong/i).first();
    }

    async waitForList(): Promise<void> {
        await expect(this.recordsTable.or(this.emptyState)).toBeVisible({ timeout: 20000 });
    }

    async headerTexts(): Promise<string[]> {
        const count = await this.columnHeaders.count();
        const texts: string[] = [];
        for (let i = 0; i < count; i++) {
            texts.push((await this.columnHeaders.nth(i).innerText()).trim());
        }
        return texts;
    }

    /** Per-cell read: EMI-6063's raw key and EMI-6064's missing column are both
     *  column-level facts a whole-row innerText would blur. */
    async cellTexts(column: Locator): Promise<string[]> {
        const count = await column.count();
        const texts: string[] = [];
        for (let i = 0; i < count; i++) {
            texts.push((await column.nth(i).innerText()).trim());
        }
        return texts;
    }

    async openDetailsForFirstRow(): Promise<void> {
        const row = this.recordRows.first();
        await expect(row).toBeVisible({ timeout: 20000 });

        const inRow = row.getByRole('button', { name: /view\s*details|details/i }).first();
        const hasInRow = await inRow.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
        await (hasInRow ? inRow : this.viewDetailsButton).click();

        await expect(this.detailsPanel).toBeVisible({ timeout: 15000 });
    }

    async releaseFirstRow(): Promise<void> {
        await expect(this.releaseButton).toBeVisible({ timeout: 15000 });
        await this.releaseButton.click();
        // EMI-6015: release must be confirmed, never fired straight off the click.
        await expect(this.confirmActionButton).toBeVisible({ timeout: 15000 });
        await this.confirmActionButton.click();
    }
}
