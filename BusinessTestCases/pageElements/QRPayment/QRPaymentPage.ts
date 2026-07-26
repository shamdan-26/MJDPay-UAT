import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Wallet Payment QR screen (EMI-590 / EMI-3545 / EMI-922). No prior page
 * object exists for this screen and it isn't in QA-DATA-TESTID-HANDOFF.md §4
 * (only §5's "not yet covered" list applies) — every locator below is a
 * best-effort guess from the ticket AC wording, same caveat as
 * PaymentLinkPage.ts. Reconcile against the live DOM (or request testids from
 * FE) before relying on this for CI gating.
 */
export class QRPaymentPage {
    readonly page: Page;

    // Entry / mode selection
    readonly scanQrEntry: Locator;
    readonly dynamicQrOption: Locator;
    readonly walletQrOption: Locator;
    readonly cameraView: Locator;

    // Post-scan screen
    readonly recipientNameMasked: Locator;
    readonly amountInput: Locator;
    readonly invalidQrError: Locator;

    // Confirmation / OTP / result
    readonly proceedButton: Locator;
    readonly confirmPayButton: Locator;
    readonly successHeading: Locator;
    readonly toastMessage: Locator;

    // Dynamic QR generation (merchant/customer side)
    readonly generateDynamicQrButton: Locator;
    readonly generateAmountInput: Locator;
    readonly generateReferenceInput: Locator;
    readonly generatedQrImage: Locator;

    constructor(page: Page) {
        this.page = page;

        this.scanQrEntry = page.getByRole('button', { name: /scan qr|pay via qr/i })
            .or(page.getByText(/generate a wallet qr/i));
        this.dynamicQrOption = page.getByRole('radio', { name: /dynamic qr|amount qr/i })
            .or(page.getByText(/^amount qr$/i));
        this.walletQrOption = page.getByRole('radio', { name: /wallet qr/i })
            .or(page.getByText(/^wallet qr$/i));
        this.cameraView = page.locator('video, [class*="camera"], [class*="scanner"]').first();

        this.recipientNameMasked = page.locator('[class*="wallet-name"], [class*="merchant-name"]').first();
        this.amountInput = page.getByTestId('amount-input')
            .or(page.locator('#input_set_amount'))
            .or(page.locator('input[placeholder="0.00"]'));
        this.invalidQrError = page.getByText(/invalid or expired qr/i);

        this.proceedButton = page.getByRole('button', { name: /proceed/i });
        this.confirmPayButton = page.getByRole('button', { name: /^pay$|confirm/i });
        this.successHeading = page.getByRole('heading', { name: /payment (successful|complete)/i })
            .or(page.getByText(/payment (successful|complete)/i));
        this.toastMessage = page.getByTestId('toast-message');

        this.generateDynamicQrButton = page.getByRole('button', { name: /generate qr|create dynamic qr/i });
        this.generateAmountInput = page.getByLabel(/amount/i).first();
        this.generateReferenceInput = page.getByLabel(/reference/i).first();
        this.generatedQrImage = page.locator('img[alt*="QR" i], canvas[class*="qr" i]').first();
    }

    async openScanner(): Promise<void> {
        await expect(this.scanQrEntry).toBeVisible({ timeout: 15000 });
        await this.scanQrEntry.click();
    }

    async selectDynamicQrMode(): Promise<void> {
        await expect(this.dynamicQrOption).toBeVisible({ timeout: 10000 });
        await this.dynamicQrOption.click();
    }

    async selectWalletQrMode(): Promise<void> {
        await expect(this.walletQrOption).toBeVisible({ timeout: 10000 });
        await this.walletQrOption.click();
    }

    /** Triggers the app's post-scan state — real camera input can't be driven by Playwright, so
     *  callers pair this with QRPaymentHelper.mockQrDecode() to control what the "scan" returns. */
    async waitForPostScanScreen(): Promise<void> {
        await expect(this.recipientNameMasked).toBeVisible({ timeout: 15000 });
    }

    async enterAmount(amount: string): Promise<void> {
        await expect(this.amountInput).toBeVisible({ timeout: 10000 });
        await this.amountInput.clear();
        await this.amountInput.pressSequentially(amount);
    }

    async assertAmountFieldDisabled(): Promise<void> {
        await expect(this.amountInput).toBeDisabled({ timeout: 10000 });
    }

    async assertAmountFieldEditable(): Promise<void> {
        await expect(this.amountInput).toBeEnabled({ timeout: 10000 });
    }

    async clickProceed(): Promise<void> {
        await expect(this.proceedButton).toBeEnabled({ timeout: 15000 });
        await this.proceedButton.click();
    }

    async clickConfirmPay(): Promise<void> {
        await expect(this.confirmPayButton).toBeEnabled({ timeout: 15000 });
        await this.confirmPayButton.click();
    }

    async assertPaymentSucceeded(): Promise<void> {
        await expect(this.successHeading).toBeVisible({ timeout: 15000 });
    }

    async assertInvalidOrExpiredQr(): Promise<void> {
        await expect(this.invalidQrError).toBeVisible({ timeout: 15000 });
    }

    async generateDynamicQr(amount: string, reference: string): Promise<void> {
        await expect(this.generateAmountInput).toBeVisible({ timeout: 15000 });
        await this.generateAmountInput.fill(amount);
        await this.generateReferenceInput.fill(reference);
        await this.generateDynamicQrButton.click();
        await expect(this.generatedQrImage).toBeVisible({ timeout: 15000 });
    }
}
