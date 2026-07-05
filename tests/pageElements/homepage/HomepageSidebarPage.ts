import { type Page, type Locator } from '@playwright/test';

export class HomepageSidebarPage {
    readonly page: Page;

    readonly accountsPanel: Locator;
    readonly accountsSubmenu: Locator;
    readonly topupSidebarLink: Locator;
    readonly transferSidebarItem: Locator;
    readonly cashoutSidebarLink: Locator;
    readonly walletTransferSidebarLink: Locator;
    readonly billsSidebarLink: Locator;
    readonly paymentLinksLink: Locator;
    readonly subWalletsSidebarLink: Locator;
    readonly manageProductsLink: Locator;
    readonly groupsRolesLink: Locator;
    readonly cardManagementLink: Locator;

    constructor(page: Page) {
        this.page = page;

        this.accountsPanel   = page.locator('#sideNav-expansion-panel-text-8');
        this.accountsSubmenu = page.locator('#cdk-accordion-child-1');

        this.topupSidebarLink          = page.locator('#sideNav-sidenav').getByRole('link', { name: /^topup$/i }).first();
        this.transferSidebarItem       = page.locator('#sideNav-sidenav').getByText('Transfer').first();
        this.cashoutSidebarLink        = page.locator('#sideNav-sidenav').getByRole('link', { name: /^cashout$/i });
        this.walletTransferSidebarLink = page.locator('#sideNav-sidenav').getByRole('link', { name: /wallet\s*transfer/i });
        this.billsSidebarLink          = page.locator('#sideNav-sidenav').getByRole('link', { name: /^bills$/i }).first();
        this.paymentLinksLink          = page.locator('#sideNav-sidenav').getByRole('link', { name: /payment\s*links/i }).first();
        this.subWalletsSidebarLink     = page.locator('#sideNav-sidenav').getByRole('link', { name: /sub.wallets?/i }).first();
        this.manageProductsLink        = page.locator('#sideNav-sidenav').getByRole('link', { name: /manage\s*products/i }).first();
        this.groupsRolesLink           = page.locator('#sideNav-sidenav').getByRole('link', { name: /groups.*roles/i }).first();
        this.cardManagementLink        = page.locator('#sideNav-sidenav').getByRole('link', { name: /card\s*management/i }).first();
    }
}
