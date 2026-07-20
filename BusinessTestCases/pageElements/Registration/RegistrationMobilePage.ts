import { type Page, type Locator } from '@playwright/test';
import { waitForToastClear } from '../../toastMessages';

export class RegistrationMobilePage {
    readonly page: Page;

    // Header
    readonly logoImage: Locator;
    readonly logoLink: Locator;
    readonly enButton: Locator;
    readonly arabicButton: Locator;
    readonly themeToggle: Locator;

    // Page content
    readonly createAccountEyebrow: Locator;
    readonly enterPhoneHeading: Locator;
    readonly startRegistrationDescription: Locator;

    // Form
    readonly mobileInput: Locator;
    readonly countryCode: Locator;
    readonly nextButton: Locator;
    readonly alreadyHaveAccountText: Locator;
    readonly loginLink: Locator;
    readonly termsText: Locator;
    readonly privacyText: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logoImage = page.locator('img[alt="MJD Pay"]');
        this.logoLink  = page.locator('a:has(img[alt="MJD Pay"])');

        // lang-en/lang-ar: QA-DATA-TESTID-HANDOFF.md §4.2 (header + auth layout).
        this.enButton     = page.getByTestId('lang-en').or(page.getByRole('button', { name: 'EN' }));
        this.arabicButton = page.getByTestId('lang-ar').or(page.getByRole('button', { name: 'العربية' }));
        this.themeToggle  = page.getByRole('button', { name: 'Switch theme' });

        this.createAccountEyebrow        = page.locator('.form-eyebrow');
        this.enterPhoneHeading           = page.locator('label.floating-field-label[for="floating-text-mobilenumber-1"]', { hasText: 'رقم الجوال' });
        this.startRegistrationDescription = page.locator('.form-sub-title.mt-2', { hasText: 'ابدأ تسجيل نشاطك التجاري' });

        this.mobileInput = page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ });
        this.countryCode = page.locator('.floating-prefix');
        this.nextButton  = page.getByRole('button', { name: /next|التالي/i });
        this.alreadyHaveAccountText = page.getByText(/Already have an account\?|لديك حساب؟/);
        this.loginLink   = page.getByTestId('register-login-link');
        this.termsText   = page.getByText(/Terms/i).first();
        this.privacyText = page.getByText(/Privacy/i).first();
    }

    async goto(url: string): Promise<void> {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForToastClear(this.page);
    }

    async fillMobile(mobile: string): Promise<void> {
        await this.mobileInput.fill(mobile);
    }

    async submitMobile(): Promise<void> {
        await this.nextButton.click();
    }
}
