import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Beneficiary details screen — where the role-based approve / reject actions
 * live (EMI-4436). The AC table on that ticket names both endpoints and their
 * privileges:
 *   PUT /api/v1/beneficiary/approve → BILLER_APPROVE_BENEFICIARIES
 *   PUT /api/v1/beneficiary/reject  → BILLER_REJECT_BENEFICIARIES
 * and states the actions must be hidden once the beneficiary is approved.
 *
 * Also covers the fields EMI-5376 / EMI-5128 / EMI-5142 are about: the
 * identifier must render, and the ALIAS must be shown rather than the
 * company/brand name. EMI-4791 covers the contract attachment opening.
 *
 * Locators are best-effort — Beneficiary management sits in
 * QA-DATA-TESTID-HANDOFF.md §5 ("not yet covered").
 */
export class BeneficiaryDetailsPage {
    readonly page: Page;

    readonly detailsPanel: Locator;
    readonly aliasValue: Locator;
    readonly brandNameValue: Locator;
    readonly identifierValue: Locator;
    readonly statusBadge: Locator;

    readonly approveButton: Locator;
    readonly rejectButton: Locator;
    readonly confirmActionButton: Locator;

    readonly contractAttachmentLink: Locator;

    readonly successToast: Locator;
    readonly errorToast: Locator;
    readonly unauthorizedMessage: Locator;

    constructor(page: Page) {
        this.page = page;

        this.detailsPanel   = page.locator('[class*="beneficiary-details"], [class*="details-panel"]').first();
        this.aliasValue     = page.locator('[class*="alias"], [data-testid="beneficiary-alias"]').first();
        this.brandNameValue = page.locator('[class*="brand-name"], [data-testid="beneficiary-brand-name"]').first();
        this.identifierValue = page.locator('[class*="identifier"], [data-testid="beneficiary-identifier"]').first();
        this.statusBadge    = page.locator('[class*="status"]').first();

        this.approveButton = page.getByRole('button', { name: /^approve$/i }).first();
        this.rejectButton  = page.getByRole('button', { name: /^reject$/i }).first();
        this.confirmActionButton = page.getByRole('button', { name: /yes|confirm|ok/i }).last();

        this.contractAttachmentLink = page.getByRole('link', { name: /contract|attachment/i })
            .or(page.getByRole('button', { name: /contract|attachment|view\s*document/i })).first();

        this.successToast = page.getByTestId('toast-message').or(page.getByText(/successfully/i)).first();
        this.errorToast   = page.getByText(/error|failed|went wrong/i).first();
        this.unauthorizedMessage = page.getByText(/not authorized|check your permissions/i).first();
    }

    async open(rowText: string): Promise<void> {
        await this.page.getByText(rowText, { exact: false }).first().click();
        await expect(this.detailsPanel).toBeVisible({ timeout: 20000 });
    }

    async approve(): Promise<void> {
        await expect(this.approveButton).toBeVisible({ timeout: 15000 });
        await this.approveButton.click();
        if (await this.confirmActionButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await this.confirmActionButton.click();
        }
    }

    async reject(): Promise<void> {
        await expect(this.rejectButton).toBeVisible({ timeout: 15000 });
        await this.rejectButton.click();
        if (await this.confirmActionButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await this.confirmActionButton.click();
        }
    }
}
