import { type Page, type Locator } from '@playwright/test';

export class HomepageSubWalletsPage {
    readonly page: Page;

    readonly subWalletsHeading: Locator;
    readonly subWalletsManageLink: Locator;
    readonly subWalletsEmptyMessage: Locator;

    constructor(page: Page) {
        this.page = page;

        this.subWalletsHeading      = page.getByRole('heading', { name: /sub-wallets?/i }).first();
        this.subWalletsManageLink   = page.locator('button[type="button"].mp-panel-more').first();
        this.subWalletsEmptyMessage = page.getByText(/no sub-wallets yet/i);
    }
}
