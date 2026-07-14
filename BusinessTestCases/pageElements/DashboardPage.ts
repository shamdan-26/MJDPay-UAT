import { type Page, type Locator } from '@playwright/test';

/**
 * Cross-suite page object for the authenticated app shell (sidebar chrome,
 * header icons, profile menu, generic post-login widgets). Consumed by both
 * the login suite (post-login landing checks) and the homepage suite, which
 * layers homepage-only widgets on top via tests/pageElements/*.
 */
export class DashboardPage {
    readonly page: Page;

    // ── Sidebar ──────────────────────────────────────────────────────────────
    readonly logo: Locator;
    readonly logoImages: Locator;
    readonly navigation: Locator;
    readonly homeLink: Locator;
    readonly transactionsLink: Locator;
    readonly paymentsLink: Locator;
    readonly brandName: Locator;

    // ── Account widget (bottom of sidebar) ──────────────────────────────────
    readonly accountWidgetAvatar: Locator;
    readonly accountWidgetSignOutButton: Locator;

    // ── Top navigation bar ───────────────────────────────────────────────────
    readonly menuToggleButton: Locator;
    readonly topNavTitle: Locator;

    // ── Header ───────────────────────────────────────────────────────────────
    readonly profileTrigger: Locator;
    readonly notificationsIcon: Locator;

    // ── Dashboard widgets ────────────────────────────────────────────────────
    readonly lastTransactionsContainer: Locator;
    readonly walletBalanceSar: Locator;
    readonly lastLoginText: Locator;

    // ── Profile menu (dropdown opened via profileTrigger) ───────────────────
    readonly profileMenuInitials: Locator;
    readonly profileMenuCompanyName: Locator;
    readonly profileMenuEmail: Locator;
    readonly profileMenuPhone: Locator;
    readonly settingsMenuItem: Locator;
    readonly profileMenuItem: Locator;
    readonly notificationsToggle: Locator;
    readonly darkModeToggle: Locator;
    readonly languageSelector: Locator;
    readonly walletConfigurationMenuItem: Locator;
    readonly faqsMenuItem: Locator;
    readonly logoutItem: Locator;
    readonly proceedButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logo             = page.locator('#sideNav-logo');
        this.logoImages       = page.locator('#sideNav-logo-menu, .logo-menu');
        this.navigation       = page.locator('nav, aside, [role="navigation"]').first();
        this.homeLink         = page.getByRole('link', { name: /^home$/i });
        this.transactionsLink = page.getByRole('link', { name: /transactions?/i });
        this.paymentsLink     = page.getByRole('link', { name: /payments?/i });
        this.brandName        = page.locator('#sideNav-sidenav #userSettings-brand-name');

        this.accountWidgetAvatar      = page.locator('#sideNav-sidenav #userSettings-image-container');
        this.accountWidgetSignOutButton = page.locator('#sideNav-sidenav').getByText(/sign out/i).first();

        this.menuToggleButton = page.locator('button[aria-label*="menu" i], button[aria-label*="toggle" i]').first();
        this.topNavTitle      = page.locator('.mp-topbar h1, header h1').first();

        this.profileTrigger    = page.locator('#ddl_profile');
        this.notificationsIcon = page.locator('.dropdown-toggle.nav-link.ai-icon');

        this.lastTransactionsContainer = page.locator('#last-transactions-container');
        this.walletBalanceSar          = page.locator('#balance-container');
        this.lastLoginText             = page.locator('section.mp-greet .meta').first();

        // Scoped to the dropdown panel opened by profileTrigger so these don't
        // collide with the same-looking account widget in the sidebar.
        const profileMenuPanel = page.locator('.mat-menu-panel, .dropdown-menu, [role="menu"]').first();
        this.profileMenuInitials    = profileMenuPanel.locator('#userSettings-image-container').or(profileMenuPanel.locator('[class*="avatar" i], [class*="initial" i]')).first();
        this.profileMenuCompanyName = profileMenuPanel.locator('#userSettings-brand-name').or(profileMenuPanel.getByText(/شركة/)).first();
        this.profileMenuEmail       = profileMenuPanel.getByText(/@/).first();
        this.profileMenuPhone       = profileMenuPanel.getByText(/\+?\d[\d\s]{7,}/).first();
        this.settingsMenuItem       = profileMenuPanel.getByText(/^settings$/i).or(profileMenuPanel.getByRole('menuitem', { name: /settings/i })).first();
        this.profileMenuItem        = profileMenuPanel.getByText(/^profile$/i).or(profileMenuPanel.getByRole('menuitem', { name: /^profile$/i })).first();
        this.notificationsToggle    = profileMenuPanel.filter({ hasText: /notifications/i }).locator('input[type="checkbox"]').first();
        this.darkModeToggle         = profileMenuPanel.filter({ hasText: /dark mode/i }).locator('input[type="checkbox"]').first();
        this.languageSelector       = profileMenuPanel.getByText(/^ENG$/).or(profileMenuPanel.getByText(/language/i)).first();
        this.walletConfigurationMenuItem = profileMenuPanel.getByText(/wallet configuration/i).first();
        this.faqsMenuItem           = profileMenuPanel.getByText(/faqs?/i).first();
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
