import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomePage } from '../../pageElements/Shared/HomePage';
import { CreateBillPage } from '../../pageElements/BillManagement/CreateBillPage';
import { BillItemsPage } from '../../pageElements/BillManagement/BillItemsPage';
import { BillsListPage } from '../../pageElements/BillManagement/BillsListPage';
import {
    HOME_URL,
    BILLER_COMPANY,
    BILLER_MOBILE,
    BILLER_PASSWORD,
    uniqueBillRef,
    uniqueItemName,
    parseMoney,
    expectedItemTotal,
} from '../BillManagementHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';

// Detailed Bill — LINE ITEMS (BI-01..BI-26).
//
// Extracted from the Jira bill-item ticket history on the digitalcash site.
// Web-relevant tickets only (FE - Web + BE) — the FE - IOS / FE - AND item
// tickets (EMI-4249, EMI-4250, EMI-3244, EMI-3245, EMI-1684/1685/1687/1688,
// EMI-3536, EMI-3537, EMI-3581, EMI-3584, EMI-4345, EMI-5037, ...) are out of
// scope for this Playwright web suite.
//
// Existing coverage this file deliberately does NOT repeat:
//   CreateBillFlow.spec.ts    CB-06 (add 2 items), CB-09 (product as item)
//   DetailedBillEditing.spec.ts DBE-01..DBE-05 (EMI-5809, 5893, 5812, 5863, 5776)
//
// Two Web/BE item tickets are intentionally untested here: EMI-1940 (BE
// refactor of update bill/bill items — no behavioural AC of its own, exercised
// through BI-18/BI-20/BI-23) and EMI-4121 (still an open Inquiry about whether
// item discounts apply to the unit price or the line total — see
// expectedItemTotal() in BillManagementHelper.ts, which is the single place to
// change if that inquiry resolves the other way).
//
// Follows the BillManagement convention documented in CLAUDE.md: a local
// per-test login helper against the default `page`, no shared session, no
// fixtures.ts. Locators come from BillItemsPage.ts — read its header caveat.

async function loginAndOpenDetailedBill(page: Page): Promise<{ createBill: CreateBillPage; items: BillItemsPage }> {
    const loginPage = new LoginPage(page);
    const otp = new OtpPage(page);
    const home = new HomePage(page);

    await loginPage.goto(LOGIN_URL);
    await loginPage.fillAndSubmit(BILLER_COMPANY, BILLER_MOBILE, BILLER_PASSWORD);
    if (await otp.isVisible()) {
        await otp.fillAndVerify(await getOtpFromDb(BILLER_MOBILE));
    }
    await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });

    await page.goto(HOME_URL);
    await page.waitForLoadState('domcontentloaded');
    await home.clicBills_NavButton();
    await home.clickCreateBill_NavButton();

    const createBill = new CreateBillPage(page);
    await createBill.openDetailedBillEntry();
    await createBill.fillMasterBillInfo({
        beneficiary: 'QA Test Beneficiary',
        billRef: uniqueBillRef(),
        amount: '0', // on a detailed bill the amount is derived from the items
    });

    return { createBill, items: new BillItemsPage(page) };
}

async function loginAndOpenExistingBillForEdit(page: Page): Promise<{ createBill: CreateBillPage; items: BillItemsPage; billsList: BillsListPage }> {
    const loginPage = new LoginPage(page);
    const otp = new OtpPage(page);
    const home = new HomePage(page);

    await loginPage.goto(LOGIN_URL);
    await loginPage.fillAndSubmit(BILLER_COMPANY, BILLER_MOBILE, BILLER_PASSWORD);
    if (await otp.isVisible()) {
        await otp.fillAndVerify(await getOtpFromDb(BILLER_MOBILE));
    }
    await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });

    await page.goto(HOME_URL);
    await page.waitForLoadState('domcontentloaded');
    await home.clicBills_NavButton();
    await home.clicBillReport_NavButton();

    const billsList = new BillsListPage(page);
    await billsList.waitForTableLoaded();

    return { createBill: new CreateBillPage(page), items: new BillItemsPage(page), billsList };
}

/* ------------------------------------------------------------------ *
 * A. "A detailed bill must have items"  (EMI-4069, EMI-4179)
 * ------------------------------------------------------------------ */

