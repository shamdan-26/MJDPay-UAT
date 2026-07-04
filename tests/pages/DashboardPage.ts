import { type Page, type Locator } from '@playwright/test';
import { waitForToastClear } from '../shared';

export class DashboardPage {
    readonly page: Page;

    // ── Existing: Sidebar ────────────────────────────────────────────────────
    readonly logo: Locator;
    readonly navigation: Locator;
    readonly homeLink: Locator;
    readonly transactionsLink: Locator;
    readonly paymentsLink: Locator;
    readonly accountsPanel: Locator;
    readonly accountsSubmenu: Locator;
    readonly brandName: Locator;

    // ── Existing: Header ─────────────────────────────────────────────────────
    readonly profileTrigger: Locator;
    readonly notificationsIcon: Locator;

    // ── Existing: Dashboard widgets ──────────────────────────────────────────
    readonly lastTransactionsContainer: Locator;
    readonly walletBalanceSar: Locator;
    readonly balanceAmountText: Locator;
    readonly lastLoginText: Locator;

    // ── Existing: Profile menu ───────────────────────────────────────────────
    readonly logoutItem: Locator;
    readonly profileOrSettingsItem: Locator;
    readonly proceedButton: Locator;

    // ── Greeting section ─────────────────────────────────────────────────────
    readonly pageHeading: Locator;
    readonly greetingText: Locator;
    readonly greetingSubtitle: Locator;

    // ── Balance card ─────────────────────────────────────────────────────────
    readonly currentBalanceLabel: Locator;
    readonly balanceVisibilityToggle: Locator;
    readonly walletQrButton: Locator;
    readonly walletSettingsButton: Locator;

    // ── Quick actions ────────────────────────────────────────────────────────
    readonly quickActionsHeading: Locator;
    readonly quickActionsSubtitle: Locator;
    readonly quickActionTopupCard: Locator;
    readonly quickActionWalletTransferCard: Locator;
    readonly quickActionCashoutCard: Locator;
    readonly quickActionReceivePaymentCard: Locator;

    // ── Bills overview ───────────────────────────────────────────────────────
    readonly billsOverviewHeading: Locator;
    readonly billsChartToggle: Locator;
    readonly billsCardsToggle: Locator;
    readonly billsPaidLabel: Locator;
    readonly billsUnpaidLabel: Locator;
    readonly billsViewAllLink: Locator;

    // ── Sub-wallets panel ────────────────────────────────────────────────────
    readonly subWalletsHeading: Locator;
    readonly subWalletsManageLink: Locator;
    readonly subWalletsEmptyMessage: Locator;

    // ── Transactions section ─────────────────────────────────────────────────
    readonly transactionViewAllLink: Locator;
    readonly transactionTotalText: Locator;
    readonly transactionsEmptyState: Locator;
    readonly transactionsEmptyTitle: Locator;
    readonly transactionsEmptyDescription: Locator;

    // ── Sidebar extras ───────────────────────────────────────────────────────
    readonly topupSidebarLink: Locator;
    readonly transferSidebarItem: Locator;
    readonly billsSidebarLink: Locator;
    readonly paymentLinksLink: Locator;
    readonly subWalletsSidebarLink: Locator;
    readonly manageProductsLink: Locator;
    readonly groupsRolesLink: Locator;
    readonly cardManagementLink: Locator;

