import { expect, type Page, type Locator } from '@playwright/test';

export class OtpPage {
    readonly page: Page;

    readonly heading: Locator;
    readonly instructionText: Locator;
    readonly inputs: Locator;
    readonly countdownTimer: Locator;
    readonly resendButton: Locator;
    readonly verifyButton: Locator;
    readonly cancelButton: Locator;
    readonly errorMessage: Locator;

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
        // Arabic copy on the Bank/W2W/Top-up inline OTP is "تنتهي صلاحية الرمز
        // خلال MM:SS" (confirmed live on dev, 2026-09-07); login/forgot-password
        // phrase it "Code ends in ...". Match the distinctive stem of either.
        this.countdownTimer = page.getByText(/Code ends|ينتهي الرمز|تنتهي صلاحية الرمز/i);
        // otp-resend-btn / otp-submit-btn / otp-cancel-btn: QA-DATA-TESTID-HANDOFF.md
        // §3 shared OTP-modal component — confirmed for the modal variant (used by
        // Bill Payment and, per gotoOtpModal()'s div.my-modal-container, ForgotPassword
        // too). Login's full-screen OTP step isn't in §4.1's testid table, so its
        // "Verify" button falls through to the role-based fallback below.
        //
        // The W2W / Bank-transfer / Top-up flows use a *different* inline OTP widget
        // (§3's own warning) with their own per-flow testids (§4.3/§4.4/§4.5) — this
        // class is shared by all of those flows too (see W2WTransferPage, BankTransferPage,
        // TopupPage, which all delegate OTP interaction here), so every flow-specific
        // testid is included alongside the shared-modal one. Only one will ever match on
        // a given screen; `.first()` keeps that safe even if more than one somehow did.
        this.resendButton = page.getByTestId('otp-resend-btn')
            .or(page.getByTestId('w2w-otp-resend-btn'))
            .or(page.getByTestId('bank-amount-otp-resend-btn'))
            .or(page.getByTestId('bank-confirm-otp-resend-btn'))
            .or(page.getByTestId('topup-otp-resend-btn'))
            .or(page.getByRole('button', { name: /Click to resend|انقر لإعادة الإرسال/i }))
            .first();
        // Login's screen labels this "Verify"; the forgot-password modal labels it "Confirm".
        this.verifyButton = page.getByTestId('otp-submit-btn')
            .or(page.getByTestId('w2w-otp-verify-btn'))
            .or(page.getByTestId('bank-amount-otp-verify-btn'))
            .or(page.getByTestId('bank-confirm-otp-verify-btn'))
            .or(page.getByTestId('topup-otp-verify-btn'))
            .or(page.getByRole('button', { name: /^(verify|confirm|تحقق)$/i }))
            .first();
        this.cancelButton = page.getByTestId('otp-cancel-btn')
            .or(page.getByTestId('w2w-otp-cancel-btn'))
            .or(page.getByTestId('bank-amount-otp-cancel-btn'))
            .or(page.getByTestId('bank-confirm-otp-cancel-btn'))
            .or(page.getByTestId('topup-otp-cancel-btn'))
            .or(page.getByRole('button', { name: /cancel|إلغاء/i }))
            .first();

        this.modalContainer = page.locator('div.my-modal-container');
        this.closeButton    = this.modalContainer.getByRole('button', { name: /close/i });

        // Wrong-OTP feedback (EMI-TC-3125 "Invalid OTP. Please try again." and the
        // message shown after the 3rd failed attempt before the flow resets). The
        // Bank/W2W/Top-up inline widget renders it as .mp-otp-error / an alert;
        // match the distinctive copy in either language plus those containers.
        this.errorMessage = page.getByText(/invalid otp|otp is (?:invalid|incorrect)|please try again|رمز(?:\s|.)*غير صحيح|رمز التحقق غير صحيح|حاول مرة أخرى|المحاولة مرة أخرى/i)
            .or(page.locator('.mp-otp-error, [role="alert"]'));
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

    /**
     * Most OTP widgets (transfer, top-up, bill payment, QR) AUTO-SUBMIT on the last digit; the login and forgot-password
     * screens do not (seen live: all 6 digits typed, Verify still enabled, nothing sent). So: give the auto-submit a few
     * seconds to show itself (button gone, disabled or loading) and never click in that case; only when nothing happened
     * press the idle, enabled button once.
     */
    async verify(): Promise<void> {
        const inFlight = async (): Promise<boolean> => {
            if (!(await this.verifyButton.isVisible().catch(() => false))) return true;      // advanced to the next step
            const cls = (await this.verifyButton.getAttribute('class').catch(() => null)) ?? '';
            if (/(is-loading|processing|loading|submitting)/i.test(cls)) return true;   // request in flight
            return !(await this.verifyButton.isEnabled().catch(() => true));                  // disabled after submit
        };
        const autoSubmitted = await expect.poll(inFlight, { timeout: 3000 }).toBe(true).then(() => true).catch(() => false);
        if (autoSubmitted) return;
        await this.verifyButton.click({ timeout: 5000 }).catch(() => { /* auto-submitted mid-click */ });
    }

    async fillAndVerify(otp: string): Promise<void> {
        await this.fill(otp);
        await this.verify();
    }

    /**
     * Parses the "Code ends in MM:SS" countdown text into remaining seconds.
     * Bounded read — returns 0 rather than hanging to the test timeout if the
     * countdown element can't be found (e.g. a copy change the locator misses).
     */
    async getRemainingSeconds(): Promise<number> {
        const text = await this.countdownTimer.textContent({ timeout: 10000 }).catch(() => '') ?? '';
        const match = text.match(/(\d+):(\d+)/);
        if (!match) return 0;
        return Number(match[1]) * 60 + Number(match[2]);
    }
}