test.describe('Bill Items — At Least One Item Required (BI-01, BI-02)', () => {
    test('BI-01: creating a Detailed Bill after deleting every item should be blocked with a validation error (EMI-4069)', async ({ page }) => {
        const { createBill, items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '2', unitPrice: '50' });
        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '30' });
        await expect(items.itemRows).toHaveCount(2, { timeout: 10000 });

        await items.deleteAllItemsIndividually();
        await createBill.submitBillButton.click();

        // The bill must NOT be created — a validation error is expected instead.
        await expect(items.atLeastOneItemError).toBeVisible({ timeout: 10000 });
        await expect(createBill.summarySection).not.toBeVisible();
    });

    test('BI-02: editing a Detailed Bill down to zero items should be blocked with the same validation error (EMI-4179)', async ({ page }) => {
        const { createBill, items, billsList } = await loginAndOpenExistingBillForEdit(page);

        const refs = await billsList.getVisibleBillRefs();
        test.skip(refs.length === 0, 'No existing detailed bill available to edit — verify UAT data setup.');

        await billsList.openBillByRef(refs[0]!);
        await billsList.clickEditOnOpenBill();

        const itemCount = await items.itemRows.count();
        test.skip(itemCount === 0, 'Opened bill has no items — pick a detailed bill fixture with items.');

        await items.deleteAllItemsIndividually();
        await createBill.submitEdit();

        await expect(items.atLeastOneItemError).toBeVisible({ timeout: 10000 });
    });
});

/* ------------------------------------------------------------------ *
 * B. Item calculation  (EMI-4123, EMI-5030, EMI-2952, EMI-4071)
 * ------------------------------------------------------------------ */

test.describe('Bill Items — Calculation Correctness (BI-03, BI-04, BI-05, BI-06)', () => {
    test('BI-03: an item with a Fixed discount should total (unitPrice - discount) x quantity (EMI-4123)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        // Ticket test data: qty 5, unit price 10, fixed discount 10 -> expected total 0
        // (the bug reported 40). See expectedItemTotal() and the open EMI-4121 inquiry.
        await items.addItem({
            name: uniqueItemName(),
            quantity: '5',
            unitPrice: '10',
            discountType: 'Fixed',
            discountValue: '10',
        });

        const total = parseMoney(await items.getItemTotal(0));
        expect(total).toBe(expectedItemTotal(10, 5, 10, 'FIXED')); // 0
    });

    test('BI-04: /bills/calculate should return a correct netAmountAfterDiscount for FIXED-discount items (EMI-5030)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        const calculateResponse = page.waitForResponse(
            res => res.url().includes('/bills/calculate') && res.request().method() === 'POST',
            { timeout: 30000 },
        );

        // unit price 100, fixed discount 20, qty 2 -> net after discount must be 160, never 0.
        await items.addItem({
            name: uniqueItemName(),
            quantity: '2',
            unitPrice: '100',
            discountType: 'Fixed',
            discountValue: '20',
        });

        const body = await (await calculateResponse).json().catch(() => null);
        test.skip(body === null, '/bills/calculate response was not JSON — check whether the payload is encrypted in this environment.');

        const summaries = body?.billItemSummaries ?? body?.data?.billItemSummaries ?? [];
        expect(Array.isArray(summaries) && summaries.length > 0).toBe(true);

        for (const summary of summaries) {
            if (String(summary.discountType ?? summary.discountTypeCode).toUpperCase() === 'FIXED' && Number(summary.discount) > 0) {
                expect(Number(summary.netAmountAfterDiscount)).toBeGreaterThan(0);
            }
        }
    });

    test('BI-05: editing an existing item should not make /bills/calculate return 500 (EMI-4071)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '3', unitPrice: '25' });

        const failedCalls: number[] = [];
        page.on('response', res => {
            if (res.url().includes('/bills/calculate') && res.status() >= 500) failedCalls.push(res.status());
        });

        await items.editItemDiscount(0, 'Fixed', '5');
        await expect(items.itemRows).toHaveCount(1, { timeout: 10000 });

        expect(failedCalls, `/bills/calculate returned server errors: ${failedCalls.join(', ')}`).toHaveLength(0);
    });

    test('BI-06: a bill with more than two items should total the sum of every item, not a subset (EMI-2952)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        // Three identical items: unit price 10, qty 5 -> each 50, expected grand total 150.
        for (let i = 0; i < 3; i++) {
            await items.addItem({ name: uniqueItemName(`QA-ITEM-${i}`), quantity: '5', unitPrice: '10' });
        }
        await expect(items.itemRows).toHaveCount(3, { timeout: 10000 });

        await items.goToItemInfoStep();

        expect(parseMoney(await items.summaryTotalAmount.textContent())).toBe(150);
    });
});