    constructor(page: Page) {
        this.page = page;

        // ── Existing locators ─────────────────────────────────────────────────
        this.logo             = page.locator('#sideNav-logo');
        this.navigation       = page.locator('nav, aside, [role="navigation"]').first();
        this.homeLink         = page.getByRole('link', { name: /^home$/i });
        this.transactionsLink = page.getByRole('link', { name: /transactions?/i });
        this.paymentsLink     = page.getByRole('link', { name: /payments?/i });
        this.accountsPanel    = page.locator('#sideNav-expansion-panel-text-8');
        this.accountsSubmenu  = page.locator('#cdk-accordion-child-1');
        this.brandName        = page.locator('#sideNav-sidenav #userSettings-brand-name');

        this.profileTrigger    = page.locator('#ddl_profile');
        this.notificationsIcon = page.locator('.dropdown-toggle.nav-link.ai-icon');

        this.lastTransactionsContainer = page.locator('#last-transactions-container');
        this.walletBalanceSar          = page.locator('#balance-container');
        this.balanceAmountText         = page.locator('#balance-amount');
        this.lastLoginText             = page.locator('section.mp-greet .meta').first();

        this.logoutItem = page.locator('#logout');
        this.profileOrSettingsItem = page.locator(
            '[id*="profile"], [id*="setting"], [href*="profile"], [href*="setting"]'
        ).first();
        this.proceedButton = page.getByRole('button', { name: 'proceed' });

        // ── Greeting ──────────────────────────────────────────────────────────
        this.pageHeading     = page.locator('#header-page-title.header-left.page-title');
        this.greetingText    = page.getByText(/good\s+(morning|afternoon|evening)/i).first();
        this.greetingSubtitle = page.getByText(/happening with your wallet today/i).first();

        // ── Balance card ──────────────────────────────────────────────────────
        this.currentBalanceLabel     = page.getByText(/current balance/i).first();
        this.balanceVisibilityToggle = page.locator('#balance-visibility-button');
        this.walletQrButton          = page.locator('#balance-generate-qr-text');
        this.walletSettingsButton    = page.getByRole('button', { name: /wallet\s*settings/i });

        // ── Quick actions ─────────────────────────────────────────────────────
        this.quickActionsHeading           = page.getByText('Quick actions').first();
        this.quickActionsSubtitle          = page.getByText('Shortcuts to common tasks').first();
        this.quickActionTopupCard          = page.getByText('Add money via card').first();
        this.quickActionWalletTransferCard = page.getByText('Send to another wallet').first();
        this.quickActionCashoutCard        = page.getByText('Send to any Saudi IBAN').first();
        this.quickActionReceivePaymentCard = page.getByText('Generate a wallet QR').first();

        // ── Bills overview ────────────────────────────────────────────────────
        this.billsOverviewHeading = page.getByText('Bills overview').first();
        this.billsChartToggle     = page.getByRole('button', { name: /^chart$/i });
        this.billsCardsToggle     = page.getByRole('button', { name: /^cards$/i });
        this.billsPaidLabel       = page.getByText(/^paid$/i).first();
        this.billsUnpaidLabel     = page.getByText(/^unpaid$/i).first();
        this.billsViewAllLink     = page.locator('button[type="button"].mp-bills__more').first();

        // ── Sub-wallets panel ─────────────────────────────────────────────────
        this.subWalletsHeading      = page.getByRole('heading', { name: /sub-wallets?/i }).first();
        this.subWalletsManageLink   = page.locator('button[type="button"].mp-panel-more').first();
        this.subWalletsEmptyMessage = page.getByText(/no sub-wallets yet/i);

        // ── Transactions ──────────────────────────────────────────────────────
        this.transactionViewAllLink       = page.locator('#view_all_transactions');
        this.transactionTotalText         = page.locator('#last-transactions-container').getByText(/\d+\s+total/i).first();
        this.transactionsEmptyState       = page.locator('#last-transactions-empty');
        this.transactionsEmptyTitle       = page.locator('.hc-lt-empty__ttl');
        this.transactionsEmptyDescription = page.locator('.hc-lt-empty__desc');

        // ── Sidebar extras (scoped to sidenav) ────────────────────────────────
        this.topupSidebarLink    = page.locator('#sideNav-sidenav').getByRole('link', { name: /^topup$/i }).first();
        this.transferSidebarItem = page.locator('#sideNav-sidenav').getByText('Transfer').first();
        this.billsSidebarLink    = page.locator('#sideNav-sidenav').getByRole('link', { name: /^bills$/i }).first();
        this.paymentLinksLink    = page.locator('#sideNav-sidenav').getByRole('link', { name: /payment\s*links/i }).first();
        this.subWalletsSidebarLink = page.locator('#sideNav-sidenav').getByRole('link', { name: /sub.wallets?/i }).first();
        this.manageProductsLink  = page.locator('#sideNav-sidenav').getByRole('link', { name: /manage\s*products/i }).first();
        this.groupsRolesLink     = page.locator('#sideNav-sidenav').getByRole('link', { name: /groups.*roles/i }).first();
        this.cardManagementLink  = page.locator('#sideNav-sidenav').getByRole('link', { name: /card\s*management/i }).first();
    }

    async waitForLoad(urlPattern: RegExp): Promise<void> {
        await this.page.waitForURL(urlPattern, { timeout: 30000 });
        await waitForToastClear(this.page);
    }

    async openProfileMenu(): Promise<void> {
        await this.profileTrigger.click();
        await this.logoutItem.waitFor({ state: 'visible' });
    }

    async logout(): Promise<void> {
        await this.openProfileMenu();
        await this.logoutItem.click();
        await this.proceedButton.click();
    }
}
