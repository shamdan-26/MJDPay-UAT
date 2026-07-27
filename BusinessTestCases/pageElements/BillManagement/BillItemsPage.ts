import { type Page, type Locator, expect } from '@playwright/test';
import type { BillItemInput } from '../../BillManagement/BillManagementHelper';

/**
 * Detailed Bill — line items (the "Add Items" / "Item Info" steps and the
 * item-level add/edit/delete forms).
 *
 * Split out of CreateBillPage.ts because the item sub-form and item table are
 * a distinct screen with their own fields, their own validation and their own
 * ticket history — CreateBillPage covers the *master* bill fields only.
 *
 * Tickets covered here: EMI-1679, EMI-1709, EMI-1912, EMI-1930, EMI-1935,
 * EMI-1988, EMI-2100, EMI-2298, EMI-2590, EMI-2952, EMI-3060, EMI-3118,
 * EMI-3119, EMI-3270, EMI-3282, EMI-3305, EMI-3323, EMI-3383, EMI-3630,
 * EMI-3631, EMI-3957, EMI-3961, EMI-3965, EMI-4069, EMI-4071, EMI-4123,
 * EMI-4179, EMI-4991, EMI-5030, EMI-5319, MJDPAY-775.
 *
 * SAME LOCATOR CAVEAT AS CreateBillPage.ts / BillsListPage.ts: these screens
 * are not in QA-DATA-TESTID-HANDOFF.md §4, so every locator below is a
 * best-effort guess derived from each ticket's wording. Reconcile against the
 * live DOM (or request testids from FE) before using this for CI gating.
 */
export class BillItemsPage {
    readonly page: Page;

    // Step navigation — Step 2 "Add Items", Step 3 "Item Info" (EMI-3631)
    readonly addItemsStepHeader: Locator;
    readonly itemInfoStepHeader: Locator;
    readonly nextStepButton: Locator;
    readonly backButton: Locator;

    // Add / edit item form
    readonly addItemButton: Locator;
    /** The explicit "Add Item to List" commit button, kept separate from `addItemButton` (which also matches the form-opening "Add Item") because EMI-1930 / MJDPAY-775 assert on its enabled state. */
    readonly addItemToListButton: Locator;
    readonly itemNameInput: Locator;
    readonly quantityInput: Locator;
    readonly unitPriceInput: Locator;
    readonly itemDiscountTypeSelect: Locator;
    readonly itemDiscountValueInput: Locator;
    readonly itemVatInput: Locator;
    readonly saveItemButton: Locator;

    // Item table
    readonly itemsTable: Locator;
    readonly itemRows: Locator;
    readonly itemEditIcon: Locator;
    readonly itemDeleteIcon: Locator;
    readonly deleteAllItemsButton: Locator;
    readonly itemTotalCell: Locator;
    readonly emptyItemsMessage: Locator;

    // Predefined products added as items (EMI-3060, EMI-3118, EMI-3119)
    readonly addFromProductButton: Locator;
    readonly productOptions: Locator;

    // Delete confirmation (EMI-1988, EMI-2590)
    readonly lastItemConfirmDialog: Locator;
    readonly lastItemConfirmMessage: Locator;
    readonly confirmDeleteButton: Locator;
    readonly cancelDeleteButton: Locator;

    // Validation messages
    readonly atLeastOneItemError: Locator;
    readonly itemAmountValidationError: Locator;
    readonly vatRequiredError: Locator;
    readonly billDiscountExceedsTotalError: Locator;
    readonly itemRequiredFieldError: Locator;

    // Edit-bill step navigation (EMI-1912)
    readonly goToEditItemButton: Locator;
    readonly goToEditBillButton: Locator;

    // Bill summary / calculation output (EMI-2298, EMI-3270, EMI-3965)
    readonly summaryDiscountAmount: Locator;
    readonly summaryVatAmount: Locator;
    readonly summaryCommissionAmount: Locator;
    readonly summaryTotalAmount: Locator;
    readonly itemDetailsViewMoreButton: Locator;
    readonly itemDetailsDiscountAmount: Locator;