/* ------------------------------------------------------------------ *
 * C. Item discount behaviour  (EMI-3965, EMI-3961, EMI-3323, EMI-3383, EMI-5319)
 * ------------------------------------------------------------------ */

test.describe('Bill Items — Discount Behaviour (BI-07, BI-08, BI-09, BI-10, BI-11)', () => {
    test('BI-07: editing an item discount should update the total bill amount immediately (EMI-3965)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '2', unitPrice: '100' });
        await items.goToItemInfoStep();
        const totalBefore = parseMoney(await items.summaryTotalAmount.textContent());

        await items.backButton.click();
        await items.editItemDiscount(0, 'Fixed', '10');
        await items.goToItemInfoStep();

        // Must refresh on its own — the bug required navigating back and forward again.
        await expect
            .poll(async () => parseMoney(await items.summaryTotalAmount.textContent()), { timeout: 10000 })
            .not.toBe(totalBefore);
    });

    test('BI-08: a Fixed item discount larger than the item amount should be flagged immediately under the amount field (EMI-3961)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        // Ticket test data: item amount 100, quantity 1, fixed discount 150.
        await items.addItemButton.click();
        await items.itemNameInput.fill(uniqueItemName());
        await items.quantityInput.fill('1');
        await items.unitPriceInput.fill('100');
        await items.itemDiscountTypeSelect.click();
        await page.getByRole('option', { name: 'Fixed' }).click();
        await items.itemDiscountValueInput.fill('150');
        await items.itemDiscountValueInput.blur();

        // Expected inline, before saving the item — not only after moving on to create the bill.
        await expect(items.itemAmountValidationError).toBeVisible({ timeout: 10000 });
    });

    test('BI-09: a bill-level Fixed discount larger than the bill total should be rejected (EMI-3323)', async ({ page }) => {
        const { createBill, items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '50' });

        await createBill.discountTypeSelect.click();
        await page.getByRole('option', { name: 'Fixed' }).click();
        await createBill.discountValueInput.fill('500'); // far above the 50 bill total
        await createBill.submitBillButton.click();

        await expect(items.billDiscountExceedsTotalError.or(createBill.requiredFieldError)).toBeVisible({ timeout: 10000 });
        await expect(createBill.summarySection).not.toBeVisible();
    });

    test('BI-10: reopening an item saved with "No Discount" should show "No Discount", not an empty field (EMI-3383)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '75', discountType: 'No Discount' });
        await items.openItemForEdit(0);

        await expect(items.itemDiscountTypeSelect).toHaveText(/no discount/i, { timeout: 10000 });
    });

    test('BI-11: an item-level discount and a different bill-level discount type should coexist without corrupting the total (EMI-5319)', async ({ page }) => {
        const { createBill, items } = await loginAndOpenDetailedBill(page);

        // Item uses Percentage, bill uses Fixed — the combination the ticket flagged as conflicting.
        await items.addItem({
            name: uniqueItemName(),
            quantity: '2',
            unitPrice: '100',
            discountType: 'Percentage',
            discountValue: '10',
        });

        await createBill.discountTypeSelect.click();
        await page.getByRole('option', { name: 'Fixed' }).click();
        await createBill.discountValueInput.fill('20');

        await items.goToItemInfoStep();

        // Item nets (100 - 10%) x 2 = 180; bill-level fixed 20 off that = 160.
        const itemTotal = parseMoney(await items.getItemTotal(0));
        expect(itemTotal).toBe(expectedItemTotal(100, 2, 10, 'PERCENTAGE')); // 180

        const grandTotal = parseMoney(await items.summaryTotalAmount.textContent());
        expect(grandTotal).toBe(160);
    });
});

/* ------------------------------------------------------------------ *
 * D. VAT on items  (EMI-3957)
 * ------------------------------------------------------------------ */

