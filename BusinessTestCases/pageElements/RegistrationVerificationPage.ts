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
        this.businessInfoTab = page.getByRole('tab', { name: /business info|بيانات النشاط/i });
        this.financialTab    = page.getByRole('tab', { name: /financial & business|البيانات المالية/i });
        this.verificationTab = page.getByRole('tab', { name: /verification & uploads|التحقق والمستندات/i });

        this.bankDropdown = page.getByRole('combobox', { name: /^bank$/i })
            .or(page.locator('[id^="floating-dropdown-bank"], [id^="floating-dropdown-البنك"]'));

        this.ibanInput      = page.getByRole('textbox', { name: /iban|رقم الآيبان/i });
        this.ibanHint       = page.getByText(/24 characters starting with SA|24 خانة تبدأ بـ SA/i);
        this.ibanProofLabel = page.getByText(/iban proof|إثبات رقم الآيبان/i);
        this.ibanUploadPrompt = page.getByText(/click to upload|انقر للرفع/i).first();
        this.ibanUploadHelperText = page.getByText(/bank letter or statement header|خطاب البنك أو كشف الحساب/i);

        this.vatInput = page.getByRole('textbox', { name: /vat number|رقم ضريبة القيمة المضافة/i });
        this.vatHint  = page.getByText(/from your vat certificate|من شهادة ضريبة القيمة المضافة/i);

        this.vatCertLabel      = page.getByText(/^(VAT certificate|شهادة ضريبة القيمة المضافة)$/i);
        this.vatUploadPrompt   = page.locator('.upload-text-block .drag-text', { hasText: /click to upload|انقر للرفع/i }).last();
        this.vatUploadHelperText = page.getByText(/pdf.*max 5\s*mb|PDF.*ميجابايت/i).last();

        this.crUploadLabel = page.getByText(/commercial registration|السجل التجاري/i).first();

        this.otpNafathNotice = page.getByText(/otp|nafath|نفاذ/i).filter({ hasText: /verif|تحقق/i }).first();

        this.nextButton    = page.getByRole('button', { name: /^(next|التالي)$/i });
        this.backButton    = page.getByRole('button', { name: /back|رجوع/i });
        this.signUpButton  = page.getByRole('button', { name: /sign up|إنشاء حساب/i });
        this.loadingButton = page.getByRole('button', { name: /Loading|جاري التحميل/i });

        this.stepIndicator = page.getByText(/verification|التحقق/i).first();

        this.loginLine = page.locator('#login-line.new-user', { hasText: /Already have an account\?|لديك حساب؟/i }).filter({ visible: true }).first();
        this.loginLink = page.locator('#login-line.new-user span', { hasText: /log.?in|تسجيل الدخول/i }).filter({ visible: true }).first();
        this.footer    = page.locator('#login-form-footer').first();
    }

    async waitForLoad(): Promise<void> {
        await this.ibanInput.waitFor({ state: 'visible', timeout: 15000 });
    }
}
