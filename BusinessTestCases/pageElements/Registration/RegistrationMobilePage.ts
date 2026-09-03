import { type Page, type Locator, expect } from '@playwright/test';
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

        this.enButton     = page.getByTestId('lang-en');
        this.arabicButton = page.getByRole('button', { name: 'العربية' });
        this.themeToggle  = page.getByRole('button', { name: 'Switch theme' });

        this.createAccountEyebrow        = page.locator('.form-eyebrow');
        this.enterPhoneHeading           = page.locator('label.floating-field-label.ng-star-inserted', { hasText: 'رقم الجوال' });
        this.startRegistrationDescription = page.locator('.form-sub-title.mt-2', { hasText: 'ابدأ تسجيل نشاطك التجاري' });

        this.mobileInput = page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ });
        this.countryCode = page.locator('.floating-prefix');
        this.nextButton  = page.getByRole('button', { name: /next|التالي/i });
        this.alreadyHaveAccountText = page.locator('div.new-user span', { hasText: /Already have an account\?|لديك حساب بالفعل؟/ });
        this.loginLink   = page.getByTestId('register-login-link');
        this.termsText   = page.getByText(/Terms/i).first();
        this.privacyText = page.getByText(/Privacy/i).first();
    }

    async goto(url: string): Promise<void> {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForToastClear(this.page);
    }

    async fillMobile(mobile: string): Promise<void> {
        // On a freshly-navigated page, Angular can still be hydrating the reactive
        // form when .fill() lands — its bootstrap then resets the control back to
        // empty right after, silently dropping the value. Verify the fill stuck
        // and retry once rather than letting submitMobile() spin on a permanently
        // disabled Next button until the caller's timeout fires.
        await this.mobileInput.fill(mobile);
        try {
            await expect(this.mobileInput).toHaveValue(mobile, { timeout: 3000 });
        } catch {
            await this.mobileInput.fill(mobile);
            await expect(this.mobileInput).toHaveValue(mobile);
        }
    }

    async submitMobile(): Promise<void> {
        await this.nextButton.click();
    }
}