test.describe('Bill Items — VAT Field (BI-12)', () => {
    test('BI-12: VAT should stay optional when editing an item, exactly as it is when adding one (EMI-3957)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '100', vat: '15' });
        await items.openItemForEdit(0);

        await items.itemVatInput.fill('');
        await items.itemVatInput.blur();

        await expect(items.vatRequiredError).not.toBeVisible({ timeout: 10000 });
        await expect(items.saveItemButton).toBeEnabled();
    });
});

/* ------------------------------------------------------------------ *
 * E. Deleting items  (EMI-1988, EMI-2590, EMI-2100, EMI-3282, EMI-2298)
 * ------------------------------------------------------------------ */

test.describe('Bill Items — Deletion (BI-13, BI-14, BI-15, BI-16, BI-17)', () => {
    test('BI-13: deleting the last remaining item should raise a confirmation dialog, and confirming should remove it (EMI-1988, EMI-2590)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '40' });
        await expect(items.itemRows).toHaveCount(1, { timeout: 10000 });

        await items.itemDeleteIcon.first().click();
        await expect(items.lastItemConfirmMessage).toBeVisible({ timeout: 10000 });

        await items.confirmDeleteButton.click();
        await expect(items.itemRows).toHaveCount(0, { timeout: 10000 });
    });

    test('BI-14: cancelling the last-item confirmation dialog should leave the item in place (EMI-1988)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '40' });
        await expect(items.itemRows).toHaveCount(1, { timeout: 10000 });

        await items.itemDeleteIcon.first().click();
        await expect(items.lastItemConfirmMessage).toBeVisible({ timeout: 10000 });

        await items.cancelDeleteButton.click();
        await expect(items.itemRows).toHaveCount(1, { timeout: 10000 });
    });

    test('BI-15: "Delete All" should actually empty the item list, not just show a success message (EMI-2100, EMI-1935)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        for (let i = 0; i < 3; i++) {
            await items.addItem({ name: uniqueItemName(`QA-DEL-${i}`), quantity: '1', unitPrice: '20' });
        }
        await expect(items.itemRows).toHaveCount(3, { timeout: 10000 });

        await items.deleteAllItemsButton.click();
        const dialogAppeared = await items.lastItemConfirmMessage.isVisible({ timeout: 5000 }).catch(() => false);
        if (dialogAppeared) await items.confirmDeleteButton.click();

        // The regression was: success toast shown, rows still rendered.
        await expect(items.itemRows).toHaveCount(0, { timeout: 10000 });
        await expect(items.emptyItemsMessage).toBeVisible({ timeout: 10000 });
    });

    test('BI-16: deleting an item should update the bill amount without raising an error (EMI-3282)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '100' });
        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '60' });
        await items.goToItemInfoStep();
        const totalBefore = parseMoney(await items.summaryTotalAmount.textContent());

        await items.backButton.click();
        await items.deleteItem(1);
        await expect(items.itemRows).toHaveCount(1, { timeout: 10000 });
        await items.goToItemInfoStep();

        const totalAfter = parseMoney(await items.summaryTotalAmount.textContent());
        expect(totalAfter).toBeLessThan(totalBefore);
        expect(totalAfter).toBe(100);
    });

    test('BI-17: removing an item should recalculate VAT and commission, not keep the removed item in the figures (EMI-2298)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '200', vat: '15' });
        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '100', vat: '15' });
        await items.goToItemInfoStep();

        const vatBefore = parseMoney(await items.summaryVatAmount.textContent());
        const commissionBefore = parseMoney(await items.summaryCommissionAmount.textContent().catch(() => null));

        await items.backButton.click();
        await items.deleteItem(1);
        await items.goToItemInfoStep();

        await expect
            .poll(async () => parseMoney(await items.summaryVatAmount.textContent()), { timeout: 10000 })
            .toBeLessThan(vatBefore);

        if (!Number.isNaN(commissionBefore)) {
            expect(parseMoney(await items.summaryCommissionAmount.textContent())).toBeLessThan(commissionBefore);
        }
    });
});

/* ------------------------------------------------------------------ *
 * F. Editing an existing bill's items  (EMI-1679, EMI-3305, EMI-3118, EMI-3119)
 * ------------------------------------------------------------------ */

