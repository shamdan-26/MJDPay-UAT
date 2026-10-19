import { test, expect, type BrowserContext } from '@playwright/test';
import { loginToCommissionManagement } from '../helpers/CommissionManagementHelper.ts';
import { type AdminCommissionManagementPage } from '../../pageElements/CommissionManagement/AdminCommissionManagementPage';

// UI presence and read-only behaviour for the Default Commission screen. No
// test here saves a change to the live Default Commission config.

const BILLER_CASHIN = 'Biller Bank Cashin';

test.describe('Commission Management — Default Commission UI', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120000);

    let context: BrowserContext;
    let commission: AdminCommissionManagementPage;

    test.beforeAll(async ({ browser }) => {
        const session = await loginToCommissionManagement(browser);
        context = session.context;
        commission = session.commission;
        await commission.gotoDefaultCommission();
    });

    test.afterAll(async () => {
        await context?.close();
    });

    test('screen shows the heading controls and the grid column headers', async () => {
        await expect(commission.addNewCommissionButton).toBeVisible();
        await expect(commission.filterToggle).toBeVisible();
        const page = commission.page;
        for (const header of ['Transaction Type', 'Minimum Amount', 'Maximum Amount', 'Platform', 'Amount', 'Status']) {
            await expect(page.getByText(header, { exact: true }).first(), `column header "${header}"`).toBeVisible();
        }
    });

    test('paginator total label is shown with at least one row', async () => {
        await expect(commission.totalCommissionsLabel).toBeVisible();
        expect(await commission.rows.count()).toBeGreaterThanOrEqual(1);
    });

    test('filter by transaction type and platform narrows the grid to that one row', async () => {
        const filtered = commission.page.waitForResponse(
            r => r.url().includes('/api/v1/default-commissions') && r.url().includes('transactionTypeCode='),
            { timeout: 15000 },
        );
        await Promise.all([commission.filterByTransactionTypeAndPlatform(BILLER_CASHIN, 'WEB'), filtered]);
        await commission.waitForListLoaded();
        expect(await commission.rows.count()).toBe(1);
        await expect(commission.rows.first().getByText(BILLER_CASHIN, { exact: true })).toBeVisible();
        await commission.clearFilter();
    });

    test('clearing the filter restores more than one row', async () => {
        await commission.filterByTransactionTypeAndPlatform(BILLER_CASHIN, 'WEB');
        await commission.clearFilter();
        expect(await commission.rows.count()).toBeGreaterThan(1);
    });

    test('Add New Commission opens the category chooser with Cash-In available', async () => {
        await commission.openAddNewCommission();
        try {
            await expect(commission.chooseTypeModal).toBeVisible();
            await expect(commission.chooseTypeModal.locator('input[placeholder="Cash-In"]')).toHaveCount(1);
        } finally {
            await commission.chooseTypeModalCloseIcon.click().catch(() => { /* modal may already be closed */ });
            await commission.page.keyboard.press('Escape');
        }
    });

    test('paginator Next and Previous change the visible page and return to the first', async () => {
        const page = commission.page;
        const nextControl = commission.nextPageButton.or(page.getByText(/^Next$/i)).first();
        const prevControl = commission.prevPageButton.or(page.getByText(/^Previous$|^Prev$/i)).first();
        const firstPageRows = await commission.rows.allInnerTexts();
        await nextControl.click();
        await commission.waitForListLoaded();
        const secondPageRows = await commission.rows.allInnerTexts();
        expect(secondPageRows.join('|')).not.toBe(firstPageRows.join('|'));
        await prevControl.click();
        await commission.waitForListLoaded();
        expect(await commission.rows.allInnerTexts()).toEqual(firstPageRows);
    });

    test('edit form opens pre-filled with the row values and Cancel leaves them unchanged', async () => {
        const found = await commission.findRowByFilter(BILLER_CASHIN, 'WEB');
        expect(found, 'Biller Bank Cashin WEB row must be visible').not.toBeNull();
        const before = found!.values;

        await commission.openEditForm(found!.row);
        await commission.cancelButton().click();
        await commission.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 });

        const after = await commission.readCurrentValues(found!.row);
        expect(after.minimumAmount).toBe(before.minimumAmount);
        expect(after.maximumAmount).toBe(before.maximumAmount);
        expect(after.value).toBe(before.value);
        expect(after.isPercentage).toBe(before.isPercentage);
    });
});
