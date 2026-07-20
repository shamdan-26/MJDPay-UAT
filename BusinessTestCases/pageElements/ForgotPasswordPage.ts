import { type Page, type Locator } from '@playwright/test';
import { waitForToastClear } from '../toastMessages';

export class ForgotPasswordPage {
    readonly page: Page;

    // Step 1 — identify account
    readonly logoImage: Locator;
    readonly logoLink: Locator;
    readonly backButton: Locator;
    readonly companyInput: Locator;
    readonly mobileInput: Locator;
    readonly nextButton: Locator;
    readonly loginLink: Locator;

    // Step 2 — set new password
    readonly newPasswordInput: Locator;
    readonly confirmPasswordInput: Locator;
    readonly showNewPasswordToggle: Locator;
    readonly showConfirmPasswordToggle: Locator;
    readonly saveButton: Locator;
    readonly resetPasswordButton: Locator;

    // Shared header elements
    readonly enButton: Locator;
    readonly arabicButton: Locator;
    readonly themeToggle: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logoImage  = page.locator('img[alt="MJD Pay"]');
        this.logoLink   = page.locator('a').filter({ has: page.locator('img[alt="MJD Pay"]') });
        this.backButton = page.locator('main button').first();

        this.companyInput = page.getByRole('textbox', { name: /Company number|رقم الشركة/ });
        this.mobileInput  = page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ });
        this.nextButton   = page.getByRole('button', { name: /Next|التالي/ });
        this.loginLink    = page.getByRole('link', { name: /log.?in/i });

        this.newPasswordInput     = page.getByRole('textbox', { name: /New Password|كلمة المرور الجديدة/ });
        this.confirmPasswordInput = page.getByRole('textbox', { name: /confirm|تأكيد كلمة المرور/i });
        this.showNewPasswordToggle     = page.getByRole('button', { name: 'Show password' }).first();
        this.showConfirmPasswordToggle = page.getByRole('button', { name: 'Show password' }).nth(1);
        this.saveButton = page.getByRole('button', { name: /save|confirm/i });
        this.resetPasswordButton = page.getByRole('button', { name: /reset password|إعادة تعيين كلمة المرور/i });

        // lang-en/lang-ar: QA-DATA-TESTID-HANDOFF.md §4.2 (header + auth layout).
        // No testid documented for the company/mobile/password fields or Next/Save
        // buttons on this flow — those stay on role-based locators.
        this.enButton     = page.getByTestId('lang-en').or(page.getByRole('button', { name: 'EN' }));
        this.arabicButton = page.getByTestId('lang-ar').or(page.getByRole('button', { name: 'العربية' }));
        this.themeToggle  = page.getByRole('button', { name: 'Switch theme' });
    }

    async goto(url: string): Promise<void> {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForToastClear(this.page);
    }

    async fillStep1(company: string, mobile: string): Promise<void> {
        await this.companyInput.fill(company);
        await this.mobileInput.fill(mobile);
    }

    async submitStep1(): Promise<void> {
        await this.nextButton.click();
        await this.newPasswordInput.waitFor({ state: 'visible', timeout: 30000 });
    }

    async fillStep2(newPassword: string, confirmPassword: string): Promise<void> {
        await this.newPasswordInput.fill(newPassword);
        await this.confirmPasswordInput.fill(confirmPassword);
    }
}
