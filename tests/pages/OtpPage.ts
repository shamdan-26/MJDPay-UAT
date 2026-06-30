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

    constructor(page: Page) {
        this.page = page;

        this.heading         = page.getByRole('heading', { name: 'Enter OTP' });
        this.instructionText = page.getByText(/A code has been sent to you/);
        this.inputs          = page.getByRole('textbox', { name: 'One time password input' });
        this.countdownTimer  = page.getByText(/Code ends/i);
        this.resendButton    = page.getByRole('button', { name: 'Click to resend' });
        this.verifyButton    = page.getByRole('button', { name: 'Verify' });
        this.cancelButton    = page.getByRole('button', { name: /cancel/i });
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
}
