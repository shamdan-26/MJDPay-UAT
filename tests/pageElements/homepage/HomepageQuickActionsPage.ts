import { type Page, type Locator } from '@playwright/test';

export class HomepageQuickActionsPage {
    readonly page: Page;

    readonly quickActionsHeading: Locator;
    readonly quickActionsSubtitle: Locator;
    readonly quickActionTopupCard: Locator;
    readonly quickActionWalletTransferCard: Locator;
    readonly quickActionCashoutCard: Locator;
    readonly quickActionReceivePaymentCard: Locator;

    /** Any dialog/modal a quick-action card can open (generic dialog, Angular Material dialog, or a QR-styled panel). */
    readonly actionDialog: Locator;

    constructor(page: Page) {
        this.page = page;

        this.quickActionsHeading           = page.getByText('Quick actions').first();
        this.quickActionsSubtitle          = page.getByText('Shortcuts to common tasks').first();
        this.quickActionTopupCard          = page.getByText('Add money via card').first();
        this.quickActionWalletTransferCard = page.getByText('Send to another wallet').first();
        this.quickActionCashoutCard        = page.getByText('Send to any Saudi IBAN').first();
        this.quickActionReceivePaymentCard = page.getByText('Generate a wallet QR').first();

        this.actionDialog = page.locator('[role="dialog"], mat-dialog-container, [class*="qr"]').first();
    }
}
