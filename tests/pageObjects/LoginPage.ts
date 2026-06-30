import { type Page, type Locator, expect } from '@playwright/test';

const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';

export class LoginPage {
    readonly page: Page;
    readonly companyNumberInput: Locator;
    readonly mobileNumberInput: Locator;
    readonly passwordInput: Locator;
    readonly submitLoginAction: Locator;
    readonly verifyButton: Locator;
    readonly otpCancelButton: Locator;
    readonly validationMessages: Locator;
    readonly toastErrorDetail: Locator;

    // Theme & Language locators
    readonly themeToggleButton: Locator;
    readonly languageDropdown: Locator;
    readonly englishButton: Locator;
    readonly arabicButton: Locator;
    readonly landingPageTitle: Locator;

    // Password visibility locator
    readonly passwordToggleButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.companyNumberInput = page.locator('input[id*="company-number"], input[id*="company_number"]');
        this.mobileNumberInput  = page.locator('input[id*="mobile-number"], input[id*="mobile_number"]');
        this.passwordInput      = page.locator('input[id*="password-3"], input[id*="password"]');

        this.submitLoginAction = page.getByRole('button', { name: /^(log in|sign in|تسجيل الدخول)$/i });
        this.verifyButton      = page.locator('#btn_otp_submit');
        this.otpCancelButton   = page.locator('#btn_otp_cancel');
        this.validationMessages = page.locator('[role="alert"], .error, .invalid-feedback, .mat-error, .text-danger');
        this.toastErrorDetail  = page.locator('.toast-snackbar__detail');

        this.themeToggleButton = page.locator('#text_toggleButton');
        this.languageDropdown  = page.locator('#text_langDropdown');
        this.englishButton     = page.locator('button#text_languageItem:has-text("EN")');
        this.arabicButton      = page.locator('button#text_languageItem:has-text("العربية")');
        this.landingPageTitle  = page.locator('#login-form-title.form-title');

        this.passwordToggleButton = page
            .locator('button[aria-label*="Show password" i], button[aria-label*="Hide password" i], .password-toggle, .eye-icon, [data-testid*="password-toggle"]')
            .first();
    }

    async navigate(): Promise<void> {
        await this.page.goto(`${BASE_URL}/business/auth/login`);
    }

    async login(cn: string, mobile: string, pass: string, options?: { useSequentialTyping?: boolean; skipSubmit?: boolean }): Promise<void> {
        await this.companyNumberInput.fill(cn);
        if (options?.useSequentialTyping) {
            await this.mobileNumberInput.click();
            await this.mobileNumberInput.pressSequentially(mobile);
        } else {
            await this.mobileNumberInput.fill(mobile);
        }
        await this.passwordInput.fill(pass);

        if (options?.skipSubmit) return;

        if (await this.submitLoginAction.isEnabled()) {
            await this.submitLoginAction.click();
        } else {
            await this.passwordInput.blur();
            await this.mobileNumberInput.blur();
            await this.companyNumberInput.blur();
        }
    }

    async enterOTP(otpCode: string): Promise<void> {
        const firstOtpInput = this.page.locator('#ngx-otp-input-0');
        await expect(firstOtpInput).toBeVisible({ timeout: 15000 });

        for (let i = 0; i < otpCode.length; i++) {
            const otpInput = this.page.locator(`#ngx-otp-input-${i}`);
            await expect(otpInput).toBeVisible();
            await otpInput.click();
            await otpInput.pressSequentially(otpCode[i], { delay: 100 });
        }
    }

    async isOTPScreenDisplayed(): Promise<boolean> {
        return this.page.locator('#ngx-otp-input-0').isVisible();
    }

    async assertLoginSuccess(): Promise<void> {
        await expect(this.page).toHaveURL(/\/business\/main\/home/i, { timeout: 10000 });
    }

    async assertValidationErrorsVisible(): Promise<void> {
        const count = await this.validationMessages.count();
        if (count > 0) {
            await expect(this.validationMessages.first()).toBeVisible();
        } else {
            await expect(this.submitLoginAction).toBeDisabled();
        }
    }

    async assertToastError(expectedMessage: string): Promise<void> {
        await expect(this.toastErrorDetail).toBeVisible();
        await expect(this.toastErrorDetail).toContainText(expectedMessage);
    }

    // ── Theme ─────────────────────────────────────────────────────────────────

    async toggleTheme(): Promise<void> {
        await this.themeToggleButton.click();
    }

    // ── Language ──────────────────────────────────────────────────────────────

    async selectEnglish(): Promise<void> {
        await this.languageDropdown.click();
        await this.englishButton.click();
        await this.page.waitForLoadState('domcontentloaded');
    }

    async selectArabic(): Promise<void> {
        await this.languageDropdown.click();
        await this.arabicButton.click();
        await this.page.waitForLoadState('domcontentloaded');
    }

    async isLanguageActive(button: Locator): Promise<boolean> {
        const ariaPressed = await button.getAttribute('aria-pressed');
        if (ariaPressed === 'true') return true;
        const classList = await button.getAttribute('class') ?? '';
        return classList.includes('is-active');
    }

    async assertArabicTitleVisible(): Promise<void> {
        await expect(this.landingPageTitle).toBeVisible();
        await expect(this.landingPageTitle).toHaveText('مرحباً بك في MJD Pay');
    }

    // ── Password visibility ───────────────────────────────────────────────────

    async togglePasswordVisibility(): Promise<void> {
        await this.passwordToggleButton.click();
    }

    async isPasswordMasked(): Promise<boolean> {
        return (await this.passwordInput.getAttribute('type')) === 'password';
    }

    async isPasswordVisible(): Promise<boolean> {
        return (await this.passwordInput.getAttribute('type')) === 'text';
    }
}
