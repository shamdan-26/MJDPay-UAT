import { type Page, type Locator } from '@playwright/test';

/** Authored from the Sprint 71 ticket text for EMI-5463 / EMI-5791–5794
 *  (payment-link resolution, payment, and the payer-info-removal update).
 *  This is a Customer-app flow with no page object anywhere else in this
 *  Business Portal repo, so every locator here is a best-effort guess from
 *  the ticket's step/expected-result wording — not yet verified against a
 *  live build. Reconcile against the real DOM on first live run, same
 *  caveat as ProductsManagementPage.ts / RegistrationProductsPage.ts. */
export class PaymentLinkPage {
    readonly page: Page;

    // Resolution / error states
    readonly loadingIndicator: Locator;
    readonly invalidLinkError: Locator;

    // Summary
    readonly summarySection: Locator;
    readonly linkTypeLabel: Locator;
    readonly amountValue: Locator;

    // Payer info form (pre-EMI-5791..5794 flow)
    readonly payerInfoSection: Locator;
    readonly mobileInput: Locator;
    readonly emailInput: Locator;
    readonly nameInput: Locator;
    readonly nationalIdInput: Locator;
    readonly paymentMethodGroup: Locator;
    readonly continueButton: Locator;

    // Wallet-link amount entry
    readonly amountInput: Locator;
    readonly amountError: Locator;

    // Result
    readonly resultHeading: Locator;
    readonly resultSuccessIcon: Locator;
    readonly resultFailureIcon: Locator;

    // Incomplete-owner-profile error (EMI-5791..5794)
    readonly incompleteProfileError: Locator;

    constructor(page: Page) {
        this.page = page;

        this.loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], [role="progressbar"]').first();
        this.invalidLinkError = page.getByText(/invalid|expired|disabled|not found/i).first();

        this.summarySection = page.locator('[class*="summary"]').first();
        this.linkTypeLabel  = page.getByText(/bill payment|wallet transfer/i).first();
        this.amountValue    = page.locator('[class*="amount"]').first();

        this.payerInfoSection  = page.getByText(/payer information|your information/i).first();
        this.mobileInput       = page.getByRole('textbox', { name: /mobile/i });
        this.emailInput        = page.getByRole('textbox', { name: /email/i });
        this.nameInput         = page.getByRole('textbox', { name: /^name|full name/i });
        this.nationalIdInput   = page.getByRole('textbox', { name: /national id/i });
        this.paymentMethodGroup = page.getByRole('radiogroup', { name: /payment method/i })
            .or(page.getByRole('group', { name: /payment method/i }));
        this.continueButton    = page.getByRole('button', { name: /^(continue|next|pay)$/i });

        this.amountInput = page.getByRole('textbox', { name: /^amount$/i })
            .or(page.getByRole('spinbutton', { name: /^amount$/i }));
        this.amountError = page.getByText(/minimum|maximum|amount (must|should)/i).first();

        this.resultHeading      = page.getByRole('heading', { name: /payment (successful|failed|complete)/i });
        this.resultSuccessIcon  = page.locator('[class*="success"]').first();
        this.resultFailureIcon  = page.locator('[class*="fail"], [class*="error"]').first();

        this.incompleteProfileError = page.getByText(/profile (information )?is incomplete|missing (required )?information/i).first();
    }
}
