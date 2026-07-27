import { type Page, type Locator } from '@playwright/test';

/**
 * Sub-wallet detail screen (EMI-5185): Wallet Info tab (read-only, with Close
 * and Edit actions) and a Sub-Wallets tab holding nested children. Per the
 * ticket the header actions swap to a single Create button while the nested tab
 * is active, and a "Back to Main Sub-Wallet" button appears once nesting depth
 * exceeds one. Same untagged-locator caveat as SubWalletsPage.ts.
 */
export class SubWalletDetailsPage {
    readonly page: Page;

    readonly walletInfoTab: Locator;
    readonly subWalletsTab: Locator;

    readonly editButton: Locator;
    readonly closeButton: Locator;
    readonly createNestedButton: Locator;
    readonly backToMainButton: Locator;

    readonly detailsPanel: Locator;
    readonly nestedRows: Locator;
    readonly statusBadge: Locator;

    readonly closeConfirmModal: Locator;
    readonly closeConfirmButton: Locator;
    readonly closeBlockedError: Locator;

    constructor(page: Page) {
        this.page = page;

        this.walletInfoTab = page.getByRole('tab', { name: /wallet info/i }).first();
        this.subWalletsTab = page.getByRole('tab', { name: /sub[\s-]?wallets?/i }).first();

        this.editButton         = page.getByRole('button', { name: /edit/i }).first();
        this.closeButton        = page.getByRole('button', { name: /^close$/i }).first();
        this.createNestedButton = page.getByRole('button', { name: /create|add/i }).first();
        this.backToMainButton   = page.getByRole('button', { name: /back to main sub[\s-]?wallet/i }).first();

        this.detailsPanel = page.locator('[class*="wallet-details"], [class*="detail-panel"]').first();
        this.nestedRows   = page.locator('table tbody tr, [class*="wallet-card"], [class*="wallet-item"]');
        this.statusBadge  = page.locator('[class*="badge"], [class*="status"]').first();

        this.closeConfirmModal  = page.locator('mat-dialog-container, [role="dialog"]').first();
        this.closeConfirmButton = this.closeConfirmModal.getByRole('button', { name: /confirm|yes|close/i }).first();
        this.closeBlockedError  = page.getByText(/pending transactions?|cannot be closed|not closable/i).first();
    }

    async openSubWalletsTab(): Promise<void> {
        await this.subWalletsTab.click();
    }

    async openNestedByName(name: string): Promise<void> {
        await this.nestedRows.filter({ hasText: name }).first().click();
    }

    async confirmClose(): Promise<void> {
        await this.closeButton.click();
        await this.closeConfirmButton.click();
    }
}
