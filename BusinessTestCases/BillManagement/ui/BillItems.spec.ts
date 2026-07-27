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
} from '../BillManagementHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';

// Detailed Bill — line items, PRESENCE-ONLY checks (BI-U01..BI-U04).
//
// Split from functional/BillItems.spec.ts per the repo's "functional/ covers
// business logic, ui/ covers element/text presence" rule. This is the first
// ui/ folder under BillManagement/.
//
// Tickets: EMI-3631 (missing edit/delete icons + Back button in Item Info),
// EMI-3630 (item tables missing vertical scroll), EMI-3270 (Discount Amount
// missing from bill summary and item details).

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
        amount: '0',
    });

    return { createBill, items: new BillItemsPage(page) };
}

test.describe('Bill Items UI — Item Info Step Controls (BI-U01, BI-U02)', () => {
    test('BI-U01: each item row in the Item Info step should expose edit and delete icons (EMI-3631)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '2', unitPrice: '50' });
        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '30' });
        await items.goToItemInfoStep();

        const rowCount = await items.itemRows.count();
        expect(rowCount).toBe(2);
        await expect(items.itemEditIcon).toHaveCount(rowCount);
        await expect(items.itemDeleteIcon).toHaveCount(rowCount);
    });

    test('BI-U02: the Item Info step should show a Back button to return to the previous step (EMI-3631)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        await items.addItem({ name: uniqueItemName(), quantity: '1', unitPrice: '50' });
        await items.goToItemInfoStep();

        await expect(items.backButton).toBeVisible({ timeout: 10000 });
        await items.backButton.click();
        await expect(items.addItemsStepHeader).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Bill Items UI — Item Table Scrolling (BI-U03)', () => {
    test('BI-U03: the item tables in the Add Items and Item Info steps should scroll vertically (EMI-3630)', async ({ page }) => {
        const { items } = await loginAndOpenDetailedBill(page);

        // Enough rows to overflow the table's designed height.
        for (let i = 0; i < 8; i++) {
            await items.addItem({ name: uniqueItemName(`QA-SCROLL-${i}`), quantity: '1', unitPrice: '10' });
        }
        await expect(items.itemRows).toHaveCount(8, { timeout: 15000 });

        expect(await items.isItemTableScrollable(), 'Add Items step: item table is not vertically scrollable').toBe(true);

        await items.goToItemInfoStep();
        expect(await items.isItemTableScrollable(), 'Item Info step: item table is not vertically scrollable').toBe(true);
    });
});

test.describe('Bill Items UI — Discount Amount Display (BI-U04)', () => {
    test('BI-U04: Discount Amount should be visible in both the bill summary and the item details view (EMI-3270)', async ({ page }) => {
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
        const items = new BillItemsPage(page);
        await billsList.waitForTableLoaded();

        const refs = await billsList.getVisibleBillRefs();
        test.skip(refs.length === 0, 'No existing detailed bill available to view — verify UAT data setup.');

        await billsList.openBillByRef(refs[0]!);

        // Overall bill summary
        await expect(items.summaryDiscountAmount).toBeVisible({ timeout: 15000 });

        // Individual bill item details, behind "View More"
        await items.itemDetailsViewMoreButton.first().click();
        await expect(items.itemDetailsDiscountAmount).toBeVisible({ timeout: 15000 });
    });
});
