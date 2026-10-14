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
    readonly visibleLogoImage: Locator;
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
    readonly englishToggle: Locator;
    readonly arabicToggle: Locator;
    readonly switchLanguageConfirmButton: Locator;
    readonly walletConfigurationMenuItem: Locator;
    readonly faqsMenuItem: Locator;
    readonly logoutItem: Locator;
    readonly proceedButton: Locator;
    readonly profileMenuPanel: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logo             = page.locator('#sideNav-logo');
        // #sideNav-logo-menu / .logo-menu is the wrapping <div> (1 element); the
        // two MajdPay logos (light/dark theme variants) are the <img>s inside it.
        this.logoImages       = page.locator('#sideNav-logo-menu img, .logo-menu img');
        // Only the variant matching the account's active theme is actually
        // rendered (the other is display:none via CSS) — dark mode is on by
        // default on dev/UAT, so `.first()` on logoImages (DOM order: light,
        // then dark) is not reliably the visible one. Confirmed against a
        // live dev run on 2026-09-14.
        this.visibleLogoImage = page.locator('#sideNav-logo-menu img:visible, .logo-menu img:visible').first();
        this.navigation       = page.locator('nav, aside, [role="navigation"]').first();
        // Match on the route href, not the visible link text — the sidebar
        // renders in the account's language (Arabic on UAT/dev by default).
        // .first() guards against the responsive/duplicate nav.
        this.homeLink         = page.locator('a[href$="/business/main/home"]').first();
        this.transactionsLink = page.locator('a[href$="/business/main/transactions"]').first();
        this.paymentsLink     = page.locator('a[href*="/business/main/payment-links"]').first();
        this.brandName        = page.locator('#sideNav-sidenav #userSettings-brand-name');

        this.accountWidgetAvatar      = page.locator('#sideNav-sidenav #userSettings-image-container');
        // Bilingual: dev/UAT loads the sidebar in Arabic by default (same
        // reason HomepageSidebarPage.ts's nav links are bilingual) — the
        // accessible name is "تسجيل الخروج". The button has only an icon
        // child (no visible text node), so the name comes from an
        // aria-label — getByRole (not getByText) is required to see it.
        // Confirmed against a live dev run on 2026-09-14.
        this.accountWidgetSignOutButton = page.locator('#sideNav-sidenav').getByRole('button', { name: /sign out|تسجيل الخروج/i }).first();

        // The sidenav's collapse/expand control is a <div id="sideNav-toggle-button">
        // wrapping an svg icon, not a <button> with an aria-label — confirmed
        // against a live dev run on 2026-09-14. Kept as a fallback in case a
        // future build renders it as an actual aria-labelled button.
        this.menuToggleButton = page.locator('#sideNav-toggle-button')
            .or(page.locator('button[aria-label*="menu" i], button[aria-label*="toggle" i]')).first();
        // The actual top-bar title element is <div id="header-page-title"> inside
        // #header-navbar/#header-container — the app has no .mp-topbar/header h1
        // at all. Confirmed against a live dev run on 2026-09-14.
        this.topNavTitle      = page.locator('#header-page-title')
            .or(page.locator('.mp-topbar h1, header h1')).first();

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
        // Bilingual + id-scoped: dev/UAT renders this panel in Arabic by default
        // (same reason DashboardPage's other widgets are bilingual), and the two
        // toggle rows (#toggle-button-input) share a duplicate id across the
        // panel, so a bare id selector is ambiguous — each is scoped to its own
        // #userSettings-*-toggle wrapper instead. Confirmed against a live dev
        // run on 2026-09-14: settings header "الإعدادات", profile item "الملف
        // الشخصي", wallet configuration "تهيئة المحفظة". No "FAQs" row was
        // rendered in this panel at all in that run (not a translation issue —
        // the element is simply absent from the DOM), so faqsMenuItem is left
        // as its original English-only best-effort locator.
        this.settingsMenuItem       = profileMenuPanel.locator('.settingsHeader')
            .or(profileMenuPanel.getByText(/^settings$/i))
            .or(profileMenuPanel.getByRole('menuitem', { name: /settings/i })).first();
        this.profileMenuItem        = profileMenuPanel.locator('#userSettings-profile-text')
            .or(profileMenuPanel.getByText(/^profile$/i))
            .or(profileMenuPanel.getByRole('menuitem', { name: /^profile$/i })).first();
        // Match the visible <app-toggle-button> wrapper, not its native
        // <input type="checkbox"> — the input is visually hidden behind the
        // styled knob (same pattern as BankTransferPage's useFullBalanceToggle),
        // so .toBeVisible() on the input itself always fails. Confirmed against
        // a live dev run on 2026-09-14.
        this.notificationsToggle    = profileMenuPanel.locator('#userSettings-notifications-toggle')
            .or(profileMenuPanel.filter({ hasText: /notifications/i }).locator('input[type="checkbox"]')).first();
        this.darkModeToggle         = profileMenuPanel.locator('#userSettings-dark-mode-toggle')
            .or(profileMenuPanel.filter({ hasText: /dark mode/i }).locator('input[type="checkbox"]')).first();
        this.languageSelector       = profileMenuPanel.locator('#userSettings-language-default')
            .or(profileMenuPanel.getByText(/^ENG$/))
            .or(profileMenuPanel.getByText(/language/i)).first();
        this.englishToggle              = page.getByTestId('lang-en');
        this.arabicToggle               = page.getByTestId('lang-ar');
        this.switchLanguageConfirmButton = page.getByTestId('switch-language-submit-btn');
        this.walletConfigurationMenuItem = profileMenuPanel.locator('#userSettings-wallet-config-text')
            .or(profileMenuPanel.getByText(/wallet configuration/i)).first();
        this.faqsMenuItem           = profileMenuPanel.getByText(/faqs?/i).first();
        // #logout is NOT this row — it's the id of the sidebar's own persistent
        // sign-out button (same element as accountWidgetSignOutButton), which
        // stays visible regardless of whether this dropdown is open or closed.
        // Using it here made openProfileMenu()'s "wait for the menu to open"
        // check a no-op, so it never actually caught the dropdown being closed.
        // The dropdown's real logout row is #btn_profile_logout. Confirmed
        // against a live dev run on 2026-09-14.
        this.profileMenuPanel = profileMenuPanel;
        this.logoutItem    = profileMenuPanel.locator('#btn_profile_logout')
            .or(profileMenuPanel.locator('#userSettings-logout-item'))
            .first();
        // Logout confirmation is the shared confirmation/action modal (QA-DATA-TESTID-HANDOFF.md
        // §3) with no custom prefix set, so it falls back to the default `modal-submit-btn`.
        this.proceedButton = page.getByTestId('modal-submit-btn')
            .or(page.getByRole('button', { name: /proceed|متابعة/i }))
            .first();
    }

    /** Idempotent: profileTrigger is a toggle button, so only click it if the menu isn't already open — otherwise a second call would close it. */
    async openProfileMenu(): Promise<void> {
        if (!(await this.profileMenuPanel.isVisible().catch(() => false))) {
            await this.profileTrigger.click();
        }
        await this.logoutItem.waitFor({ state: 'visible' });
    }

    async logout(): Promise<void> {
        await this.openProfileMenu();
        await this.logoutItem.click();
        await this.proceedButton.click();
    }

    /** Switches the app language via the header/profile-menu toggle, confirming the switch if a modal appears. */
    async switchLanguage(target: 'en' | 'ar'): Promise<void> {
        await this.openProfileMenu();
        await this.languageSelector.click();
        const toggle = target === 'ar' ? this.arabicToggle : this.englishToggle;
        await toggle.click();
        if (await this.switchLanguageConfirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await this.switchLanguageConfirmButton.click();
        }
    }
}
