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

        this.monthlyBillsInput       = page.getByRole('textbox', { name: /monthly expected number/i });
        this.monthlyAmountInput      = page.getByRole('textbox', { name: /monthly expected sum/i });
        this.monthlyWithdrawalInput  = page.getByRole('textbox', { name: /monthly withdrawal/i });
        this.monthlyDepositInput     = page.getByRole('textbox', { name: /monthly deposit/i });

        this.banksDropdown       = page.locator('[id^="floating-dropdown-banks"]');
        this.industriesDropdown  = page.locator('[id^="floating-dropdown-industries"]');
        this.annualIncomeDropdown = page.locator('[id^="floating-dropdown-annual-income"]');

        this.nextButton    = page.getByRole('button', { name: /next/i });
        this.backButton    = page.getByRole('button', { name: /back/i });
        this.loadingButton = page.getByRole('button', { name: 'Loading' });

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
