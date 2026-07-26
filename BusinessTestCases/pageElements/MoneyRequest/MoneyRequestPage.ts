import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Money Request (EMI-834) — a wallet holder requests money from another
 * wallet holder, who can Accept (pay), Decline, or scan a generated QR to
 * pay. No page object/testid existed for this screen anywhere in the repo
 * before this file — same best-effort-locator caveat as CreateBillPage.ts /
 * QRPaymentPage.ts. Reconcile against the live DOM (or request testids from
 * FE) before relying on this for CI gating.
 */
export class MoneyRequestPage {
    readonly page: Page;

    // ---------- Requester: Request Creation ----------
    readonly recipientInput: Locator;
    readonly amountInput: Locator;
    readonly noteInput: Locator;
    readonly expiryInput: Locator;
    readonly generateQrToggle: Locator;
    readonly sendRequestButton: Locator;
    readonly requestConfirmationModal: Locator;
    readonly requestConfirmButton: Locator;

    // ---------- Requester: Requests Sent ----------
    readonly requestsSentTab: Locator;
    readonly requestsSentRows: Locator;
    readonly cancelRequestButton: Locator;

    // ---------- Requester: Generate/Share QR ----------
    readonly qrModal: Locator;
    readonly qrImage: Locator;
    readonly qrShareButton: Locator;
    readonly qrDownloadButton: Locator;
    readonly qrExpiryLabel: Locator;
    readonly qrOneTimeUseLabel: Locator;

    // ---------- Requested/Payer: Requests Received ----------
    readonly requestsReceivedTab: Locator;
    readonly requestsReceivedRows: Locator;
    readonly payButton: Locator;
    readonly declineButton: Locator;

    // ---------- Payer: Payment Summary ----------
    readonly paymentSummarySection: Locator;
    readonly amountRequestedRow: Locator;
    readonly commissionRow: Locator;
    readonly vatRow: Locator;
    readonly totalToDebitRow: Locator;
    readonly confirmAndPayButton: Locator;
    readonly cancelPaymentButton: Locator;
    readonly insufficientFundsError: Locator;
    readonly limitExceededError: Locator;

    // ---------- Result ----------
    readonly successHeading: Locator;
    readonly failureHeading: Locator;
    readonly transactionReferenceText: Locator;

    // ---------- Status badges ----------
    readonly statusBadge: Locator;

    constructor(page: Page) {
        this.page = page;

        this.recipientInput = page.getByLabel(/recipient|contact/i).or(page.getByPlaceholder(/search recipient/i));
        this.amountInput = page.getByTestId('amount-input').or(page.locator('#input_set_amount')).or(page.getByLabel(/^amount$/i));
        this.noteInput = page.getByLabel(/note/i);
        this.expiryInput = page.getByLabel(/expiry/i);
        this.generateQrToggle = page.getByRole('checkbox', { name: /generate qr/i }).or(page.getByText(/generate qr/i));
        this.sendRequestButton = page.getByRole('button', { name: /send request/i });
        this.requestConfirmationModal = page.locator('[role="dialog"], mat-dialog-container').filter({ hasText: /request/i }).first();
        this.requestConfirmButton = page.getByRole('button', { name: /confirm|send/i });

        this.requestsSentTab = page.getByRole('tab', { name: /requests sent/i }).or(page.getByText(/requests sent/i));
        this.requestsSentRows = page.locator('[class*="request-row"], [class*="request-card"]');
        this.cancelRequestButton = page.getByRole('button', { name: /^cancel$/i });

        this.qrModal = page.locator('[role="dialog"], mat-dialog-container').filter({ has: page.locator('img[alt*="QR" i], canvas') });
        this.qrImage = page.locator('img[alt*="QR" i], canvas[class*="qr" i]').first();
        this.qrShareButton = page.getByRole('button', { name: /share/i });
        this.qrDownloadButton = page.getByRole('button', { name: /download/i });
        this.qrExpiryLabel = page.getByText(/expires?/i);
        this.qrOneTimeUseLabel = page.getByText(/one[- ]time use/i);

        this.requestsReceivedTab = page.getByRole('tab', { name: /requests received/i }).or(page.getByText(/requests received/i));
        this.requestsReceivedRows = page.locator('[class*="request-row"], [class*="request-card"]');
        this.payButton = page.getByRole('button', { name: /^pay$/i });
        this.declineButton = page.getByRole('button', { name: /decline/i });

        this.paymentSummarySection = page.locator('[class*="payment-summary"], [class*="summary"]').first();
        this.amountRequestedRow = page.getByText(/amount requested/i);
        this.commissionRow = page.getByText(/commission/i);
        this.vatRow = page.getByText(/^vat$/i);
        this.totalToDebitRow = page.getByText(/total to debit|total amount/i);
        this.confirmAndPayButton = page.getByRole('button', { name: /confirm.*pay/i });
        this.cancelPaymentButton = page.getByRole('button', { name: /^cancel$/i });
        this.insufficientFundsError = page.getByText(/insufficient funds?/i);
        this.limitExceededError = page.getByText(/limit exceeded/i);

        this.successHeading = page.getByRole('heading', { name: /success|completed/i }).or(page.getByText(/payment (successful|completed)/i));
        this.failureHeading = page.getByRole('heading', { name: /failed/i }).or(page.getByText(/payment failed/i));
        this.transactionReferenceText = page.getByText(/reference/i);

        this.statusBadge = page.locator('[class*="status-badge"], [class*="status-chip"]');
    }

    async createRequest(recipient: string, amount: string, note?: string): Promise<void> {
        await expect(this.recipientInput).toBeVisible({ timeout: 15000 });
        await this.recipientInput.fill(recipient);
        await this.amountInput.fill(amount);
        if (note) await this.noteInput.fill(note);
        await this.sendRequestButton.click();
    }

    async toggleGenerateQr(): Promise<void> {
        await expect(this.generateQrToggle).toBeVisible({ timeout: 10000 });
        await this.generateQrToggle.click();
    }

    async openRequestsSent(): Promise<void> {
        await expect(this.requestsSentTab).toBeVisible({ timeout: 15000 });
        await this.requestsSentTab.click();
    }

    async openRequestsReceived(): Promise<void> {
        await expect(this.requestsReceivedTab).toBeVisible({ timeout: 15000 });
        await this.requestsReceivedTab.click();
    }

    async cancelFirstSentRequest(): Promise<void> {
        await this.requestsSentRows.first().locator('button', { hasText: /cancel/i }).click();
    }

    async payFirstReceivedRequest(): Promise<void> {
        await expect(this.requestsReceivedRows.first()).toBeVisible({ timeout: 15000 });
        await this.requestsReceivedRows.first().getByRole('button', { name: /^pay$/i }).click();
    }

    async declineFirstReceivedRequest(): Promise<void> {
        await expect(this.requestsReceivedRows.first()).toBeVisible({ timeout: 15000 });
        await this.requestsReceivedRows.first().getByRole('button', { name: /decline/i }).click();
    }

    async confirmPayment(): Promise<void> {
        await expect(this.confirmAndPayButton).toBeEnabled({ timeout: 15000 });
        await this.confirmAndPayButton.click();
    }

    async assertPaymentSucceeded(): Promise<void> {
        await expect(this.successHeading).toBeVisible({ timeout: 15000 });
    }

    async assertRequestStatus(expected: string): Promise<void> {
        await expect(this.statusBadge.filter({ hasText: new RegExp(expected, 'i') }).first()).toBeVisible({ timeout: 15000 });
    }
}
