import { type Page, type Locator } from '@playwright/test';

export class OtpPage {
    readonly page: Page;

    readonly heading: Locator;
    readonly instructionText: Locator;
    readonly inputs: Locator;
    readonly countdownTimer: Locator;
    readonly resendButton: Locator;
    readonly verifyButton: Locator;
    readonly cancelButton: Locator;

    // Only present when OTP entry is shown inside the forgot-password
    // "my-modal-container" popup rather than login's full-screen OTP step.
    readonly modalContainer: Locator;
    readonly closeButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.heading         = page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i });
        this.instructionText = page.getByText(/A code has been sent to you|تم إرسال رمز التحقق/i);
        // The shared OTP-modal testid (`otp-input`, QA-DATA-TESTID-HANDOFF.md §3) is
        // the wrapper element, not the individual boxes — the boxes themselves are
        // the ngx-otp-input library's inputs, which the handoff explicitly says have
        // no testid ("focus the block and type the code"). So `inputs` stays on the
        // per-box role/class locators rather than the wrapper testid, which wouldn't
        // work with per-box .fill()/.pressSequentially() calls anyway. Login's OTP
        // screen exposes an accessible name; the forgot-password modal's inputs
        // don't, so match either shape.
        this.inputs = page.getByRole('textbox', { name: 'One time password input' })
            .or(page.locator('div.my-modal-container input'));
        this.countdownTimer = page.getByText(/Code ends|ينتهي الرمز/i);
        // otp-resend-btn / otp-submit-btn / otp-cancel-btn: QA-DATA-TESTID-HANDOFF.md
        // §3 shared OTP-modal component — confirmed for the modal variant (used by
        // Bill Payment and, per gotoOtpModal()'s div.my-modal-container, ForgotPassword
        // too). Login's full-screen OTP step isn't in §4.1's testid table, so its
        // "Verify" button falls through to the role-based fallback below.
        this.resendButton   = page.getByTestId('otp-resend-btn')
            .or(page.getByRole('button', { name: /Click to resend|انقر لإعادة الإرسال/i }));
        // Login's screen labels this "Verify"; the forgot-password modal labels it "Confirm".
        this.verifyButton = page.getByTestId('otp-submit-btn')
            .or(page.getByRole('button', { name: /^(verify|confirm|تحقق)$/i }));
        this.cancelButton = page.getByTestId('otp-cancel-btn')
            .or(page.getByRole('button', { name: /cancel|إلغاء/i }));

        this.modalContainer = page.locator('div.my-modal-container');
        this.closeButton    = this.modalContainer.getByRole('button', { name: /close/i });
    }

    async isVisible(): Promise<boolean> {
        return this.heading.waitFor({ state: 'visible', timeout: 15000 })
            .then(() => true)
            .catch(() => false);
    }

    async fill(otp: string): Promise<void> {
        await this.inputs.first().waitFor({ state: 'visible', timeout: 10000 });
        const count = await this.inputs.count();
        for (let i = 0; i < count; i++) {
            await this.inputs.nth(i).pressSequentially(otp[i] ?? '0', { delay: 50 });
        }
    }

    async verify(): Promise<void> {
        if (await this.verifyButton.isVisible().catch(() => false)) {
            await this.verifyButton.click();
        }
    }

    async fillAndVerify(otp: string): Promise<void> {
        await this.fill(otp);
        await this.verify();
    }

    /** Parses the "Code ends in MM:SS" countdown text into remaining seconds. */
    async getRemainingSeconds(): Promise<number> {
        const text = await this.countdownTimer.textContent() ?? '';
        const match = text.match(/(\d+):(\d+)/);
        if (!match) return 0;
        return Number(match[1]) * 60 + Number(match[2]);
    }
}
