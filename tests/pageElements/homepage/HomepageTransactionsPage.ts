import { type Page, type Locator } from '@playwright/test';

export class HomepageTransactionsPage {
    readonly page: Page;

    readonly transactionViewAllLink: Locator;
    readonly transactionTotalText: Locator;
    readonly transactionsEmptyState: Locator;
    readonly transactionsEmptyTitle: Locator;
    readonly transactionsEmptyDescription: Locator;

    /** ngx-datatable renders rows as <datatable-body-row>, not semantic <tr>. */
    readonly transactionRows: Locator;
    /** ngx-datatable renders column headers as <datatable-header-cell>, not <thead>/<tr>. */
    readonly transactionHeaderCells: Locator;

    constructor(page: Page) {
        this.page = page;

        this.transactionViewAllLink       = page.locator('#view_all_transactions');
        this.transactionTotalText         = page.locator('#last-transactions-container').getByText(/\d+\s+total/i).first();
        this.transactionsEmptyState       = page.locator('#last-transactions-empty');
        this.transactionsEmptyTitle       = page.locator('.hc-lt-empty__ttl');
        this.transactionsEmptyDescription = page.locator('.hc-lt-empty__desc');

        this.transactionRows        = page.locator('#last-transactions-container datatable-body-row');
        this.transactionHeaderCells = page.locator('#last-transactions-container datatable-header-cell');
    }
}
