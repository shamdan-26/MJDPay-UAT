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

    constructor(page: Page) {
        this.page = page;
        // استخدام Locators ذكية تعتمد على الـ ID والـ Role
        this.companyNumberInput = page.getByRole('textbox', { name: /company number/i });
        this.mobileNumberInput = page.getByRole('textbox', { name: /mobile number/i });
        this.passwordInput = page.getByRole('textbox', { name: /^password$/i });
        // UI now labels submit as "Log In"; keep a flexible matcher for future copy changes.
        this.submitLoginAction = page.getByRole('button', { name: /^(log in|sign in)$/i });
        this.verifyButton = page.locator('#btn_otp_submit');
        this.otpCancelButton = page.locator('#btn_otp_cancel');
        this.validationMessages = page.locator('[role=\"alert\"], .error, .invalid-feedback, .mat-error, .text-danger');
    }

    async navigate() {
        await this.page.goto('https://uat.majdpay.com/business/login');
    }

    async login(cn: string, mobile: string, pass: string) {
        await this.companyNumberInput.fill(cn);
        await this.mobileNumberInput.fill(mobile);
        await this.passwordInput.fill(pass);
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
        for (let i = 0; i < otpCode.length; i++) {
            // إدخال الـ OTP في الخانات المخصصة
            await this.page.locator(`#ngx-otp-input-${i}`).fill(otpCode[i]);
        }
    }

    async isOTPScreenDisplayed(): Promise<boolean> {
        // التحقق من ظهور خانة الـ OTP الأولى
        return await this.page.locator('#ngx-otp-input-0').isVisible();
    }

    async assertLoginSuccess() {
        const expectedUrl = 'https://uat.majdpay.com/business/main/home';
        await expect(this.page).toHaveURL(expectedUrl, { timeout: 10000 });
        // Captures the entire scrollable page
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
}