    constructor(page: Page) {
        this.page = page;

        this.addItemsStepHeader = page.getByText(/add items/i).first();
        this.itemInfoStepHeader = page.getByText(/item info/i).first();
        this.nextStepButton = page.getByRole('button', { name: /^(next|continue)$/i });
        this.backButton = page.getByRole('button', { name: /^back$/i });

        this.addItemButton = page.getByRole('button', { name: /add item(?! to list)|add item to list/i }).first();
        this.addItemToListButton = page.getByRole('button', { name: /add item to list|add new item/i }).first();
        this.itemNameInput = page.getByLabel(/item name|description/i).first();
        this.quantityInput = page.getByLabel(/quantity|qty/i).first();
        this.unitPriceInput = page.getByLabel(/unit price/i).first();
        this.itemDiscountTypeSelect = page.getByLabel(/discount type/i).last();
        this.itemDiscountValueInput = page.getByLabel(/discount (amount|value)/i).last();
        this.itemVatInput = page.getByLabel(/^vat/i).first();
        this.saveItemButton = page.getByRole('button', { name: /^(save|add|done|save item)$/i }).first();

        this.itemsTable = page.locator('table, [role="table"], [class*="items-table"], [class*="bill-items"]').first();
        this.itemRows = this.itemsTable.locator('tbody tr, [role="row"]');
        this.itemEditIcon = this.itemsTable.locator('[aria-label*="edit" i], button:has(mat-icon:text-is("edit")), [class*="edit-icon"]');
        this.itemDeleteIcon = this.itemsTable.locator('[aria-label*="delete" i], button:has(mat-icon:text-is("delete")), [class*="delete-icon"]');
        this.deleteAllItemsButton = page.getByRole('button', { name: /delete all|remove all|clear all/i });
        this.itemTotalCell = this.itemsTable.locator('td[class*="total"], [class*="item-total"]');
        this.emptyItemsMessage = page.getByText(/no items (added|yet)|item list is empty/i);

        this.addFromProductButton = page.getByRole('button', { name: /add (from )?product|select product/i }).first();
        this.productOptions = page.getByRole('option');

        this.lastItemConfirmDialog = page.getByRole('dialog').or(page.locator('mat-dialog-container')).first();
        this.lastItemConfirmMessage = page.getByText(/last item in the bill|deleting it will also delete the bill|bill amount will become 0/i);
        this.confirmDeleteButton = page.getByRole('button', { name: /^(yes|confirm|proceed|delete)$/i }).last();
        this.cancelDeleteButton = page.getByRole('button', { name: /^(no|cancel)$/i }).last();

        this.atLeastOneItemError = page.getByText(/at least one item is required/i);
        this.itemAmountValidationError = page.getByText(/discount .*(cannot|must not|greater than).*(item )?amount|amount .*(less than|lower than).*discount/i);
        this.vatRequiredError = page.getByText(/vat is required|vat.*required/i);
        this.billDiscountExceedsTotalError = page.getByText(/discount .*(cannot|must not) .*(exceed|be more than).*(total|bill) amount/i);
        this.itemRequiredFieldError = page.getByText(/(this field|item name|quantity|unit price) is required|required field/i).first();

        this.goToEditItemButton = page.getByRole('button', { name: /go to edit item/i });
        this.goToEditBillButton = page.getByRole('button', { name: /go to edit bill/i });

        this.summaryDiscountAmount = page.getByText(/discount amount/i).locator('xpath=following-sibling::*[1]').first();
        this.summaryVatAmount = page.getByText(/vat amount/i).locator('xpath=following-sibling::*[1]').first();
        this.summaryCommissionAmount = page.getByText(/commission/i).locator('xpath=following-sibling::*[1]').first();
        this.summaryTotalAmount = page.getByText(/total amount|grand total/i).locator('xpath=following-sibling::*[1]').first();
        this.itemDetailsViewMoreButton = page.getByRole('button', { name: /view more/i });
        this.itemDetailsDiscountAmount = page.getByText(/discount amount/i).last();
    }

    /** Opens the add-item sub-form and waits for its first field, without filling anything. */
    async openAddItemForm(): Promise<void> {
        await expect(this.addItemButton).toBeVisible({ timeout: 15000 });
        await this.addItemButton.click();
        await expect(this.itemNameInput).toBeVisible({ timeout: 10000 });
    }

