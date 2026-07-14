import { type Page, type Locator } from '@playwright/test';

export class HomepageBalanceCardPage {
    readonly page: Page;

    readonly currentBalanceLabel: Locator;
    readonly balanceVisibilityToggle: Locator;
    readonly walletQrButton: Locator;
    readonly walletSettingsButton: Locator;
    readonly balanceAmountText: Locator;

    constructor(page: Page) {
        this.page = page;

        this.currentBalanceLabel     = page.getByText(/current balance/i).first();
        this.balanceVisibilityToggle = page.locator('#balance-visibility-button');
        this.walletQrButton          = page.locator('#balance-generate-qr-text');
        this.walletSettingsButton    = page.getByRole('button', { name: /wallet\s*settings/i });
        this.balanceAmountText       = page.locator('#balance-amount');
    }
}
