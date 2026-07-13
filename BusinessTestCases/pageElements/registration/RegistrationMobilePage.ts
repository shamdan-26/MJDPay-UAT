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

    // Form
    readonly mobileInput: Locator;
    readonly countryCode: Locator;
    readonly nextButton: Locator;
    readonly loginLink: Locator;
    readonly termsText: Locator;
    readonly privacyText: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logoImage = page.locator('img[alt="MJD Pay"]');
        this.logoLink  = page.locator('a:has(img[alt="MJD Pay"])');

        this.enButton     = page.getByRole('button', { name: 'EN' });
        this.arabicButton = page.getByRole('button', { name: 'العربية' });
        this.themeToggle  = page.getByRole('button', { name: 'Switch theme' });

        this.mobileInput = page.getByRole('textbox', { name: 'Mobile number' });
        this.countryCode = page.locator('.floating-prefix');
        this.nextButton  = page.getByRole('button', { name: 'next' });
        this.loginLink   = page.getByRole('link', { name: /log.?in/i });
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
