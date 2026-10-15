import { test, expect, type BrowserContext } from '@playwright/test';
import { loginToCommissionManagement } from '../CommissionManagementHelper';
import { type AdminCommissionManagementPage } from '../../pageElements/CommissionManagement/AdminCommissionManagementPage';

// UI presence and read-only behaviour for the Accounts Commission screens for
// Q9557. Nothing here toggles or saves an account override.

const MOBILE = '+966597389429';
const COMPANY = 'Q9557';
const BILLER_CASHIN = 'Biller Bank Cashin';

test.describe('Commission Management — Accounts Commission UI', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120000);

    let context: BrowserContext;
    let commission: AdminCommissionManagementPage;

    test.beforeAll(async ({ browser }) => {
        const session = await loginToCommissionManagement(browser);
        context = session.context;
        commission = session.commission;
    });

    test.afterAll(async () => {
        await context?.close();
    });

    test('accounts list shows the Q9557 account and its View Account Commissions action', async () => {
        await commission.openAccountCommissionsByMobile(MOBILE, COMPANY);
        // openAccountCommissionsByMobile navigates through the list; reaching
        // the account page is itself the assertion. Check the URL and that
        // the grid rendered (rows or an explicit empty state).
        await expect(commission.page).toHaveURL(/\/admin\/main\/commission\/account-commission/);
        await expect(commission.accountCommissionRows.first().or(commission.page.getByText(/No Data Found/i)).first()).toBeVisible({ timeout: 15000 });
    });

    test('account commissions grid shows the Biller Bank Cashin override with its values', async () => {
        await commission.openAccountCommissionsByMobile(MOBILE, COMPANY);
        const row = await commission.findAccountRowByTransactionType(BILLER_CASHIN);
        expect(row, `${BILLER_CASHIN} override row must be listed for ${COMPANY}`).not.toBeNull();
        await expect(commission.accountMinValueCell(row!)).toBeVisible();
        await expect(commission.accountMaxValueCell(row!)).toBeVisible();
        await expect(commission.accountPlatformCell(row!)).toBeVisible();
        await expect(commission.accountStatusToggleButton(row!)).toBeVisible();
    });

    test('account override edit form opens pre-filled and Cancel leaves it unchanged', async () => {
        await commission.openAccountCommissionsByMobile(MOBILE, COMPANY);
        const row = await commission.findAccountRowByTransactionType(BILLER_CASHIN);
        expect(row).not.toBeNull();
        const before = await commission.readCurrentValues(row!);

        await commission.openEditForm(row!);
        await commission.cancelButton().click();
        await commission.modalOverlay.waitFor({ state: 'hidden', timeout: 10000 });

        const after = await commission.readCurrentValues(row!);
        expect(after.minimumAmount).toBe(before.minimumAmount);
        expect(after.maximumAmount).toBe(before.maximumAmount);
        expect(after.value).toBe(before.value);
        expect(after.isPercentage).toBe(before.isPercentage);
    });
});
