import { type Page, type Locator } from '@playwright/test';

/**
 * Cross-suite page object for the authenticated app shell (sidebar chrome,
 * header icons, profile menu, generic post-login widgets). Consumed by both
 * the login suite (post-login landing checks) and the homepage suite, which
 * layers homepage-only widgets on top via tests/pageElements/homepage/*.
 */
export class DashboardPage {
    readonly page: Page;

    // ── Sidebar ──────────────────────────────────────────────────────────────
    readonly logo: Locator;
    readonly navigation: Locator;
    readonly homeLink: Locator;
    readonly transactionsLink: Locator;
    readonly paymentsLink: Locator;
    readonly brandName: Locator;

    // ── Header ───────────────────────────────────────────────────────────────
    readonly profileTrigger: Locator;
    readonly notificationsIcon: Locator;

    // ── Dashboard widgets ────────────────────────────────────────────────────
    readonly lastTransactionsContainer: Locator;
    readonly walletBalanceSar: Locator;
    readonly lastLoginText: Locator;

    // ── Profile menu ─────────────────────────────────────────────────────────
    readonly logoutItem: Locator;
    readonly proceedButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logo             = page.locator('#sideNav-logo');
        this.navigation       = page.locator('nav, aside, [role="navigation"]').first();
        this.homeLink         = page.getByRole('link', { name: /^home$/i });
        this.transactionsLink = page.getByRole('link', { name: /transactions?/i });
        this.paymentsLink     = page.getByRole('link', { name: /payments?/i });
        this.brandName        = page.locator('#sideNav-sidenav #userSettings-brand-name');

        this.profileTrigger    = page.locator('#ddl_profile');
        this.notificationsIcon = page.locator('.dropdown-toggle.nav-link.ai-icon');

        this.lastTransactionsContainer = page.locator('#last-transactions-container');
        this.walletBalanceSar          = page.locator('#balance-container');
        this.lastLoginText             = page.locator('section.mp-greet .meta').first();

        this.logoutItem    = page.locator('#logout');
        this.proceedButton = page.getByRole('button', { name: 'proceed' });
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