test.describe('Bill Items — Editing an Existing Bill (BI-18, BI-19, BI-20)', () => {
    test('BI-18: adding an item while editing a bill should compute its total and preserve the existing items (EMI-3305)', async ({ page }) => {
        const { createBill, items, billsList } = await loginAndOpenExistingBillForEdit(page);

        const refs = await billsList.getVisibleBillRefs();
        test.skip(refs.length === 0, 'No existing detailed bill available to edit — verify UAT data setup.');

        await billsList.openBillByRef(refs[0]!);
        await billsList.clickEditOnOpenBill();

        const countBefore = await items.itemRows.count();
        test.skip(countBefore === 0, 'Opened bill has no items — pick a detailed bill fixture with items.');

        await items.addItem({ name: uniqueItemName('QA-EDIT'), quantity: '2', unitPrice: '35' });

        // The new item's total must not render as 0 ...
        await expect(items.itemRows).toHaveCount(countBefore + 1, { timeout: 10000 });
        expect(parseMoney(await items.getItemTotal(countBefore))).toBe(70);

        // ... and the pre-existing items must survive onto the confirmation page.
        await createBill.submitEdit();
        await expect(items.itemRows).toHaveCount(countBefore + 1, { timeout: 15000 });
    });

    test('BI-19: creating a Detailed Bill containing both a saved product and a manual item should succeed (EMI-3118)', async ({ page }) => {
        const { createBill, items } = await loginAndOpenDetailedBill(page);

        await items.addItemFromProduct('QA Sample Product');
        await items.addItem({ name: uniqueItemName('QA-MANUAL'), quantity: '1', unitPrice: '45' });
        await expect(items.itemRows).toHaveCount(2, { timeout: 10000 });

        await createBill.submitAndExpectSummary();
        await expect(createBill.editGenericError).not.toBeVisible();
    });

    test('BI-20: updating a Detailed Bill that contains both a product and an item should succeed (EMI-3119, EMI-1679)', async ({ page }) => {
        const { createBill, items, billsList } = await loginAndOpenExistingBillForEdit(page);

        const refs = await billsList.getVisibleBillRefs();
        test.skip(refs.length === 0, 'No existing detailed bill available to edit — verify UAT data setup.');

        await billsList.openBillByRef(refs[0]!);
        await billsList.clickEditOnOpenBill();

        await items.addItemFromProduct('QA Sample Product');
        await items.addItem({ name: uniqueItemName('QA-MANUAL'), quantity: '1', unitPrice: '15' });

        await createBill.submitEdit();
        await expect(createBill.editGenericError).not.toBeVisible({ timeout: 10000 });
    });
});

/* ------------------------------------------------------------------ *
 * G. Add-item form validation  (EMI-1930, MJDPAY-775)
 * ------------------------------------------------------------------ */

test.describe('Bill Items — Add Item Form Validation (BI-21, BI-22)', () => {
    test('BI-21: leaving Discount Type and Discount empty should still allow the item to be added (EMI-1930)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        const itemName = uniqueItemName('QA-NODISC');
        await items.openAddItemForm();
        // Only the genuinely required fields — discount deliberately untouched.
        await items.fillItemForm({ name: itemName, quantity: '3', unitPrice: '20' });

        // The bug: the commit button stayed disabled until a discount was chosen.
        await expect(items.addItemToListButton).toBeEnabled({ timeout: 10000 });

        await items.saveItemButton.click();
        await expect(items.itemRowByName(itemName)).toBeVisible({ timeout: 10000 });
        expect(parseMoney(await items.getItemTotal(0))).toBe(60);
    });

    test('BI-22: submitting the add-item form with every field empty should be rejected, not silently added (MJDPAY-775)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        await items.openAddItemForm();
        // No fill at all — the ticket reported the empty item being accepted.
        await items.saveItemButton.click();

        await expect(items.itemRequiredFieldError).toBeVisible({ timeout: 10000 });
        await expect(items.itemRows).toHaveCount(0, { timeout: 10000 });
    });
});

/* ------------------------------------------------------------------ *
 * H. Item editing on a saved bill — server errors  (EMI-1912, EMI-1709)
 * ------------------------------------------------------------------ */

