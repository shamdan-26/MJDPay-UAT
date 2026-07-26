import { type Page, type Locator, expect } from '@playwright/test';

/**
 * SADAD bill top-up (EMI-3564 — "Top-up via SADAD bill"), status "To Do" in
 * Jira at the time this was authored. No page object, helper, or data-testid
 * exists anywhere in this repo for this screen yet (QA-DATA-TESTID-HANDOFF.md
 * §5 doesn't cover it either), so every locator below is a best-effort guess
 * from the ticket's AC/workflow wording, following the sibling TopupPage.ts's
 * structure — same caveat as PaymentLinkPage.ts: reconcile against the real
 * DOM (or request testids from FE) before relying on this for CI gating.
 */
export class TopupSadadPage {
    readonly page: Page;

    readonly sadadOption: Locator;
    readonly amountInput: Locator;
    readonly generateBillButton: Locator;

    readonly billReference: Locator;
    readonly billAmount: Locator;
    readonly billExpiryDate: Locator;
    readonly downloadPdfButton: Locator;
    readonly copyReferenceButton: Locator;
    readonly billCreationError: Locator;

    readonly myBillsTab: Locator;
    readonly billRows: Locator;

    constructor(page: Page) {
        this.page = page;

        this.sadadOption = page.getByRole('radio', { name: /sadad/i })
            .or(page.locator('label', { hasText: /sadad/i })).first();

        this.amountInput = page.getByTestId('amount-input')
            .or(page.locator('#input_set_amount'))
            .or(page.locator('input[placeholder="0.00"]'));

        this.generateBillButton = page.getByRole('button', { name: /generate|create bill|proceed/i });

        this.billReference = page.getByText(/reference/i).locator('xpath=following-sibling::*[1]')
            .or(page.locator('[class*="bill-reference"]'));
        this.billAmount = page.locator('[class*="bill-amount"]');
        this.billExpiryDate = page.getByText(/expiry|due date/i);
        this.downloadPdfButton = page.getByRole('button', { name: /download pdf/i });
        this.copyReferenceButton = page.getByRole('button', { name: /copy reference/i });
        this.billCreationError = page.getByText(/could not generate|failed to create|something went wrong/i).first();

        this.myBillsTab = page.getByRole('tab', { name: /my sadad bills/i })
            .or(page.getByText(/my sadad bills/i));
        this.billRows = page.locator('[class*="sadad-bill-row"], article.bill-mobile-card');
    }

    async selectSadad(): Promise<void> {
        await expect(this.sadadOption).toBeVisible({ timeout: 15000 });
        await this.sadadOption.click();
    }

    async enterAmount(amount: string): Promise<void> {
        await expect(this.amountInput).toBeVisible({ timeout: 15000 });
        await this.amountInput.clear();
        await this.amountInput.pressSequentially(amount);
    }

    async clickGenerateBill(): Promise<void> {
        await expect(this.generateBillButton).toBeEnabled({ timeout: 15000 });
        await this.generateBillButton.click();
    }

    async assertBillGenerated(): Promise<void> {
        await expect(this.billReference).toBeVisible({ timeout: 15000 });
        await expect(this.billAmount).toBeVisible();
        await expect(this.billExpiryDate).toBeVisible();
    }

    async openMyBills(): Promise<void> {
        await expect(this.myBillsTab).toBeVisible({ timeout: 15000 });
        await this.myBillsTab.click();
    }

    async getBillRowCount(): Promise<number> {
        return this.billRows.count();
    }
}
