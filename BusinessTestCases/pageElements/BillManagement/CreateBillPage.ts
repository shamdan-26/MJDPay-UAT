import { type Page, type Locator, expect } from '@playwright/test';
import type { NewBillInput } from '../../BillManagement/BillManagementHelper';

/**
 * Create Bill / Bill Management (EMI-183, EMI-242, EMI-3020). No page object
 * existed for this screen anywhere in the repo before this file, and it isn't
 * in QA-DATA-TESTID-HANDOFF.md §4 (only the "not yet covered" §5 list applies)
 * — every locator below is a best-effort guess built directly from the
 * ticket's field-by-field AC wording, same caveat as PaymentLinkPage.ts.
 * Reconcile against the live DOM (or request testids from FE) before relying
 * on this for CI gating.
 */
export class CreateBillPage {
    readonly page: Page;

    // Entry point — Single vs Detailed bill entry
    readonly singleBillEntryTab: Locator;
    readonly detailedBillEntryTab: Locator;
    readonly bulkUploadTab: Locator;

    // Single/Master bill fields
    readonly beneficiaryPicker: Locator;
    readonly billRefInput: Locator;
    readonly amountInput: Locator;
    readonly discountTypeSelect: Locator;
    readonly discountValueInput: Locator;
    readonly applyVatCheckbox: Locator;
    readonly issueDateInput: Locator;
    readonly expiryDateInput: Locator;
    readonly descriptionInput: Locator;

    // Detailed entry — items section
    readonly addItemButton: Locator;
    readonly itemRows: Locator;
    readonly deleteItemButton: Locator;
    readonly deleteLastItemConfirmDialog: Locator;
    readonly deleteLastItemConfirmButton: Locator;

    // Predefined products (EMI-3020)
    readonly productMultiSelect: Locator;
    readonly productSearchInput: Locator;
    readonly productOptions: Locator;

    // Confirmation summary
    readonly summarySection: Locator;
    readonly summaryTotalAmount: Locator;
    readonly submitBillButton: Locator;
    readonly vatAmountValue: Locator;
    readonly grandTotalValue: Locator;
    readonly applyDiscountButton: Locator;
    readonly discountSummaryText: Locator;
    readonly noDiscountText: Locator;

    // Edit flow (EMI-5809, EMI-5893, EMI-5812, EMI-5863, EMI-5776)
    readonly editSubmitButton: Locator;
    readonly editGenericError: Locator;
    readonly expiredBillEditBlockedMessage: Locator;

    // Bulk upload (EMI-242)
    readonly fileUploadInput: Locator;
    readonly uploadSubmitButton: Locator;
    readonly uploadErrorMessage: Locator;
    readonly uploadSuccessMessage: Locator;

    // Result / validation
    readonly requiredFieldError: Locator;
    readonly successToast: Locator;

