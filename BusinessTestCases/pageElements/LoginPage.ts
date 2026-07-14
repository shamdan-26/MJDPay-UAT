import { type Page, type Locator } from '@playwright/test';
import { waitForToastClear } from '../toastMessages';

export class LoginPage {
    readonly page: Page;

    // Container
    readonly formBox: Locator;
    readonly formEyebrow: Locator;
    readonly formTitle: Locator;
    readonly taglineText: Locator;

    // Logo
    readonly logoImage: Locator;
    readonly logoLink: Locator;

    // Fields
    readonly companyInput: Locator;
    readonly companyLabel: Locator;
    readonly companyClearButton: Locator;
    readonly mobileInput: Locator;
    readonly mobileLabel: Locator;
    readonly mobileClearButton: Locator;
    readonly countryCode: Locator;
    readonly countryFlag: Locator;
    readonly passwordInput: Locator;
    readonly passwordLabel: Locator;
    readonly showPasswordToggle: Locator;

    // Actions / links
    readonly loginButton: Locator;
    readonly forgotPasswordLink: Locator;
    readonly signUpLink: Locator;
    readonly newToMjdText: Locator;

    // Language / theme
    readonly enButton: Locator;
    readonly arabicButton: Locator;
    readonly themeToggle: Locator;

    constructor(page: Page) {
        this.page = page;

        this.formBox     = page.locator('#login-form-box');
        this.formEyebrow = page.locator('#login-form-eyebrow');
        this.formTitle   = page.locator('#login-form-title');
        this.taglineText = page.getByText(/Seamless transactions.*get started/);

        this.logoImage = page.locator('img[alt="MJD Pay"]');
        this.logoLink  = page.locator('a:has(img[alt="MJD Pay"])');

        this.companyInput      = page.getByRole('textbox', { name: /Company number|رقم الشركة/ });
        this.companyLabel      = page.locator('label.floating-field-label', { hasText: 'Company' });
        this.companyClearButton = page.locator('.floating-field-clear, [class*="clear-btn"], [aria-label*="lear" i]').first();
        this.mobileInput       = page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ });
        this.mobileLabel       = page.locator('label.floating-field-label', { hasText: 'Mobile' });
        this.mobileClearButton  = page.locator('.floating-field-clear, [class*="clear-btn"], [aria-label*="lear" i]').nth(1);
        this.countryCode       = page.locator('.floating-prefix');
        this.countryFlag       = page.locator('.floating-prefix img, .floating-prefix [class*="flag"]').first();
        this.passwordInput     = page.locator('input[aria-label="Password"], input[aria-label="كلمة المرور"]');
        this.passwordLabel     = page.locator('label.floating-field-label', { hasText: 'Password' });
        this.showPasswordToggle = page.locator('button.floating-password-toggle');

        const env = process.env['ENV'] ?? 'dev';
        this.loginButton = env === 'dev'
            ? page.locator('#btn_login')
            : page.getByRole('button', { name: 'Log In' });

        this.forgotPasswordLink  = page.getByText(/Forgot Password\?|نسيت كلمة المرور؟/);
        this.signUpLink          = page.getByText('Sign Up');
        this.newToMjdText        = page.getByText('New to MJD PAY?');

        this.enButton     = page.getByRole('button', { name: 'EN' });
        this.arabicButton = page.getByRole('button', { name: 'العربية' });
        this.themeToggle  = page.getByRole('button', { name: 'Switch theme' });
    }

    async goto(url: string): Promise<void> {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await this.formBox.waitFor({ state: 'visible', timeout: 15000 });
        await waitForToastClear(this.page);
    }

    async fill(company: string, mobile: string, password: string): Promise<void> {
        await this.companyInput.fill(company);
        await this.mobileInput.fill(mobile);
        await this.passwordInput.fill(password);
    }

    async submit(): Promise<void> {
        await this.loginButton.click();
    }

    async fillAndSubmit(company: string, mobile: string, password: string): Promise<void> {
        await this.fill(company, mobile, password);
        await this.submit();
    }
}
