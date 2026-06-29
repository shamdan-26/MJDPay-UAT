import { Page, Locator, expect } from '@playwright/test';

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

        // Smart Locators leveraging IDs and Accessible Roles
        this.companyNumberInput = page.locator('input[id*="company-number"], input[id*="company_number"]');
        this.mobileNumberInput = page.locator('input[id*="mobile-number"], input[id*="mobile_number"]');

        this.passwordInput = page.locator('input[id*="password-3"], input[id*="password"]');

        // UI now labels submit as "Log In"; keep a flexible matcher for future copy changes
        this.submitLoginAction = page.getByRole('button', { name: /^(log in|sign in|تسجيل الدخول)$/i });
        this.verifyButton = page.locator('#btn_otp_submit');
        this.otpCancelButton = page.locator('#btn_otp_cancel');
        this.validationMessages = page.locator('[role=\"alert\"], .error, .invalid-feedback, .mat-error, .text-danger');
        this.toastErrorDetail = page.locator('.toast-snackbar__detail');

        // Theme & Language
        this.themeToggleButton = page.locator('#text_toggleButton');
        this.languageDropdown = page.locator('#text_langDropdown');
        this.englishButton = page.locator('button#text_languageItem:has-text("EN")');
        this.arabicButton = page.locator('button#text_languageItem:has-text("العربية")');
        this.landingPageTitle = page.locator('#login-form-title.form-title');

        // Password visibility toggle (assuming eye icon button)
        this.passwordToggleButton = page.locator('button[aria-label*="Show password" i], button[aria-label*="Hide password" i], .password-toggle, .eye-icon, [data-testid*="password-toggle"]')
            .first();
    }

    async navigate() {
        await this.page.goto('https://uat.majdpay.com/business/auth/login');
    }

    async login(cn: string, mobile: string, pass: string, options?: { useSequentialTyping?: boolean, skipSubmit?: boolean }) {
        await this.companyNumberInput.fill(cn);
        if (options?.useSequentialTyping) {
            await this.mobileNumberInput.click();
            await this.mobileNumberInput.pressSequentially(mobile);
        } else {
            await this.mobileNumberInput.fill(mobile);
        }
        await this.passwordInput.fill(pass);

        if (options?.skipSubmit) {
            return;
        }

        if (await this.submitLoginAction.isEnabled()) {
            await this.submitLoginAction.click();
        } else {
            // Trigger field-level validation without waiting on a disabled submit button
            await this.passwordInput.blur();
            await this.mobileNumberInput.blur();
            await this.companyNumberInput.blur();
        }
    }

    async enterOTP(otpCode: string) {
        // Explicitly wait for the first OTP input to be fully attached and visible
        const firstOtpInput = this.page.locator('#ngx-otp-input-0');
        await expect(firstOtpInput).toBeVisible({ timeout: 15000 });

        // Small delay to allow Angular's reactive form model to initialize and bind events
        await this.page.waitForTimeout(500);

        for (let i = 0; i < otpCode.length; i++) {
            const otpInput = this.page.locator(`#ngx-otp-input-${i}`);
            await expect(otpInput).toBeVisible();
            // Use click and pressSequentially to simulate native keystrokes for the Angular model
            await otpInput.click();
            await otpInput.pressSequentially(otpCode[i], { delay: 100 });
        }

        // Brief pause after all digits are entered to ensure the 'Verify' button state updates
        await this.page.waitForTimeout(500);
    }

    async isOTPScreenDisplayed(): Promise<boolean> {
        // Verify if the first OTP input field is visible on the DOM
        return await this.page.locator('#ngx-otp-input-0').isVisible();
    }

    async assertLoginSuccess() {
        await expect(this.page).toHaveURL(/\/business\/main\/home/i, { timeout: 10000 });

        // Captures the entire scrollable page for audit trail
        await this.page.screenshot({ path: 'full-page.png', fullPage: true });
    }

    async assertValidationErrorsVisible() {
        const count = await this.validationMessages.count();
        if (count > 0) {
            await expect(this.validationMessages.first()).toBeVisible();
        } else {
            // Some UIs enforce validation by disabling submit rather than showing inline messages
            await expect(this.submitLoginAction).toBeDisabled();
        }
    }

    async assertToastError(expectedMessage: string) {
        await expect(this.toastErrorDetail).toBeVisible();
        await expect(this.toastErrorDetail).toContainText(expectedMessage);
    }

    // ---------- Theme Actions ----------

    async toggleTheme() {
        await this.themeToggleButton.click();
    }

    // ---------- Language Actions ----------

    async selectEnglish() {
        await this.languageDropdown.click();
        await this.englishButton.click();
        await this.page.waitForTimeout(2000); // Allow localized layout elements to fully attach
    }

    async selectArabic() {
        await this.languageDropdown.click();
        await this.arabicButton.click();
        await this.page.waitForTimeout(2000); // Allow localized layout elements to fully attach
    }

    async isLanguageActive(button: Locator): Promise<boolean> {
        const ariaPressed = await button.getAttribute('aria-pressed');
        if (ariaPressed === 'true') return true;
        const classList = await button.getAttribute('class') ?? '';
        return classList.includes('is-active');
    }

    async assertArabicTitleVisible() {
        console.log('Asserting Arabic title is strictly visible with exact text');
        await expect(this.landingPageTitle).toBeVisible();
        await expect(this.landingPageTitle).toHaveText('مرحباً بك في MJD Pay');
    }

    // ---------- Password Visibility Actions ----------

    async togglePasswordVisibility() {
        await this.passwordToggleButton.click();
    }

    async isPasswordMasked(): Promise<boolean> {
        const type = await this.passwordInput.getAttribute('type');
        return type === 'password';
    }

    async isPasswordVisible(): Promise<boolean> {
        const type = await this.passwordInput.getAttribute('type');
        return type === 'text';
    }
}