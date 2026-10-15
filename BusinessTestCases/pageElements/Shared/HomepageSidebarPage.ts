import { type Page, type Locator } from '@playwright/test';

export class HomepageSidebarPage {
    readonly page: Page;

    readonly accountsPanel: Locator;
    readonly accountsSubmenu: Locator;
    readonly moneySectionLabel: Locator;
    readonly manageSectionLabel: Locator;
    readonly topupSidebarLink: Locator;
    readonly transferSidebarItem: Locator;
    readonly cashoutSidebarLink: Locator;
    readonly walletTransferSidebarLink: Locator;
    readonly internationalTransferSidebarLink: Locator;
    readonly billsSidebarLink: Locator;
    readonly paymentLinksLink: Locator;
    readonly subWalletsSidebarLink: Locator;
    readonly sadadSidebarLink: Locator;
    readonly manageUsersSidebarLink: Locator;
    readonly manageBeneficiarySidebarLink: Locator;
    readonly manageProductsLink: Locator;
    readonly groupsRolesLink: Locator;
    readonly cardManagementLink: Locator;

    constructor(page: Page) {
        this.page = page;

        this.accountsPanel   = page.locator('#sideNav-expansion-panel-text-8');
        this.accountsSubmenu = page.locator('#cdk-accordion-child-1');

        // Bilingual: dev/UAT loads the sidebar in Arabic by default (same
        // reason DashboardPage.ts's nav links match on href elsewhere) — every
        // section label and link name below is localized rather than a
        // transliteration of the English. Arabic copy confirmed against a
        // live dev run on 2026-09-14 (account "ش ا" / MER-Q9EK4TTPGE-30):
        // money section "الأموال", manage section "إدارة", Transfer "تحويل",
        // Cashout "سحب الأموال" (/transfer/bank-transfer), Wallet Transfer
        // "حوالة المحفظة" (/transfer/wallet-to-wallet-transfer), International
        // Transfer "التحويل الدولي", Bills "الفواتير", Payment Links "روابط
        // الدفع", Sub-wallets "المحافظ الفرعية", SADAD "سداد", Manage Users
        // "إدارة المستخدمين" (/user-management), Manage Beneficiary "إدارة
        // المستفيدين" (/beneficiary), Manage Products "بنود الفاتورة"
        // (/products-management — the app's own Arabic label for this route
        // literally reads "Bill Items", not a translation of "Products"),
        // Groups & Roles "المجموعات والأدوار", Card Management "إدارة البطاقة".
        this.moneySectionLabel  = page.locator('#sideNav-sidenav').getByText(/^\s*(money|الأموال)\s*$/i).first();
        this.manageSectionLabel = page.locator('#sideNav-sidenav').getByText(/^\s*(manage|إدارة)\s*$/i).first();

        this.topupSidebarLink          = page.locator('#sideNav-sidenav').getByRole('link', { name: /^topup$|إضافة الأموال/i }).first();
        this.transferSidebarItem       = page.locator('#sideNav-sidenav').getByText(/^\s*(transfer|تحويل)\s*$/i).first();
        this.cashoutSidebarLink        = page.locator('#sideNav-sidenav').getByRole('link', { name: /^\s*(cashout|سحب الأموال)\s*$/i });
        this.walletTransferSidebarLink = page.locator('#sideNav-sidenav').getByRole('link', { name: /wallet\s*transfer|حوالة المحفظة/i });
        // Placeholder sub-link, not yet navigable — no <a> role, so match on text
        // instead of getByRole('link'). The "Soon"/"قريباً" badge (.sb-soon) is a
        // sibling span next to the label text, not nested inside it, so the
        // locator is scoped to their shared `.entry` wrapper rather than just
        // the label span — otherwise toContainText(/soon/i) can never see the
        // badge. Confirmed against a live dev run on 2026-09-14.
        this.internationalTransferSidebarLink = page.locator('#sideNav-sidenav .entry')
            .filter({ hasText: /international\s*transfer|التحويل الدولي/i }).first();
        this.billsSidebarLink          = page.locator('#sideNav-sidenav').getByRole('link', { name: /^\s*(bills|الفواتير)\s*$/i }).first();
        this.paymentLinksLink          = page.locator('#sideNav-sidenav').getByRole('link', { name: /payment\s*links|روابط الدفع/i }).first();
        this.subWalletsSidebarLink     = page.locator('#sideNav-sidenav').getByRole('link', { name: /sub.wallets?|المحافظ الفرعية/i }).first();
        // Placeholder top-level item, not yet navigable — no <a> role, so match on
        // text instead of getByRole('link'). Same .entry-wrapper reasoning as
        // internationalTransferSidebarLink above — the "Soon"/"قريباً" badge is a
        // sibling span, not nested inside the "SADAD"/"سداد" label span.
        this.sadadSidebarLink          = page.locator('#sideNav-sidenav .entry')
            .filter({ hasText: /sadad|سداد/i }).first();
        this.manageUsersSidebarLink        = page.locator('#sideNav-sidenav').getByRole('link', { name: /manage\s*users|إدارة المستخدمين/i }).first();
        this.manageBeneficiarySidebarLink  = page.locator('#sideNav-sidenav').getByRole('link', { name: /manage\s*beneficiar(y|ies)|إدارة المستفيدين/i }).first();
        this.manageProductsLink        = page.locator('#sideNav-sidenav').getByRole('link', { name: /manage\s*products|بنود الفاتورة/i }).first();
        this.groupsRolesLink           = page.locator('#sideNav-sidenav').getByRole('link', { name: /groups.*roles|المجموعات والأدوار/i }).first();
        this.cardManagementLink        = page.locator('#sideNav-sidenav').getByRole('link', { name: /card\s*management|إدارة البطاقة/i }).first();
    }
}
