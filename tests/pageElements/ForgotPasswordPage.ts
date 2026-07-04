import { type Page, type Locator } from '@playwright/test';
import { waitForToastClear } from '../shared';

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
        this.backButton = page.getByRole('button', { name: /back/i });

        this.companyInput = page.getByRole('textbox', { name: 'Company number' });
        this.mobileInput  = page.getByRole('textbox', { name: 'Mobile number' });
        this.nextButton   = page.getByRole('button', { name: 'Next' });
        this.loginLink    = page.getByRole('link', { name: /log.?in/i });

        this.newPasswordInput     = page.getByRole('textbox', { name: 'New Password' });
        this.confirmPasswordInput = page.getByRole('textbox', { name: /confirm/i });
        this.showNewPasswordToggle     = page.locator('button.floating-password-toggle').first();
        this.showConfirmPasswordToggle = page.locator('button.floating-password-toggle').last();
        this.saveButton = page.getByRole('button', { name: /save|confirm/i });
        this.resetPasswordButton = page.getByRole('button', { name: /reset password/i });

        this.enButton     = page.getByRole('button', { name: 'EN' });
        this.arabicButton = page.getByRole('button', { name: 'العربية' });
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
