import { type Page, type Locator } from '@playwright/test';
import { waitForToastClear } from '../shared';

export class DashboardPage {
    readonly page: Page;

    // Sidebar
    readonly logo: Locator;
    readonly navigation: Locator;
    readonly homeLink: Locator;
    readonly transactionsLink: Locator;
    readonly paymentsLink: Locator;
    readonly accountsPanel: Locator;
    readonly accountsSubmenu: Locator;
    readonly brandName: Locator;

    // Header
    readonly profileTrigger: Locator;
    readonly notificationsIcon: Locator;

    // Dashboard widgets
    readonly lastTransactionsContainer: Locator;
    readonly walletBalanceSar: Locator;
    readonly lastLoginText: Locator;

    // Profile menu items
    readonly logoutItem: Locator;
    readonly profileOrSettingsItem: Locator;

    // Logout confirmation
    readonly proceedButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logo          = page.locator('#sideNav-logo');
        this.navigation    = page.locator('nav, aside, [role="navigation"]').first();
        this.homeLink      = page.getByRole('link', { name: /^home$/i });
        this.transactionsLink = page.getByRole('link', { name: /transactions?/i });
        this.paymentsLink  = page.getByRole('link', { name: /payments?/i });
        this.accountsPanel = page.locator('#sideNav-expansion-panel-text-8');
        this.accountsSubmenu = page.locator('#cdk-accordion-child-1');
        this.brandName     = page.locator('#sideNav-sidenav #userSettings-brand-name');

        this.profileTrigger    = page.locator('#ddl_profile');
        this.notificationsIcon = page.locator('.dropdown-toggle.nav-link.ai-icon');

        this.lastTransactionsContainer = page.locator('#last-transactions-container');
        this.walletBalanceSar = page.getByText(/SAR|ر\.س/i).first();
        this.lastLoginText    = page.getByText(/last.?login/i).first();

        this.logoutItem = page.locator('#logout');
        this.profileOrSettingsItem = page.locator(
            '[id*="profile"], [id*="setting"], [href*="profile"], [href*="setting"]'
        ).first();

        this.proceedButton = page.getByRole('button', { name: 'proceed' });
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
