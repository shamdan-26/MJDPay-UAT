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
        // (see waitForNafathPanel). Confirmed live against UAT: the heading reads
        // "التحقق عبر نَفاذ" (Verify via Nafath) — "نَفاذ" renders with a combining
        // Fatha diacritic (U+064E) that a plain "نفاذ" substring won't match, hence
        // the [ً-ْ]? (Arabic diacritics range) between ن and فاذ below.
        this.nafathHeading   = page.getByRole('heading', { name: /verify with nafath|التحقق عبر ن[ً-ْ]?فاذ/i });
        this.instructionText = page.getByText(/choose the number that appears in front of you|اختر الرقم الظاهر/i).first();
        this.step1Text = page.getByText(/open nafath app and sign in|افتح تطبيق ن[ً-ْ]?فاذ/i);
        this.step2Text = page.getByText(/select the number shown|اختر الرقم الظاهر/i);
        this.step3Text = page.getByText(/^approve$|موافقة/i);
        this.redirectNote   = page.getByText(/return to this page|العودة إلى هذه الصفحة/i).first();
        this.countdownTimer = page.getByText(/\d{1,2}:\d{2}s/).first();
        this.verifyButton   = page.getByRole('button', { name: /^(verify|تحقق)$/i });
        this.resendButton   = page.getByRole('button', { name: /resend/i });

        this.nextButton    = page.getByRole('button', { name: /next|التالي/i });
        this.backButton    = page.getByRole('button', { name: /back|رجوع/i });
        this.loadingButton = page.getByRole('button', { name: /Loading|جاري التحميل/i });
    }

    /** Seconds currently left on the redirect countdown ("mm:ss" + "s"), or null if it isn't readable.
     *  The duration is not fixed, so callers must read it at runtime. */
    async getCountdownSeconds(): Promise<number | null> {
        const text = await this.countdownTimer.textContent({ timeout: 1000 }).catch(() => null);
        const m = text?.match(/(\d{1,2}):(\d{2})s/);
        return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    }

    /** Waits for the Verify button to enable, taking the countdown on the spot: the timer is
     *  polled until it renders, then re-read on every tick, so the deadline follows whatever
     *  the page is actually counting down from (no assumed duration). Returns the first
     *  seconds value read, or null if the timer never became readable. */
    async waitForCountdownToFinish(bufferSeconds = 10): Promise<number | null> {
        let initial: number | null = null;
        let deadline = Date.now() + 15_000; // time allowed for the timer to render
        while (Date.now() < deadline) {
            if (await this.verifyButton.isEnabled().catch(() => false)) return initial;
            const remaining = await this.getCountdownSeconds();
            if (remaining !== null) {
                initial ??= remaining;
                deadline = Date.now() + (remaining + bufferSeconds) * 1000; // re-based on the live reading
            }
            await this.page.waitForTimeout(500);
        }
        return initial;
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
