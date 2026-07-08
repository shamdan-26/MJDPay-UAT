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

        this.heading         = page.getByRole('heading', { name: 'Enter OTP' });
        this.instructionText = page.getByText(/A code has been sent to you/i);
        // Login's OTP screen exposes an accessible name; the forgot-password
        // modal's inputs don't, so match either shape.
        this.inputs = page.getByRole('textbox', { name: 'One time password input' })
            .or(page.locator('div.my-modal-container input'));
        this.countdownTimer = page.getByText(/Code ends/i);
        this.resendButton   = page.getByRole('button', { name: 'Click to resend' });
        // Login's screen labels this "Verify"; the forgot-password modal labels it "Confirm".
        this.verifyButton = page.getByRole('button', { name: /^(verify|confirm)$/i });
        this.cancelButton = page.getByRole('button', { name: /cancel/i });

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
