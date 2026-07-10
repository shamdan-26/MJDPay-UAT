import { type Page, type Locator } from '@playwright/test';

export class RegistrationVerificationPage {
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

    // Inner tab list (Business Info / Financial & Business / Verification & Uploads)
    readonly tabList: Locator;
    readonly businessInfoTab: Locator;
    readonly financialTab: Locator;
    readonly verificationTab: Locator;

    // Bank
    readonly bankDropdown: Locator;

    // IBAN
    readonly ibanInput: Locator;
    readonly ibanHint: Locator;

    // IBAN proof upload
    readonly ibanProofLabel: Locator;
    readonly ibanUploadPrompt: Locator;
    readonly ibanUploadHelperText: Locator;

    // VAT
    readonly vatInput: Locator;
    readonly vatHint: Locator;

    // VAT certificate upload
    readonly vatCertLabel: Locator;
    readonly vatUploadPrompt: Locator;
    readonly vatUploadHelperText: Locator;

    // CR (Commercial Registration)
    readonly crUploadLabel: Locator;

    // OTP / NAFATH notice
    readonly otpNafathNotice: Locator;

    // Navigation
    readonly nextButton: Locator;
    readonly backButton: Locator;
    readonly signUpButton: Locator;
    readonly loadingButton: Locator;

    // Step indicators
    readonly stepIndicator: Locator;

    // Footer
    readonly loginLine: Locator;
    readonly loginLink: Locator;
    readonly footer: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logoImage = page.locator('#auth_header_logo[aria-label="MJD Pay"]');
        this.logoLink  = page.getByRole('link', { name: 'MJD Pay' });

        this.enButton     = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'EN' });
        this.arabicButton = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'العربية' });
        this.themeToggle  = page.getByRole('button', { name: 'Switch theme' });

        this.formEyebrow  = page.locator('#register-form-eyebrow');
        this.formTitle    = page.locator('#register-form-title');
        this.formSubTitle = page.locator('#register-form-sub-title');
        this.outerStepBar = page.locator('.mp-stepbar .mp-step');
        this.innerStepBar = page.locator('.mp-stepbar.mp-stepbar-global.mp-stepbar-inline');
        this.activeStep   = page.locator('.mp-step.is-active');

        this.tabList         = page.getByRole('tablist');
        this.businessInfoTab = page.getByRole('tab', { name: /business info/i });
        this.financialTab    = page.getByRole('tab', { name: /financial & business/i });
        this.verificationTab = page.getByRole('tab', { name: /verification & uploads/i });

        this.bankDropdown = page.getByRole('combobox', { name: /^bank$/i })
            .or(page.locator('[id^="floating-dropdown-bank"]'));

        this.ibanInput      = page.getByRole('textbox', { name: /iban/i });
        this.ibanHint       = page.getByText(/24 characters starting with SA/i);
        this.ibanProofLabel = page.getByText(/iban proof/i);
        this.ibanUploadPrompt = page.getByText(/click to upload/i).first();
        this.ibanUploadHelperText = page.getByText(/bank letter or statement header/i);

        this.vatInput = page.getByRole('textbox', { name: /vat number/i });
        this.vatHint  = page.getByText(/from your vat certificate/i);

        this.vatCertLabel      = page.getByText('VAT certificate', { exact: true });
        this.vatUploadPrompt   = page.locator('.upload-text-block .drag-text', { hasText: /click to upload/i }).last();
        this.vatUploadHelperText = page.getByText(/pdf.*max 5\s*mb/i).last();

        this.crUploadLabel = page.getByText(/commercial registration/i).first();

        this.otpNafathNotice = page.getByText(/otp|nafath/i).filter({ hasText: /verif/i }).first();

        this.nextButton    = page.getByRole('button', { name: /^next$/i });
        this.backButton    = page.getByRole('button', { name: /back/i });
        this.signUpButton  = page.getByRole('button', { name: /sign up/i });
        this.loadingButton = page.getByRole('button', { name: 'Loading' });

        this.stepIndicator = page.getByText(/verification/i).first();

        this.loginLine = page.locator('#login-line.new-user', { hasText: 'Already have an account?' }).filter({ visible: true }).first();
        this.loginLink = page.locator('#login-line.new-user span', { hasText: /log.?in/i }).filter({ visible: true }).first();
        this.footer    = page.locator('#login-form-footer').first();
    }

    async waitForLoad(): Promise<void> {
        await this.ibanInput.waitFor({ state: 'visible', timeout: 15000 });
    }
}