test.describe('Bill Items — Edit-Bill Server Errors (BI-23, BI-24)', () => {
    test('BI-23: adding an item in the Edit Item step and returning to Edit Bill should not return a 500 (EMI-1912)', async ({ page }) => {
        const { items, billsList } = await loginAndOpenExistingBillForEdit(page);

        const refs = await billsList.getVisibleBillRefs();
        test.skip(refs.length === 0, 'No existing detailed bill available to edit — verify UAT data setup.');

        await billsList.openBillByRef(refs[0]!);
        await billsList.clickEditOnOpenBill();

        const serverErrors: string[] = [];
        page.on('response', res => {
            if (res.status() >= 500) serverErrors.push(`${res.status()} ${res.url()}`);
        });

        await items.goToEditItemStep();
        await items.addItem({ name: uniqueItemName('QA-500'), quantity: '1', unitPrice: '30' });

        // The bug fired here: the item saved fine, then this navigation 500'd.
        await items.goToEditBillStep();

        expect(serverErrors, `Server errors during edit-item -> edit-bill: ${serverErrors.join(', ')}`).toHaveLength(0);
    });

    test('BI-24: editing an existing item with a valid discount should not be blocked by discount validation (EMI-1709)', async ({ page }) => {
        const { items, billsList } = await loginAndOpenExistingBillForEdit(page);

        const refs = await billsList.getVisibleBillRefs();
        test.skip(refs.length === 0, 'No existing detailed bill available to edit — verify UAT data setup.');

        await billsList.openBillByRef(refs[0]!);
        await billsList.clickEditOnOpenBill();

        const countBefore = await items.itemRows.count();
        test.skip(countBefore === 0, 'Opened bill has no items — pick a detailed bill fixture with items.');

        // A discount well inside the item amount: the ticket's wrong validation
        // rejected even legitimate values like this one.
        await items.editItemDiscount(0, 'Percentage', '10');

        await expect(items.itemAmountValidationError).not.toBeVisible({ timeout: 10000 });
        await expect(items.itemRows).toHaveCount(countBefore, { timeout: 10000 });
    });
});

/* ------------------------------------------------------------------ *
 * I. Adding an item from a saved product  (EMI-3060)
 * ------------------------------------------------------------------ */

test.describe('Bill Items — Product As Item (BI-25)', () => {
    test('BI-25: picking a saved product in the create-bill step should add it as a priced line item (EMI-3060)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        const PRODUCT = 'QA Sample Product';
        await items.addItemFromProduct(PRODUCT);

        // The product must land as a real row carrying its own name and a
        // non-zero total — not an empty placeholder the biller has to retype.
        await expect(items.itemRowByName(PRODUCT)).toBeVisible({ timeout: 10000 });
        expect(parseMoney(await items.getItemTotal(0))).toBeGreaterThan(0);
    });
});

/* ------------------------------------------------------------------ *
 * J. Bill retrieval maps items  (EMI-4991)
 * ------------------------------------------------------------------ */

test.describe('Bill Items — Get Bill By ID Response (BI-26)', () => {
    // Asserted against the browser's own GET /bills/{id} call rather than in an
    // api/ folder: the bills endpoints need a Biller accessToken, and the repo
    // has no token helper for the BillManagement fixture account (LoginAPIFlow
    // builds its own chain and only works where OTP is disabled).
    test('BI-26: GET /bills/{id} should return the bill items, not an empty or unmapped list (EMI-4991)', async ({ page }) => {
        const { billsList } = await loginAndOpenExistingBillForEdit(page);

        const refs = await billsList.getVisibleBillRefs();
        test.skip(refs.length === 0, 'No existing detailed bill available to open — verify UAT data setup.');

        const billResponse = page.waitForResponse(
            res => /\/bills\/[^/]+$/.test(new URL(res.url()).pathname) && res.request().method() === 'GET',
            { timeout: 30000 },
        );

        await billsList.openBillByRef(refs[0]!);

        const body = await (await billResponse).json().catch(() => null);
        test.skip(body === null, 'GET /bills/{id} response was not JSON — check whether the payload is encrypted in this environment.');

        const bill = body?.data ?? body;
        const billItems = bill?.billItems ?? bill?.items ?? [];
        test.skip(!Array.isArray(billItems) || billItems.length === 0, 'Opened bill is a single bill with no items — pick a detailed bill fixture.');

        // Each item must be mapped, not returned as a bare id or a null-filled shell.
        for (const item of billItems) {
            expect(item.name ?? item.itemName, `bill item missing a name: ${JSON.stringify(item)}`).toBeTruthy();
            expect(Number(item.quantity)).toBeGreaterThan(0);
            expect(Number(item.unitPrice ?? item.price)).toBeGreaterThan(0);
        }
    });
});
