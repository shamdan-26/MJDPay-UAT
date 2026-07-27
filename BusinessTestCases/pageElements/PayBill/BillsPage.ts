import { Page, Locator, expect } from '@playwright/test';

export class BillsPage {
    readonly page: Page;

    readonly receivedBillsTab: Locator;
    readonly billCards: Locator;
    readonly summaryPayButton: Locator;
    readonly confirmPayButton: Locator;
    readonly successPopupTitle: Locator;
    readonly goToHomeButton: Locator;
    readonly payAnotherBillButton: Locator;

    // Shared OTP modal (app-otp-modal — QA-DATA-TESTID-HANDOFF.md section 3)
    readonly otpInput: Locator;
    readonly otpSubmitButton: Locator;
    readonly otpCancelButton: Locator;
    readonly otpResendButton: Locator;

    // Shared toast (QA-DATA-TESTID-HANDOFF.md section 3)
    readonly toastMessage: Locator;

    // Bill QR scan / manual bill-number lookup (EMI-5144, EMI-5143) — Business
    // app side of Bill QR scanning. `bill-get-info-btn` is a confirmed testid
    // per QA-DATA-TESTID-HANDOFF.md §4.6; the rest are best-effort guesses,
    // same caveat as the OTP/toast locators above.
    readonly scanBillQrButton: Locator;
    readonly billNumberInput: Locator;
    readonly getBillInfoButton: Locator;
    readonly billLookupError: Locator;

    constructor(page: Page) {
        this.page = page;

        this.receivedBillsTab = page.getByRole('tab', { name: /received bills/i })
            .or(page.getByText(/received bills/i));
        this.billCards = page.locator('article.bill-mobile-card');

        this.summaryPayButton = page.locator('#btn_submit_summary');
        this.confirmPayButton = page.locator('#submit_btn_confirm');
        this.successPopupTitle = page.locator('.my-modal-title', { hasText: /Bill paid successfully/i });
        this.goToHomeButton = page.getByTestId('bill-payment-success-cancel-btn');
        this.payAnotherBillButton = page.getByTestId('bill-payment-success-submit-btn');

        this.otpInput = page.getByTestId('otp-input');
        this.otpSubmitButton = page.getByTestId('otp-submit-btn');
        this.otpCancelButton = page.getByTestId('otp-cancel-btn');
        this.otpResendButton = page.getByTestId('otp-resend-btn');

        this.toastMessage = page.getByTestId('toast-message');

        this.scanBillQrButton = page.getByRole('button', { name: /scan (bill )?qr/i })
            .or(page.getByText(/scan (bill )?qr/i));
        this.billNumberInput = page.getByLabel(/bill number/i).or(page.getByPlaceholder(/bill number/i));
        this.getBillInfoButton = page.getByTestId('bill-get-info-btn');
        this.billLookupError = page.getByText(/something went wrong|bill (could not be found|not found)/i).first();
    }

    async searchBillByNumber(billNumber: string): Promise<void> {
        await expect(this.billNumberInput).toBeVisible({ timeout: 15000 });
        await this.billNumberInput.fill(billNumber);
        await this.getBillInfoButton.click();
    }

    async openQrScanner(): Promise<void> {
        await expect(this.scanBillQrButton).toBeVisible({ timeout: 15000 });
        await this.scanBillQrButton.click();
    }

    async goToReceivedBills(): Promise<void> {
        await expect(this.receivedBillsTab).toBeVisible({ timeout: 15000 });
        await this.receivedBillsTab.click();
    }

    /** Clicks Pay on the first bill card matching `status` and returns its amount. */
    async initiateQuickPayment(status = 'Approved'): Promise<number> {
        await this.billCards.first().waitFor({ state: 'attached', timeout: 15000 });

        const billCard = this.billCards
            .filter({ has: this.page.locator('.grid-item-data', { hasText: new RegExp(status, 'i') }) })
            .first();

        try {
            await expect(billCard).toBeVisible({ timeout: 5000 });
        } catch {
            throw new Error(`No "${status}" bill found for the active merchant account — verify UAT data setup.`);
        }

        const amountText = await billCard.locator('.money-amount').textContent() ?? '0';
        const billAmount = parseFloat(amountText.replace(/[^\d.]/g, ''));

        await billCard.getByRole('button', { name: /^pay$/i }).click();
        return billAmount;
    }

    async isOtpModalDisplayed(): Promise<boolean> {
        return this.otpInput.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    }

    async fillAndSubmitOtp(otp: string): Promise<void> {
        await this.otpInput.click();
        await this.page.keyboard.type(otp, { delay: 50 });
        await this.otpSubmitButton.click();
    }

    async clickSummaryPayButton(): Promise<void> {
        await expect(this.summaryPayButton).toBeVisible({ timeout: 15000 });
        await this.summaryPayButton.click();
    }

    async clickConfirmPayButton(): Promise<void> {
        await expect(this.confirmPayButton).toBeVisible({ timeout: 15000 });
        await this.confirmPayButton.click();
    }

    /**
     * Confirms payment through summary → confirm popup → optional OTP → success popup → Go to Home.
     * `getOtp` is only invoked if the OTP modal actually appears, so callers can
     * pass a lazy DB lookup without paying its cost/latency on the no-OTP path.
     */
    async confirmPayment(getOtp: () => Promise<string> = async () => '0000'): Promise<void> {
        await this.clickSummaryPayButton();
        await this.clickConfirmPayButton();

        if (await this.isOtpModalDisplayed()) {
            await this.fillAndSubmitOtp(await getOtp());
        }

        await expect(this.successPopupTitle).toBeVisible({ timeout: 15000 });
        await expect(this.goToHomeButton).toBeVisible({ timeout: 10000 });
        await this.goToHomeButton.click();
    }

    async assertInsufficientFundToastDisplayed(): Promise<void> {
        await expect(this.toastMessage).toBeVisible({ timeout: 15000 });
        const text = (await this.toastMessage.textContent() ?? '').toLowerCase();
        expect(
            text.includes('insufficient') || text.includes('balance') || text.includes('fund'),
            `Expected an insufficient-fund toast, got: "${text}"`
        ).toBeTruthy();
    }
}