    constructor(page: Page) {
        this.page = page;

        this.singleBillEntryTab   = page.getByRole('tab', { name: /single bill entry/i }).or(page.getByText(/single bill entry/i));
        this.detailedBillEntryTab = page.getByRole('tab', { name: /detailed bill entry/i }).or(page.getByText(/detailed bill entry/i));
        this.bulkUploadTab        = page.getByRole('tab', { name: /bulk upload|excel/i }).or(page.getByText(/bulk upload|upload via excel/i));

        this.beneficiaryPicker = page.getByLabel(/beneficiary/i).or(page.getByPlaceholder(/select beneficiary/i));
        this.billRefInput      = page.getByLabel(/bill ref/i).or(page.getByPlaceholder(/bill ref/i));
        this.amountInput       = page.getByTestId('amount-input').or(page.locator('#input_set_amount')).or(page.getByLabel(/^amount$/i));
        this.discountTypeSelect = page.getByLabel(/discount type/i).or(page.locator('mat-select[id*="discount"]'));
        this.discountValueInput = page.getByLabel(/discount (value|amount)/i);
        this.applyVatCheckbox   = page.getByRole('checkbox', { name: /apply 15% vat/i });
        this.issueDateInput     = page.getByLabel(/issue date/i);
        this.expiryDateInput    = page.getByLabel(/expiry date/i);
        this.descriptionInput   = page.getByLabel(/description/i);

        this.addItemButton   = page.getByRole('button', { name: /add item/i });
        this.itemRows        = page.locator('[class*="bill-item-row"]');
        this.deleteItemButton = page.getByRole('button', { name: /delete item|remove item/i });
        this.deleteLastItemConfirmDialog = page.getByText(/bill amount will become 0/i);
        this.deleteLastItemConfirmButton = page.getByRole('button', { name: /yes|confirm|proceed/i });

        this.productMultiSelect = page.getByLabel(/products|select products/i);
        this.productSearchInput = page.getByPlaceholder(/search products/i);
        this.productOptions     = page.getByRole('option');

        this.summarySection     = page.locator('[class*="bill-confirmation"], [class*="summary"]').first();
        this.summaryTotalAmount = page.getByText(/total amount/i).locator('xpath=following-sibling::*[1]').or(page.locator('.money-amount').last());
        this.submitBillButton   = page.getByRole('button', { name: /submit|save|create bill/i });
        this.vatAmountValue     = page.getByText(/vat amount/i).locator('xpath=following-sibling::*[1]');
        this.grandTotalValue    = page.getByText(/grand total/i).locator('xpath=following-sibling::*[1]');
        this.applyDiscountButton = page.getByRole('button', { name: /apply discount/i });
        this.discountSummaryText = page.locator('[class*="discount-summary"], [class*="discount-section"]').first();
        this.noDiscountText     = page.getByText(/no discount/i);

        this.editSubmitButton   = page.getByRole('button', { name: /^(save changes|update bill|submit)$/i });
        this.editGenericError   = page.getByText(/an unexpected error occured|400 bad request/i);
        this.expiredBillEditBlockedMessage = page.getByText(/expired bills? (cannot|can not|can't) be edited/i);

        this.fileUploadInput    = page.locator('input[type="file"]');
        this.uploadSubmitButton = page.getByRole('button', { name: /upload/i });
        this.uploadErrorMessage = page.getByText(/tampered|checksum|invalid file|failed to process/i).first();
        this.uploadSuccessMessage = page.getByText(/bills? (created|uploaded) successfully/i);

        this.requiredFieldError = page.getByText(/is required|field is required/i).first();
        this.successToast       = page.getByTestId('toast-message');
    }

    async openSingleBillEntry(): Promise<void> {
        await expect(this.singleBillEntryTab).toBeVisible({ timeout: 15000 });
        await this.singleBillEntryTab.click();
    }

    async openDetailedBillEntry(): Promise<void> {
        await expect(this.detailedBillEntryTab).toBeVisible({ timeout: 15000 });
        await this.detailedBillEntryTab.click();
    }

    async openBulkUpload(): Promise<void> {
        await expect(this.bulkUploadTab).toBeVisible({ timeout: 15000 });
        await this.bulkUploadTab.click();
    }

    async fillMasterBillInfo(bill: NewBillInput): Promise<void> {
        await expect(this.beneficiaryPicker).toBeVisible({ timeout: 15000 });
        await this.beneficiaryPicker.fill(bill.beneficiary);
        await this.billRefInput.fill(bill.billRef);
        await this.amountInput.fill(bill.amount);

        if (bill.discountType && bill.discountType !== 'None') {
            await this.discountTypeSelect.click();
            await this.page.getByRole('option', { name: bill.discountType }).click();
            if (bill.discountValue) await this.discountValueInput.fill(bill.discountValue);
        }

        if (bill.applyVat === false) {
            await this.applyVatCheckbox.uncheck();
        }

        if (bill.issueDate) await this.issueDateInput.fill(bill.issueDate);
        if (bill.expiryDate) await this.expiryDateInput.fill(bill.expiryDate);
        if (bill.description) await this.descriptionInput.fill(bill.description);
    }

    async submitAndExpectSummary(): Promise<void> {
        await this.submitBillButton.click();
        await expect(this.summarySection).toBeVisible({ timeout: 15000 });
    }

    async selectProduct(productName: string): Promise<void> {
        await expect(this.productMultiSelect).toBeVisible({ timeout: 15000 });
        await this.productMultiSelect.click();
        await this.productSearchInput.fill(productName);
        await this.productOptions.filter({ hasText: productName }).first().click();
    }

    async deleteLastRemainingItem(): Promise<void> {
        await this.deleteItemButton.last().click();
        await expect(this.deleteLastItemConfirmDialog).toBeVisible({ timeout: 10000 });
        await this.deleteLastItemConfirmButton.click();
    }

    async uploadExcelFile(filePath: string): Promise<void> {
        await this.fileUploadInput.setInputFiles(filePath);
        await this.uploadSubmitButton.click();
    }

    /** Toggles the "Apply 15% VAT" checkbox on/off, without touching the discount fields. */
    async toggleVat(): Promise<void> {
        await expect(this.applyVatCheckbox).toBeVisible({ timeout: 10000 });
        await this.applyVatCheckbox.click();
    }

    /** Submits the edit form (EMI-5809/EMI-5776 — distinct button/label from initial creation). */
    async submitEdit(): Promise<void> {
        await this.editSubmitButton.click();
    }

    async assertRequiredFieldBlocksSubmit(): Promise<void> {
        await expect(this.submitBillButton).toBeDisabled({ timeout: 5000 })
            .catch(async () => {
                await this.submitBillButton.click();
                await expect(this.requiredFieldError).toBeVisible({ timeout: 10000 });
            });
    }
}
