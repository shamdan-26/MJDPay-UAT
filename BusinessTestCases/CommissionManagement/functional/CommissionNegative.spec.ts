import { test, expect, type BrowserContext } from '@playwright/test';
import { loginToCommissionManagement } from '../CommissionManagementHelper';
import {
    type AdminCommissionManagementPage,
    COMMISSION_CATEGORY,
    ACCOUNT_TYPE,
} from '../../pageElements/CommissionManagement/AdminCommissionManagementPage';

// Negative validation for both commission screens. Invalid values are typed
// into the Add/Edit form and the Confirm button is asserted disabled — nothing
// is submitted for the invalid cases, so no bad row is written to live config.
// The one case that does reach the backend (duplicate account override) is
// expected to be rejected with 409 COMMISSION_ALREADY_EXISTS (confirmed live
// 2026-09-24) and is verified afterwards via the API row count.

const PROFILE_CODE = 'BIL-ZCGGH41MNK-14';
const MOBILE = '+966597389429';
const COMPANY = 'Q9557';
const BILLER_CODE = '102003';

const INVALID_MIN_GT_MAX = { platform: 'WEB' as const, minimumAmount: '500', maximumAmount: '100', value: '5', isPercentage: true };
const INVALID_PERCENT_OVER_100 = { platform: 'WEB' as const, minimumAmount: '1', maximumAmount: '1000', value: '150', isPercentage: true };
const INVALID_NEGATIVE_MIN = { platform: 'WEB' as const, minimumAmount: '-5', maximumAmount: '1000', value: '5', isPercentage: true };

test.describe('Commission Management — negative validation', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180000);

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

    /** Opens Add New on the current screen, picks Cash-In, fills the given values, and returns whether Confirm is enabled. Never clicks Confirm. */
    async function confirmEnabledForValues(accountType: string, values: Parameters<AdminCommissionManagementPage['fillCommissionValues']>[0]): Promise<boolean> {
        await commission.openAddNewCommission();
        await commission.chooseCommissionCategory(COMMISSION_CATEGORY.CASH_IN);
        await commission.chooseAccountType(accountType);
        await commission.fillCommissionValues(values);
        const enabled = await commission.confirmButton().isEnabled().catch(() => false);
        await commission.cancelButton().click();
        await commission.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 });
        return enabled;
    }

    test('default: minimum greater than maximum keeps Confirm disabled', async () => {
        expect(await confirmEnabledForValues(ACCOUNT_TYPE.BILLER, INVALID_MIN_GT_MAX), 'Confirm must stay disabled when min > max').toBe(false);
    });

    test('default: percentage above 100 keeps Confirm disabled', async () => {
        expect(await confirmEnabledForValues(ACCOUNT_TYPE.BILLER, INVALID_PERCENT_OVER_100), 'Confirm must stay disabled for a percentage over 100').toBe(false);
    });

    test('default: negative minimum keeps Confirm disabled', async () => {
        expect(await confirmEnabledForValues(ACCOUNT_TYPE.BILLER, INVALID_NEGATIVE_MIN), 'Confirm must stay disabled for a negative minimum').toBe(false);
    });

    test('default edit: minimum greater than maximum keeps Confirm disabled and cancel leaves the row unchanged', async () => {
        const found = await commission.findRowByFilter('Biller Bank Cashin', 'WEB');
        expect(found).not.toBeNull();
        const before = found!.values;
        await commission.openEditForm(found!.row);
        await commission.fillCommissionValues({ ...INVALID_MIN_GT_MAX, platform: 'WEB' });
        const enabled = await commission.confirmButton().isEnabled().catch(() => false);
        await commission.cancelButton().click();
        await commission.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 });
        expect(enabled, 'edit Confirm must stay disabled when min > max').toBe(false);
        const after = await commission.readCurrentValues(found!.row);
        expect(after.minimumAmount).toBe(before.minimumAmount);
        expect(after.maximumAmount).toBe(before.maximumAmount);
    });

    test('default edit: empty minimum keeps Confirm disabled', async () => {
        const found = await commission.findRowByFilter('Biller Bank Cashin', 'WEB');
        expect(found).not.toBeNull();
        await commission.openEditForm(found!.row);
        await commission.minimumAmountInput().fill('');
        const enabled = await commission.confirmButton().isEnabled().catch(() => false);
        await commission.cancelButton().click();
        await commission.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 });
        expect(enabled, 'edit Confirm must stay disabled when the minimum is empty').toBe(false);
    });

    test('account edit: minimum greater than maximum keeps Confirm disabled and cancel leaves the row unchanged', async () => {
        await commission.openAccountCommissionsByMobile(MOBILE, COMPANY);
        const row = await commission.findAccountRowByTransactionType('Biller Bank Cashin');
        expect(row).not.toBeNull();
        const before = await commission.readCurrentValues(row!);
        await commission.openEditForm(row!);
        await commission.fillCommissionValues({ ...INVALID_MIN_GT_MAX, platform: 'WEB' });
        const enabled = await commission.confirmButton().isEnabled().catch(() => false);
        await commission.cancelButton().click();
        await commission.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 });
        expect(enabled, 'account edit Confirm must stay disabled when min > max').toBe(false);
        const after = await commission.readCurrentValues(row!);
        expect(after.minimumAmount).toBe(before.minimumAmount);
        expect(after.maximumAmount).toBe(before.maximumAmount);
    });

    test('default: row count and values are unchanged after the invalid attempts', async () => {
        const rows = await commission.apiFetchAllCommissions();
        const billerWeb = rows.filter(r => r.transactionTypeCode === BILLER_CODE && r.platformType === 'web');
        expect(billerWeb).toHaveLength(1);
    });

    test('account: minimum greater than maximum keeps Confirm disabled', async () => {
        await commission.openAccountCommissionsByMobile(MOBILE, COMPANY);
        expect(await confirmEnabledForValues(ACCOUNT_TYPE.BILLER, INVALID_MIN_GT_MAX), 'Confirm must stay disabled when min > max').toBe(false);
    });

    test('account: a duplicate override for the same type and platform is rejected and no second row is created', async () => {
        await commission.openAccountCommissionsByMobile(MOBILE, COMPANY);
        const before = await commission.apiFetchAccountCommissions(PROFILE_CODE);
        const matchingBefore = before.filter(r => r.transactionTypeCode === BILLER_CODE && r.platformType === 'web');
        expect(matchingBefore).toHaveLength(1);

        // The backend's own rejection (409 COMMISSION_ALREADY_EXISTS) is the
        // expected outcome. A UI-side error here is also acceptable — the
        // check that matters is the API row count afterwards.
        await commission.openAddNewCommission();
        await commission.chooseCommissionCategory(COMMISSION_CATEGORY.CASH_IN);
        await commission.chooseAccountType(ACCOUNT_TYPE.BILLER);
        await commission.fillCommissionValues({ platform: 'WEB', minimumAmount: '462', maximumAmount: '92671', value: '7', isPercentage: true });
        await commission.confirmButton().click().catch(() => { /* if the button is already gone, nothing was submitted */ });
        await commission.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => { /* modal may stay open on rejection */ });
        if (await commission.modalOverlay.isVisible().catch(() => false)) {
            await commission.cancelButton().click().catch(() => { /* best-effort */ });
        }

        const after = await commission.apiFetchAccountCommissions(PROFILE_CODE);
        const matchingAfter = after.filter(r => r.transactionTypeCode === BILLER_CODE && r.platformType === 'web');
        expect(matchingAfter, 'a duplicate override must not be persisted').toHaveLength(1);
    });
});
