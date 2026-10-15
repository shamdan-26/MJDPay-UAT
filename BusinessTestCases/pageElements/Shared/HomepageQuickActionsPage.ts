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

        // Bilingual: dev/UAT loads the homepage in Arabic by default (same
        // reason LoginPage.ts's locators are bilingual) — English-only text
        // locators here waited out their full timeout and failed every time.
        this.quickActionsHeading           = page.getByText('Quick actions').or(page.getByText('إجراءات سريعة')).first();
        this.quickActionsSubtitle          = page.getByText('Shortcuts to common tasks').or(page.getByText('اختصار للمهام الشائعة')).first();
        this.quickActionTopupCard          = page.getByText('Add money via card').or(page.getByText('إضافة أموال عبر بطاقة')).first();
        this.quickActionWalletTransferCard = page.getByText('Send to another wallet').or(page.getByText('الإرسال إلى محفظة أخرى')).first();
        this.quickActionCashoutCard        = page.getByText('Send to any Saudi IBAN').or(page.getByText('الإرسال إلى أي آيبان سعودي')).first();
        this.quickActionReceivePaymentCard = page.getByText('Generate a wallet QR').or(page.getByText('إنشاء رمز QR للمحفظة')).first();

        this.actionDialog = page.locator('[role="dialog"], mat-dialog-container, [class*="qr"]').first();
    }
}
