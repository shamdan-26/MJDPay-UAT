import { type Page, type Locator } from '@playwright/test';

export class RegistrationNafathPage {
    readonly page: Page;

    // Header
    readonly logoImage: Locator;
    readonly logoLink: Locator;
    readonly enButton: Locator;
    readonly arabicButton: Locator;
    readonly themeToggle: Locator;

    // Step indicators
    readonly formEyebrow: Locator;
    readonly formTitle: Locator;
    readonly activeStep: Locator;
    readonly outerStepBar: Locator;

    // Nafath verification panel
    readonly nafathHeading: Locator;
    readonly instructionText: Locator;
    readonly step1Text: Locator;
    readonly step2Text: Locator;
    readonly step3Text: Locator;
    readonly redirectNote: Locator;
    readonly countdownTimer: Locator;
    readonly verifyButton: Locator;
    readonly resendButton: Locator;

    // Step navigation (shared across registration steps)
    readonly nextButton: Locator;
    readonly backButton: Locator;
    readonly loadingButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.logoImage = page.locator('#auth_header_logo[aria-label="MJD Pay"]');
        this.logoLink  = page.getByRole('link', { name: 'MJD Pay' });

        this.enButton     = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'EN' });
        this.arabicButton = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'العربية' });
        // Same post-mobile-step header as RegistrationInfoPage — match its locator strategy.
        this.themeToggle  = page.locator('button.mode-btn.header-icon-btn');

        this.formEyebrow = page.locator('#register-form-eyebrow');
        this.formTitle   = page.locator('#register-form-title');
        this.activeStep  = page.locator('.mp-step.is-active');
        this.outerStepBar = page.locator('.mp-stepbar .mp-step');

        // The app defaults to Arabic; the Nafath panel itself is bypassed in dev
        // (see waitForNafathPanel), so these English-only patterns are unverified
        // against a live Arabic render — reconcile against UAT on first real run.
        this.nafathHeading   = page.getByRole('heading', { name: /verify with nafath/i });
        this.instructionText = page.getByText(/choose the number that appears in front of you/i).first();
        this.step1Text = page.getByText(/open nafath app and sign in/i);
        this.step2Text = page.getByText(/select the number shown/i);
        this.step3Text = page.getByText(/^approve$/i);
        this.redirectNote   = page.getByText(/return to this page/i).first();
        this.countdownTimer = page.getByText(/\d{1,2}:\d{2}s/).first();
        this.verifyButton   = page.getByRole('button', { name: /^(verify|تحقق)$/i });
        this.resendButton   = page.getByRole('button', { name: /resend/i });

        this.nextButton    = page.getByRole('button', { name: /next|التالي/i });
        this.backButton    = page.getByRole('button', { name: /back|رجوع/i });
        this.loadingButton = page.getByRole('button', { name: /Loading|جاري التحميل/i });
    }

    /** Resolves true once the real Nafath verification panel (heading) renders,
     *  false if it never appears — some test accounts bypass NAFATH in UAT. */
    async waitForNafathPanel(): Promise<boolean> {
        return this.nafathHeading
            .waitFor({ state: 'visible', timeout: 20000 })
            .then(() => true)
            .catch(() => false);
    }
}
