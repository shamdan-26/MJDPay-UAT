import { type Page, type Locator } from '@playwright/test';

export class RegistrationFinancialPage {
    readonly page: Page;

    // Header
    readonly logoImage: Locator;
    readonly logoLink: Locator;
    readonly enButton: Locator;
    readonly arabicButton: Locator;
    readonly themeToggle: Locator;

    // Form fields
    readonly monthlyBillsInput: Locator;
    readonly monthlyAmountInput: Locator;
    readonly monthlyWithdrawalInput: Locator;
    readonly monthlyDepositInput: Locator;

    // Dropdowns
    readonly banksDropdown: Locator;
    readonly industriesDropdown: Locator;
    readonly annualIncomeDropdown: Locator;

    // Navigation
    readonly nextButton: Locator;
    readonly backButton: Locator;
    readonly loadingButton: Locator;

    // Step indicators
    readonly formTitle: Locator;
    readonly activeStep: Locator;

    // Footer
    readonly loginLine: Locator;
    readonly loginLink: Locator;
    readonly footer: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logoImage = page.locator('#auth_header_logo[aria-label="MJD Pay"]');
        this.logoLink  = page.getByRole('link', { name: 'MJD Pay' });

        this.enButton     = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'EN' });
        this.arabicButton = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'العربية' });
        this.themeToggle  = page.getByRole('button', { name: 'Switch theme' });

        this.monthlyBillsInput       = page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i });
        // Arabic accessible name is "إجمالي الفواتير الصادرة المتوقع شهرياً"
        // ("total expected monthly issued invoices") — matched on the stable
        // "إجمالي الفواتير الصادرة" core phrase rather than the full string,
        // which drifted at least once already (was "إجمالي مبالغ الفواتير").
        this.monthlyAmountInput      = page.getByRole('textbox', { name: /monthly expected sum|إجمالي الفواتير الصادرة/i });
        // Same class of drift as monthlyAmountInput above — actual accessible
        // names are "السحب الشهري المتوقع" / "الإيداع الشهري المتوقع" (no
        // "حجم", "المتوقع" appended instead), matched on the stable core.
        this.monthlyWithdrawalInput  = page.getByRole('textbox', { name: /monthly withdrawal|السحب الشهري/i });
        this.monthlyDepositInput     = page.getByRole('textbox', { name: /monthly deposit|الإيداع الشهري/i });

        // Scoped by data-testid rather than the floating-field "for" id — that id
        // is an Angular-wide auto-increment counter (e.g. "floating-dropdown-
        // bic-10") that shifts whenever an unrelated field earlier on the page is
        // added/removed, and its form-control name ("bic") doesn't match the
        // dropdown's own label ("Banks") anyway.
        this.banksDropdown        = page.locator('[data-testid="register-bank"]');
        this.industriesDropdown   = page.locator('[data-testid="register-industry"]');
        this.annualIncomeDropdown = page.locator('[data-testid="register-annual-income"]');

        this.nextButton    = page.getByRole('button', { name: /next|التالي/i });
        this.backButton    = page.getByRole('button', { name: /back|رجوع/i });
        this.loadingButton = page.getByRole('button', { name: /Loading|جاري التحميل/i });

        this.formTitle  = page.locator('#register-form-title');
        this.activeStep = page.locator('.mp-step.is-active');

        this.loginLine = page.locator('#login-line.new-user', { hasText: /Already have an account\?|لديك حساب؟/i }).filter({ visible: true }).first();
        this.loginLink = page.locator('#login-line.new-user span', { hasText: /log.?in|تسجيل الدخول/i }).filter({ visible: true }).first();
        this.footer    = page.locator('#login-form-footer').first();
    }

    async waitForLoad(): Promise<void> {
        await this.loadingButton.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
        await this.monthlyBillsInput.waitFor({ state: 'visible', timeout: 30000 });
    }

    async fill(bills: string, amount: string, withdrawal: string, deposit: string): Promise<void> {
        await this.monthlyBillsInput.fill(bills);
        await this.monthlyAmountInput.fill(amount);
        await this.monthlyWithdrawalInput.fill(withdrawal);
        await this.monthlyDepositInput.fill(deposit);
    }

    async next(): Promise<void> {
        await this.nextButton.click();
        await this.loadingButton.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    }

    async back(): Promise<void> {
        await this.backButton.click();
    }
}
