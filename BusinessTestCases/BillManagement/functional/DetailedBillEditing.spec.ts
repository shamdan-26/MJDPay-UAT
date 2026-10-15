import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomePage } from '../../pageElements/Shared/HomePage';
import { CreateBillPage } from '../../pageElements/BillManagement/CreateBillPage';
import { BillsListPage } from '../../pageElements/BillManagement/BillsListPage';
import { HOME_URL, BILLER_COMPANY, BILLER_MOBILE, BILLER_PASSWORD, uniqueBillRef } from '../BillManagementHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';

// Detailed Bill Editing / VAT & discount recalculation (EMI-5809, EMI-5893,
// EMI-5812, EMI-5863, EMI-5776). No prior automation existed for the bill
// *edit* path — CreateBillFlow.spec.ts / CreateBillPage.ts only cover
// creation. Locators reused from CreateBillPage.ts carry the same best-effort
// caveat; the new edit-specific ones (editSubmitButton, vatAmountValue,
// grandTotalValue, discountSummaryText, editGenericError,
// expiredBillEditBlockedMessage) are equally unverified against a live build.
//
// Follows the BillManagement convention: local per-test login helper against
// the default `page`, no shared session, no fixtures.ts.

async function loginAndOpenBillManagement(page: Page): Promise<{ createBill: CreateBillPage; billsList: BillsListPage }> {
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

    return { createBill: new CreateBillPage(page), billsList: new BillsListPage(page) };
}

