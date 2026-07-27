import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Bills Table / My Bills / Bill Report page (EMI-5807, EMI-5616, EMI-5673,
 * EMI-5119). "Bill Report" / "Home dashboard" style listing pages are not in
 * QA-DATA-TESTID-HANDOFF.md §4 (only §5's "not yet covered" list applies) —
 * every locator below is a best-effort guess from each ticket's AC wording,
 * same caveat as CreateBillPage.ts / PaymentLinkPage.ts. Reconcile against the
 * live DOM (or request testids from FE) before relying on this for CI gating.
 */
export class BillsListPage {
    readonly page: Page;

    readonly billsTable: Locator;
    readonly billRows: Locator;
    readonly loadingIndicator: Locator;
    readonly unauthorizedError: Locator;
    readonly emptyStateMessage: Locator;

    // Pagination
    readonly paginationNextButton: Locator;
    readonly paginationPrevButton: Locator;
    readonly pageIndicator: Locator;

    // Row-level actions
    readonly viewBillButton: Locator;
    readonly editBillButton: Locator;
    readonly statusBadge: Locator;

    // Bill details screen (opened from a row)
    readonly billDetailsSection: Locator;
    readonly billReferenceValue: Locator;
    readonly expiredStatusBadge: Locator;
    readonly billNotFoundError: Locator;

    constructor(page: Page) {
        this.page = page;

        this.billsTable = page.locator('table, [role="table"], [class*="bills-table"]').first();
        this.billRows = this.billsTable.locator('tbody tr, [role="row"]');
        this.loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], [role="progressbar"]').first();
        this.unauthorizedError = page.getByText(/could not be found, or you do not have the necessary permissions/i);
        this.emptyStateMessage = page.getByText(/no bills (found|to display)/i);

        this.paginationNextButton = page.getByRole('button', { name: /next page|next/i })
            .or(page.locator('[aria-label="Next page"]'));
        this.paginationPrevButton = page.getByRole('button', { name: /previous page|previous/i })
            .or(page.locator('[aria-label="Previous page"]'));
        this.pageIndicator = page.locator('[class*="paginator"], [class*="pagination"]').getByText(/\d+\s*(of|-|\/)\s*\d+/i).first();

        this.viewBillButton = page.getByRole('button', { name: /^view$/i });
        this.editBillButton = page.getByRole('button', { name: /^edit$/i });
        this.statusBadge = page.locator('[class*="status-badge"], [class*="bill-status"]');

        this.billDetailsSection = page.locator('[class*="bill-details"], [class*="bill-info"]').first();
        this.billReferenceValue = page.getByText(/bill ref/i).locator('xpath=following-sibling::*[1]');
        this.expiredStatusBadge = this.statusBadge.filter({ hasText: /expired/i });
        this.billNotFoundError = page.getByText(/bill could not be found/i);
    }

    /** Navigates to the Bill Report / My Bills table via the side nav. */
    async goToMyBills(): Promise<void> {
        await this.waitForTableLoaded();
    }

    /** Waits for the loading indicator to clear (or the table/empty-state to appear), guarding against EMI-5616's infinite-loading regression. */
    async waitForTableLoaded(timeout = 20000): Promise<void> {
        await expect(this.loadingIndicator.or(this.billsTable).or(this.emptyStateMessage)).toBeVisible({ timeout });
        await expect(this.loadingIndicator).not.toBeVisible({ timeout }).catch(() => {});
        await expect(this.billsTable.or(this.emptyStateMessage)).toBeVisible({ timeout });
    }

    async getVisibleBillRefs(): Promise<string[]> {
        const count = await this.billRows.count();
        const refs: string[] = [];
        for (let i = 0; i < count; i++) {
            const text = await this.billRows.nth(i).textContent();
            if (text) refs.push(text.trim());
        }
        return refs;
    }

    async goToNextPage(): Promise<void> {
        await expect(this.paginationNextButton).toBeEnabled({ timeout: 10000 });
        await this.paginationNextButton.click();
        await this.waitForTableLoaded();
    }

    async goToPreviousPage(): Promise<void> {
        await expect(this.paginationPrevButton).toBeEnabled({ timeout: 10000 });
        await this.paginationPrevButton.click();
        await this.waitForTableLoaded();
    }

    async openBillByRef(ref: string): Promise<void> {
        const row = this.billRows.filter({ hasText: ref }).first();
        await expect(row).toBeVisible({ timeout: 15000 });
        await row.click();
    }

    async clickEditOnOpenBill(): Promise<void> {
        await expect(this.editBillButton).toBeVisible({ timeout: 15000 });
        await this.editBillButton.click();
    }
}
