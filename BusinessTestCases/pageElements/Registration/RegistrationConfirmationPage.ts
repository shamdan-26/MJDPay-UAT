import { type Page, type Locator } from '@playwright/test';

/**
 * Final screen of registration, shown after "Submit and finish" on the Contract
 * step (POST /emi-profile/api/v1/register/contract/accept). Locators confirmed
 * live on dev 2026-10-09 (Arabic default):
 *   eyebrow  "تم استلام طلب التسجيل"   (registration request received)
 *   message  "حسابك جاهز. يمكنك الآن تسجيل الدخول ... يرجى مراجعة بريدك الإلكتروني ..."
 *   button   data-testid="register-finish-login-btn"  "سجّل الدخول إلى حسابك"
 * The English wording has not been confirmed — switching to EN on this screen
 * drops back to the start of the wizard, so the English text is matched loosely.
 */
export class RegistrationConfirmationPage {
    readonly page: Page;

    readonly enButton: Locator;
    readonly arabicButton: Locator;
    readonly themeToggle: Locator;

    readonly heading: Locator;
    readonly message: Locator;
    readonly loginButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.enButton     = page.getByTestId('lang-en');
        this.arabicButton = page.getByTestId('lang-ar');
        this.themeToggle  = page.locator('#text_toggleButton').first();

        this.heading     = page.getByText(/تم استلام طلب التسجيل|registration request (received|submitted)/i).first();
        this.message     = page.getByText(/حسابك جاهز|your account is ready/i).first();
        this.loginButton = page.getByTestId('register-finish-login-btn');
    }

    /** Resolves once the confirmation screen (login button) renders. */
    async waitForLoad(timeout = 30000): Promise<void> {
        await this.loginButton.waitFor({ state: 'visible', timeout });
    }

    /** Visible text of the whole page. */
    async bodyText(): Promise<string> {
        return this.page.evaluate(() => document.body.innerText);
    }
}