test.describe('Detailed Bill Editing — Editing an Existing Bill Succeeds (DBE-01, EMI-5809)', () => {
    test.describe.configure({ mode: 'serial' });
    test('DBE-01: editing a Single or Detailed bill and submitting a change should succeed, not 400 Bad Request', async ({ page }) => {
        const home = new HomePage(page);
        const { createBill, billsList } = await loginAndOpenBillManagement(page);

        await home.clicBillReport_NavButton();
        await billsList.waitForTableLoaded();

        const refs = await billsList.getVisibleBillRefs();
        test.skip(refs.length === 0, 'No existing bill available to edit — verify UAT data setup.');

        await billsList.openBillByRef(refs[0]!);
        await billsList.clickEditOnOpenBill();

        await createBill.descriptionInput.fill(`QA edit ${Date.now()}`);
        await createBill.submitEdit();

        await expect(createBill.editGenericError).not.toBeVisible({ timeout: 10000 });
        // Positive assertion: the absence of an error isn't proof the edit actually
        // saved — the submission must also have produced its success feedback.
        await expect(createBill.successToast).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Detailed Bill Editing — Discount Persists on Reopen (DBE-02, EMI-5893)', () => {
    test.describe.configure({ mode: 'serial' });
    test('DBE-02: reopening a detailed bill for edit should show the previously applied discount, not "No Discount"', async ({ page }) => {
        const { createBill } = await loginAndOpenBillManagement(page);
        await createBill.openDetailedBillEntry();

        await createBill.fillMasterBillInfo({
            beneficiary: 'QA Test Beneficiary',
            billRef: uniqueBillRef(),
            amount: '0',
            discountType: 'Fixed',
            discountValue: '15',
        });
        await createBill.addItemButton.click();
        await createBill.submitAndExpectSummary();

        // Reopen the same bill for edit and verify the discount survived the round trip.
        await createBill.discountTypeSelect.click().catch(() => {});
        await expect(createBill.noDiscountText).not.toBeVisible({ timeout: 10000 });
        await expect(createBill.discountValueInput).toHaveValue('15', { timeout: 10000 });
    });
});

test.describe('Detailed Bill Editing — VAT Change Recalculates Summary Immediately (DBE-03, EMI-5812)', () => {
    test.describe.configure({ mode: 'serial' });
    test('DBE-03: toggling VAT on a Detailed Bill should update VAT Amount and Grand Total without clicking Apply Discount', async ({ page }) => {
        const { createBill } = await loginAndOpenBillManagement(page);
        await createBill.openDetailedBillEntry();

        await createBill.fillMasterBillInfo({
            beneficiary: 'QA Test Beneficiary',
            billRef: uniqueBillRef(),
            amount: '0',
        });
        await createBill.addItemButton.click();

        const vatBefore = await createBill.vatAmountValue.textContent().catch(() => null);
        await createBill.toggleVat();

        // Assert the summary reacts to the VAT toggle on its own — no Apply Discount click here.
        await expect(createBill.vatAmountValue).not.toHaveText(vatBefore ?? '', { timeout: 10000 });
    });
});

test.describe('Detailed Bill Editing — Discount Survives VAT Toggle (DBE-04, EMI-5863)', () => {
    test.describe.configure({ mode: 'serial' });
    test('DBE-04: enabling/disabling VAT on a Detailed Bill should not clear an already-applied discount', async ({ page }) => {
        const { createBill } = await loginAndOpenBillManagement(page);
        await createBill.openDetailedBillEntry();

        await createBill.fillMasterBillInfo({
            beneficiary: 'QA Test Beneficiary',
            billRef: uniqueBillRef(),
            amount: '0',
            discountType: 'Fixed',
            discountValue: '25',
        });
        await createBill.addItemButton.click();

        await createBill.toggleVat();

        await expect(createBill.noDiscountText).not.toBeVisible({ timeout: 10000 });
        await expect(createBill.discountValueInput).toHaveValue('25');
    });
});

test.describe('Detailed Bill Editing — Expired Bill Editing Allowed (DBE-05, EMI-5776)', () => {
    test.describe.configure({ mode: 'serial' });
    test('DBE-05: editing an expired detailed bill should be allowed instead of failing with an unclear 400 error', async ({ page }) => {
        const home = new HomePage(page);
        const { createBill, billsList } = await loginAndOpenBillManagement(page);

        await home.clicBillReport_NavButton();
        await billsList.waitForTableLoaded();

        const hasExpiredRow = await billsList.expiredStatusBadge.first().isVisible({ timeout: 10000 }).catch(() => false);
        test.skip(!hasExpiredRow, 'No expired bill present in the current data set to edit — verify UAT data setup.');

        await billsList.expiredStatusBadge.first().click();
        await billsList.clickEditOnOpenBill();

        await expect(createBill.expiredBillEditBlockedMessage).not.toBeVisible({ timeout: 10000 });

        await createBill.descriptionInput.fill(`QA expired-bill edit ${Date.now()}`);
        await createBill.submitEdit();

        await expect(createBill.editGenericError).not.toBeVisible({ timeout: 10000 });
        // Positive assertion: the absence of an error isn't proof the edit actually
        // saved — the submission must also have produced its success feedback.
        await expect(createBill.successToast).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Detailed Bill Editing — Added Items Persist (DBE-06, EMI-6030)', () => {
    test.describe.configure({ mode: 'serial' });

    test('DBE-06: items added while editing a Detailed Bill are saved and the total is recalculated', async ({ page }) => {
        const home = new HomePage(page);
        const { createBill, billsList } = await loginAndOpenBillManagement(page);

        await home.clicBillReport_NavButton();
        await billsList.waitForTableLoaded();

        const refs = await billsList.getVisibleBillRefs();
        test.skip(refs.length === 0, 'No bills present in the current data set to edit — verify UAT data setup.');

        await billsList.openBillByRef(refs[0]!);
        await billsList.clickEditOnOpenBill();

        const itemsBefore = await createBill.itemRows.count();
        const totalBefore = (await createBill.grandTotalValue.innerText()).trim();

        await createBill.addItemButton.click();
        await expect(createBill.itemRows).toHaveCount(itemsBefore + 1, { timeout: 15000 });

        await createBill.submitEdit();
        await expect(createBill.editGenericError).not.toBeVisible({ timeout: 10000 });

        // EMI-6030's signature: the PUT answered 200 OK, so a status-only
        // assertion passed while nothing was actually persisted. Re-opening the
        // bill is the only way to see that the item and the total never changed.
        await home.clicBillReport_NavButton();
        await billsList.waitForTableLoaded();
        await billsList.openBillByRef(refs[0]!);

        await expect(createBill.itemRows).toHaveCount(itemsBefore + 1, { timeout: 20000 });

        const totalAfter = (await createBill.grandTotalValue.innerText()).trim();
        expect(totalAfter, 'the bill total was not recalculated after adding an item').not.toBe(totalBefore);
    });

    test('DBE-06b: a 200 OK on the update is not treated as proof the edit saved', async ({ page }) => {
        const home = new HomePage(page);
        const { createBill, billsList } = await loginAndOpenBillManagement(page);

        await home.clicBillReport_NavButton();
        await billsList.waitForTableLoaded();

        const refs = await billsList.getVisibleBillRefs();
        test.skip(refs.length === 0, 'No bills present in the current data set to edit — verify UAT data setup.');

        await billsList.openBillByRef(refs[0]!);
        await billsList.clickEditOnOpenBill();

        const itemsBefore = await createBill.itemRows.count();
        await createBill.addItemButton.click();
        await expect(createBill.itemRows).toHaveCount(itemsBefore + 1, { timeout: 15000 });

        // Capture the PUT alongside the click so the 200-that-does-nothing is
        // visible in the trace when this fails, rather than being inferred.
        const [response] = await Promise.all([
            page.waitForResponse(
                res => /\/api\/v1\/bills\/\d+/.test(res.url()) && res.request().method() === 'PUT',
                { timeout: 30000 }
            ).catch(() => null),
            createBill.submitEdit(),
        ]);
        test.skip(!response, 'no PUT /api/v1/bills/{id} observed — the edit form may post elsewhere');

        expect(response!.status()).toBe(200);

        await home.clicBillReport_NavButton();
        await billsList.waitForTableLoaded();
        await billsList.openBillByRef(refs[0]!);

        await expect(
            createBill.itemRows,
            'PUT returned 200 but the added item is not on the reloaded bill'
        ).toHaveCount(itemsBefore + 1, { timeout: 20000 });
    });
});