    /** Fills an already-open add/edit item sub-form. Leaves the form open — the caller decides whether to commit it. */
    async fillItemForm(item: BillItemInput): Promise<void> {
        await this.itemNameInput.fill(item.name);
        await this.quantityInput.fill(item.quantity);
        await this.unitPriceInput.fill(item.unitPrice);

        if (item.discountType && item.discountType !== 'No Discount') {
            await this.itemDiscountTypeSelect.click();
            await this.page.getByRole('option', { name: item.discountType }).click();
            if (item.discountValue) await this.itemDiscountValueInput.fill(item.discountValue);
        }

        if (item.vat !== undefined) await this.itemVatInput.fill(item.vat);
    }

    /** Fills the add-item sub-form and saves it, leaving the item table on screen. */
    async addItem(item: BillItemInput): Promise<void> {
        await this.openAddItemForm();
        await this.fillItemForm(item);
        await this.saveItemButton.click();
    }

    /** Opens the edit form for the item at `index` (0-based) without saving. */
    async openItemForEdit(index = 0): Promise<void> {
        await expect(this.itemEditIcon.nth(index)).toBeVisible({ timeout: 15000 });
        await this.itemEditIcon.nth(index).click();
        await expect(this.itemNameInput).toBeVisible({ timeout: 10000 });
    }

    /** Changes the discount on an existing item and saves (EMI-3965). */
    async editItemDiscount(index: number, discountType: 'No Discount' | 'Fixed' | 'Percentage', discountValue?: string): Promise<void> {
        await this.openItemForEdit(index);
        await this.itemDiscountTypeSelect.click();
        await this.page.getByRole('option', { name: discountType }).click();
        if (discountValue) await this.itemDiscountValueInput.fill(discountValue);
        await this.saveItemButton.click();
    }

    /** Deletes the item at `index`, accepting the last-item confirmation dialog if it appears. */
    async deleteItem(index = 0, confirm = true): Promise<void> {
        await expect(this.itemDeleteIcon.nth(index)).toBeVisible({ timeout: 15000 });
        await this.itemDeleteIcon.nth(index).click();

        const dialogAppeared = await this.lastItemConfirmMessage.isVisible({ timeout: 5000 }).catch(() => false);
        if (dialogAppeared) {
            await (confirm ? this.confirmDeleteButton : this.cancelDeleteButton).click();
        }
    }

    /** Deletes every item one at a time, from the bottom up so indices stay stable. */
    async deleteAllItemsIndividually(): Promise<void> {
        let remaining = await this.itemRows.count();
        while (remaining > 0) {
            await this.deleteItem(remaining - 1);
            await expect(this.itemRows).toHaveCount(remaining - 1, { timeout: 10000 });
            remaining -= 1;
        }
    }

    async getItemTotal(index = 0): Promise<string | null> {
        return this.itemTotalCell.nth(index).textContent();
    }

    /** Adds a saved product as a line item (EMI-3060). */
    async addItemFromProduct(productName: string): Promise<void> {
        await expect(this.addFromProductButton).toBeVisible({ timeout: 15000 });
        await this.addFromProductButton.click();
        await this.productOptions.filter({ hasText: productName }).first().click();
    }

    /** The item row whose text contains `name` — used to assert a specific item landed in the table. */
    itemRowByName(name: string): Locator {
        return this.itemRows.filter({ hasText: name }).first();
    }

    /** Moves from the Edit Bill screen into its item-editing step (EMI-1912). */
    async goToEditItemStep(): Promise<void> {
        await expect(this.goToEditItemButton).toBeVisible({ timeout: 15000 });
        await this.goToEditItemButton.click();
    }

    /** Returns from the item-editing step back to the Edit Bill screen — the step that returned 500 in EMI-1912. */
    async goToEditBillStep(): Promise<void> {
        await expect(this.goToEditBillButton).toBeVisible({ timeout: 15000 });
        await this.goToEditBillButton.click();
    }

    /** Advances from "Add Items" to the "Item Info" step (EMI-3630, EMI-3631). */
    async goToItemInfoStep(): Promise<void> {
        await this.nextStepButton.click();
        await expect(this.itemInfoStepHeader).toBeVisible({ timeout: 15000 });
    }

    /** True when the item table scrolls vertically rather than overflowing the page (EMI-3630). */
    async isItemTableScrollable(): Promise<boolean> {
        return this.itemsTable.evaluate(el => {
            const container = el.closest('[class*="scroll"], [style*="overflow"]') ?? el;
            const style = window.getComputedStyle(container);
            const overflows = container.scrollHeight > container.clientHeight;
            return /auto|scroll/.test(style.overflowY) && (overflows || container.clientHeight > 0);
        });
    }
}
