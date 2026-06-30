import { type Page, type Locator } from '@playwright/test';

export class RegistrationInfoPage {
    readonly page: Page;

    // Header
    readonly logoImage: Locator;
    readonly logoLink: Locator;
    readonly enButton: Locator;
    readonly arabicButton: Locator;
    readonly themeToggle: Locator;

    // Progress / step indicators
    readonly formEyebrow: Locator;
    readonly formTitle: Locator;
    readonly formSubTitle: Locator;
    readonly outerStepBar: Locator;
    readonly innerStepBar: Locator;
    readonly activeStep: Locator;

    // Profile type
    readonly profileTypeLabel: Locator;
    readonly profileTypeGroup: Locator;
    readonly merchantCard: Locator;
    readonly billerCard: Locator;
    readonly customerCard: Locator;
    readonly freelancerCard: Locator;

    // CRN (Unified Number)
    readonly crnLabel: Locator;
    readonly crnInput: Locator;
    readonly crnGroup: Locator;
    readonly crnTooltipButton: Locator;
    readonly crnClearButton: Locator;

    // National ID / Iqama
    readonly idLabel: Locator;
    readonly idInput: Locator;
    readonly idGroup: Locator;
    readonly idTooltipButton: Locator;
    readonly idClearButton: Locator;

    // Email
    readonly emailLabel: Locator;
    readonly emailInput: Locator;
    readonly emailError: Locator;

    // Actions / footer
    readonly nextButton: Locator;
    readonly loginLink: Locator;
    readonly footer: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logoImage = page.locator('#auth_header_logo[aria-label="MJD Pay"]');
        this.logoLink  = page.getByRole('link', { name: 'MJD Pay' });

        this.enButton     = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'EN' });
        this.arabicButton = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'العربية' });
        this.themeToggle  = page.locator('button.mode-btn.header-icon-btn');

        this.formEyebrow  = page.locator('#register-form-eyebrow');
        this.formTitle    = page.locator('#register-form-title');
        this.formSubTitle = page.locator('#register-form-sub-title');
        this.outerStepBar = page.locator('.mp-stepbar .mp-step');
        this.innerStepBar = page.locator('.mp-stepbar.mp-stepbar-global.mp-stepbar-inline');
        this.activeStep   = page.locator('.mp-step.is-active');

        this.profileTypeLabel = page.locator('#register-profile-types .mp-field-label');
        this.profileTypeGroup = page.getByRole('radiogroup', { name: 'Profile Type' });
        this.merchantCard   = page.locator('#register-profile-card-MERCHANT');
        this.billerCard     = page.locator('#register-profile-card-BILLER');
        this.customerCard   = page.locator('#register-profile-card-CUSTOMER');
        this.freelancerCard = page.locator('#register-profile-card-FREELANCER');

        this.crnLabel         = page.locator('label[for="register-unifiedNumber-input"]');
        this.crnInput         = page.locator('#register-unifiedNumber-group input[type="text"]');
        this.crnGroup         = page.locator('#register-unifiedNumber-group');
        this.crnTooltipButton = page.getByRole('button', { name: /Unified Number/i });
        this.crnClearButton   = page.locator('#register-unifiedNumber-group').getByRole('button', { name: 'Clear' });

        this.idLabel         = page.locator('label[for="register-id-input"]');
        this.idInput         = page.locator('#register-id-group input[type="text"]');
        this.idGroup         = page.locator('#register-id-group');
        this.idTooltipButton = page.getByRole('button', { name: /National ID.*Iqama|Iqama/i });
        this.idClearButton   = page.locator('#register-id-group').getByRole('button', { name: 'Clear' });

        this.emailLabel = page.locator('#register-email-group label');
        this.emailInput = page.locator('input[type="email"][aria-label="Email"]');
        this.emailError = page.locator('#error_email.text-danger');

        this.nextButton = page.locator('#register-next-button');
        this.loginLink  = page.locator('#btn_register_login_step1');
        this.footer     = page.locator('#login-form-footer').first();
    }

    async fill(profileCard: Locator, crn: string, nationalId: string, email: string): Promise<void> {
        await profileCard.click();
        await this.crnInput.fill(crn);
        await this.idInput.fill(nationalId);
        await this.emailInput.fill(email);
    }

    async next(): Promise<void> {
        await this.nextButton.click();
    }
}
