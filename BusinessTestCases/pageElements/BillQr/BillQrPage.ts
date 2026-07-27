import { type Page, type Locator } from '@playwright/test';

/** Bill QR scan result screen — Customer app (EMI-5903, EMI-5685). Same
 *  best-effort-guess caveat as PaymentLinkPage.ts: no page object existed for
 *  this screen anywhere in the repo before this file, every locator below is
 *  built directly from the ticket wording, not yet verified against a live
 *  build. Reconcile against the live DOM on first live run. */
export class BillQrPage {
    readonly page: Page;

    readonly loadingIndicator: Locator;
    readonly scanErrorMessage: Locator;
    readonly billSummarySection: Locator;
    readonly billAmountValue: Locator;
    readonly payButton: Locator;
    readonly backToFirstPageButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], [role="progressbar"]').first();
        this.scanErrorMessage = page.getByText(/internal server error|500|something went wrong/i).first();
        this.billSummarySection = page.locator('[class*="bill-summary"], [class*="summary"]').first();
        this.billAmountValue = page.locator('[class*="amount"]').first();
        this.payButton = page.getByRole('button', { name: /^pay$/i });
        this.backToFirstPageButton = page.getByRole('button', { name: /back|scan again|try again/i });
    }
}
