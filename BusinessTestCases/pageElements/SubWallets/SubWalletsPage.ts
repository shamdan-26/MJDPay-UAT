import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Sub-Wallets root management screen (EMI-5185). Distinct from
 * Homepage/HomepageSubWalletsPage.ts, which only models the small dashboard
 * panel that links here.
 *
 * Sub-wallets has no data-testids yet per QA-DATA-TESTID-HANDOFF.md, so every
 * locator below is a best-effort role/text guess — verify on the first live run.
 */
export class SubWalletsPage {
    readonly page: Page;

    readonly heading: Locator;
    readonly createButton: Locator;
    readonly rows: Locator;
    readonly emptyMessage: Locator;
    readonly loadingIndicator: Locator;
    readonly errorMessage: Locator;

    constructor(page: Page) {
        this.page = page;

        this.heading          = page.getByRole('heading', { name: /sub[\s-]?wallets?/i }).first();
        this.createButton     = page.getByRole('button', { name: /create|add|new/i }).first();
        this.rows             = page.locator('table tbody tr, [class*="wallet-card"], [class*="wallet-item"]');
        this.emptyMessage     = page.getByText(/no sub-?wallets?( yet)?/i).first();
        this.loadingIndicator = page.locator('mat-spinner, [class*="spinner"], [class*="loading"]').first();
        this.errorMessage     = page.getByText(/internal server error|something went wrong|500/i).first();
    }

    rowByName(name: string): Locator {
        return this.rows.filter({ hasText: name }).first();
    }

    async openByName(name: string): Promise<void> {
        await this.rowByName(name).click();
    }

    async waitForList(): Promise<void> {
        await expect(this.rows.first().or(this.emptyMessage)).toBeVisible({ timeout: 15000 });
    }
}
