import { type Page, type Locator } from '@playwright/test';

export class RegistrationNafathPage {
    readonly page: Page;

    // Header
    readonly logoImage: Locator;
    readonly logoLink: Locator;
    readonly enButton: Locator;
    readonly arabicButton: Locator;

    // Step indicators
    readonly formTitle: Locator;
    readonly activeStep: Locator;
    readonly outerStepBar: Locator;

    // Financial tab fields (Tab 2 — visible before NAFATH step)
    readonly monthlyBillsInput: Locator;
    readonly industriesDropdown: Locator;
    readonly annualIncomeDropdown: Locator;
    readonly nextButton: Locator;
    readonly backButton: Locator;
    readonly loadingButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logoImage = page.locator('#auth_header_logo[aria-label="MJD Pay"]');
        this.logoLink  = page.getByRole('link', { name: 'MJD Pay' });

        this.enButton     = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'EN' });
        this.arabicButton = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'العربية' });

        this.formTitle   = page.locator('#register-form-title');
        this.activeStep  = page.locator('.mp-step.is-active');
        this.outerStepBar = page.locator('.mp-stepbar .mp-step');

        this.monthlyBillsInput  = page.getByRole('textbox', { name: /monthly expected number/i });
        this.industriesDropdown = page.locator('[id^="floating-dropdown-industries"]');
        this.annualIncomeDropdown = page.locator('[id^="floating-dropdown-annual-income"]');
        this.nextButton    = page.getByRole('button', { name: /next/i });
        this.backButton    = page.getByRole('button', { name: /back/i });
        this.loadingButton = page.getByRole('button', { name: 'Loading' });
    }

    async waitForFinancialTab(): Promise<void> {
        await this.loadingButton.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
        await this.monthlyBillsInput.waitFor({ state: 'visible', timeout: 30000 });
    }
}
