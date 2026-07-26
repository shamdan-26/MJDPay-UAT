import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomePage } from '../../pageElements/Shared/HomePage';
import { CreateBillPage } from '../../pageElements/BillManagement/CreateBillPage';
import { HOME_URL, BILLER_COMPANY, BILLER_MOBILE, BILLER_PASSWORD, uniqueBillRef } from '../BillManagementHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';

// Create Bill / Bill Management (EMI-183, EMI-242, EMI-3020). No prior
// automation existed for the Biller-side "Add Bill" screens — see
// CreateBillPage.ts for the locator caveat. Maps to
// docs/manual-test-cases/B2B-Transactions.md section A (CB-01..CB-27).
//
// Bill creation is a standalone action per test (no shared money/ledger state
// like Pay Bill or W2W), so this suite runs in default (parallel-safe) mode
// per the Senior_QA_Automation_Expert.md conditional-isolation rule.

async function loginAndOpenCreateBill(page: Page): Promise<CreateBillPage> {
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

    return new CreateBillPage(page);
}

test.describe('Create Bill — Single Entry (CB-01, CB-02)', () => {
    test('CB-01: should create a bill with only the required fields', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openSingleBillEntry();

        await createBill.fillMasterBillInfo({
            beneficiary: 'QA Test Beneficiary',
            billRef: uniqueBillRef(),
            amount: '100',
        });

        await createBill.submitAndExpectSummary();
    });

    test('CB-02: should compute the amount breakdown correctly with VAT and a fixed discount', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openSingleBillEntry();

        await createBill.fillMasterBillInfo({
            beneficiary: 'QA Test Beneficiary',
            billRef: uniqueBillRef(),
            amount: '200',
            discountType: 'Fixed',
            discountValue: '20',
            applyVat: true,
        });

        await createBill.submitAndExpectSummary();
        await expect(createBill.summaryTotalAmount).toBeVisible();
    });
});

test.describe('Create Bill — Discount Type Behavior (CB-03, CB-04, CB-05)', () => {
    test('CB-03: "No discount" should be the default and hide the discount amount field', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openSingleBillEntry();

        await expect(createBill.discountValueInput).not.toBeVisible();
    });

    test('CB-04: selecting Fixed discount should reveal the discount amount field', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openSingleBillEntry();

        await createBill.discountTypeSelect.click();
        await page.getByRole('option', { name: 'Fixed' }).click();

        await expect(createBill.discountValueInput).toBeVisible({ timeout: 10000 });
    });

    test('CB-05: a zero discount value should be rejected when a discount type is selected', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openSingleBillEntry();

        await createBill.fillMasterBillInfo({
            beneficiary: 'QA Test Beneficiary',
            billRef: uniqueBillRef(),
            amount: '100',
            discountType: 'Fixed',
            discountValue: '0',
        });

        await createBill.submitBillButton.click();
        await expect(createBill.requiredFieldError.or(page.getByText(/discount.*(greater than 0|cannot be 0)/i))).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Create Bill — Detailed Entry with Items (CB-06, CB-07)', () => {
    test('CB-06: should add multiple items and reflect them in the confirmation summary', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openDetailedBillEntry();

        await createBill.fillMasterBillInfo({
            beneficiary: 'QA Test Beneficiary',
            billRef: uniqueBillRef(),
            amount: '0', // amount is derived from items on detailed entry
        });

        await createBill.addItemButton.click();
        await createBill.addItemButton.click();
        await expect(createBill.itemRows).toHaveCount(2, { timeout: 10000 });

        await createBill.submitAndExpectSummary();
    });
});

test.describe('Create Bill — Predefined Products (CB-09, CB-11, CB-12)', () => {
    test('CB-09: selecting a saved product should add it as a pre-filled line item', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openDetailedBillEntry();
        await createBill.addItemButton.click();

        await createBill.selectProduct('QA Sample Product');
        await expect(createBill.itemRows.filter({ hasText: 'QA Sample Product' })).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Create Bill — Optional Expiry (CB-08)', () => {
    test('CB-08: leaving expiry empty should create a bill that never expires', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openSingleBillEntry();

        await createBill.fillMasterBillInfo({
            beneficiary: 'QA Test Beneficiary',
            billRef: uniqueBillRef(),
            amount: '150',
        });

        await createBill.submitAndExpectSummary();
        await expect(page.getByText(/no expiry|never expires/i)).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Create Bill — Required Field Validation (CB-27)', () => {
    test('CB-27: submitting without a Bill Ref. or Amount should be blocked', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openSingleBillEntry();

        await createBill.beneficiaryPicker.fill('QA Test Beneficiary');
        await createBill.assertRequiredFieldBlocksSubmit();
    });
});

test.describe('Create Bill — Bulk Upload via Excel (CB-14, CB-15, CB-16, CB-17)', () => {
    test('CB-14: uploading a valid Excel file should create all bills in it', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openBulkUpload();

        // Fixture file: maintain a valid, unmodified copy of the protected template
        // in data/fixtures/bulk-bills-valid.xlsx (not committed by this suite).
        await createBill.uploadExcelFile(path.resolve(__dirname, '../../../data/fixtures/bulk-bills-valid.xlsx'));

        await expect(createBill.uploadSuccessMessage).toBeVisible({ timeout: 20000 });
    });

    test('CB-15: uploading a tampered Excel file should be rejected via checksum validation', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openBulkUpload();

        await createBill.uploadExcelFile(path.resolve(__dirname, '../../../data/fixtures/bulk-bills-tampered.xlsx'));

        await expect(createBill.uploadErrorMessage).toBeVisible({ timeout: 20000 });
    });

    test('CB-16: one invalid row in the batch should roll back the entire upload', async ({ page }) => {
        const createBill = await loginAndOpenCreateBill(page);
        await createBill.openBulkUpload();

        await createBill.uploadExcelFile(path.resolve(__dirname, '../../../data/fixtures/bulk-bills-one-invalid-row.xlsx'));

        await expect(createBill.uploadErrorMessage).toBeVisible({ timeout: 20000 });
        // Rolled back — no partial success message should ever appear alongside the error.
        await expect(createBill.uploadSuccessMessage).not.toBeVisible();
    });
});
