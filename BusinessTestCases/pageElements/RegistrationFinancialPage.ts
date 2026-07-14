import { type Page, type Locator } from '@playwright/test';

export class RegistrationFinancialPage {
    readonly page: Page;

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

    constructor(page: Page) {
        this.page = page;

        this.monthlyBillsInput       = page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i });
        this.monthlyAmountInput      = page.getByRole('textbox', { name: /monthly expected sum|إجمالي مبالغ الفواتير/i });
        this.monthlyWithdrawalInput  = page.getByRole('textbox', { name: /monthly withdrawal|حجم السحب الشهري/i });
        this.monthlyDepositInput     = page.getByRole('textbox', { name: /monthly deposit|حجم الإيداع الشهري/i });

        this.banksDropdown       = page.locator('[id^="floating-dropdown-banks"], [id^="floating-dropdown-البنك"]');
        this.industriesDropdown  = page.locator('[id^="floating-dropdown-industries"], [id^="floating-dropdown-القطاعات"]');
        this.annualIncomeDropdown = page.locator('[id^="floating-dropdown-annual-income"], [id^="floating-dropdown-الدخل-السنوي"]');

        this.nextButton    = page.getByRole('button', { name: /next|التالي/i });
        this.backButton    = page.getByRole('button', { name: /back|رجوع/i });
        this.loadingButton = page.getByRole('button', { name: /Loading|جاري التحميل/i });

        this.formTitle  = page.locator('#register-form-title');
        this.activeStep = page.locator('.mp-step.is-active');
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
