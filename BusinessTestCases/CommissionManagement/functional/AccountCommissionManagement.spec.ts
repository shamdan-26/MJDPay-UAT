import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { AdminCommissionManagementPage, COMMISSION_CATEGORY } from '../../pageElements/CommissionManagement/AdminCommissionManagementPage';
import {
    loginToCommissionManagement,
    ensureAccountCommissionExistsAndActive,
    randomCommissionValues,
} from '../CommissionManagementHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Admin Portal → Commission Management → Accounts Commission.
//
// A per-account override list one level below Default Commission — same
// "Add New Commission" wizard, scoped to a single business account (looked up
// here by mobile number) instead of the whole platform. See
// AdminCommissionManagementPage.ts's header comment above `ACCOUNTS_LIST_URL`
// for how this screen was confirmed live to reuse Default Commission's own
// modal component.
//
// +966598984853 (company B7002) is a disposable dev account carrying no
// pre-existing account-level commissions (confirmed live 2026-09-27, "No
// Data Found") and not used by any other spec in this repo — chosen
// specifically so this suite's create/edit/disable/activate churn can't
// affect a real transaction flow the way doing this on the Topup suite's own
// merchant account would (see TopupCommission.spec.ts's TU-CM02 for that
// narrower, flow-verifying case instead).
// ─────────────────────────────────────────────────────────────────────────────

const TEST_ACCOUNT_MOBILE = '+966598984853';
const TEST_TRANSACTION_TYPE = 'Merchant Cashin';

test.describe('Commission Management — Accounts Commission', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180000);

    let context: BrowserContext;
    let page: Page;
    let commission: AdminCommissionManagementPage;

    test.beforeAll(async ({ browser }) => {
        ({ context, page, commission } = await loginToCommissionManagement(browser));
    });

    test.afterAll(async () => {
        await context.close();
    });

    test('Add New Commission creates an Active per-account override with the entered values', async () => {
        const values = { ...randomCommissionValues(), platform: 'WEB' as const };
        const row = await ensureAccountCommissionExistsAndActive(
            commission,
            TEST_ACCOUNT_MOBILE,
            COMMISSION_CATEGORY.CASH_IN,
            TEST_TRANSACTION_TYPE,
            values,
        );

        await expect(commission.accountTransactionTypeCell(row)).toHaveText(TEST_TRANSACTION_TYPE);
        await expect(commission.accountPlatformCell(row)).toHaveText(/web/i);
        await expect(commission.statusBadge(row), 'row is Active after ensureAccountCommissionExistsAndActive').toHaveClass(/status-active/);
    });

    test('Editing an existing account-level commission updates its values', async () => {
        const row = await commission.findAccountRowByTransactionType(TEST_TRANSACTION_TYPE);
        expect(row, `a "${TEST_TRANSACTION_TYPE}" row exists from the previous test`).not.toBeNull();

        const beforeMin = (await commission.accountMinValueCell(row!).textContent())?.trim();
        const beforeMax = (await commission.accountMaxValueCell(row!).textContent())?.trim();
        const beforeAmount = (await commission.amountCell(row!).textContent())?.trim();

        const newValues = { ...randomCommissionValues(), platform: 'WEB' as const };
        await commission.editAccountCommission(row!, newValues);

        await expect(commission.accountMinValueCell(row!)).not.toHaveText(beforeMin ?? '');
        await expect(commission.accountMaxValueCell(row!)).not.toHaveText(beforeMax ?? '');
        await expect(commission.amountCell(row!)).not.toHaveText(beforeAmount ?? '');
    });

    test('Disabling then re-activating an account-level commission toggles its status', async () => {
        const row = await commission.findAccountRowByTransactionType(TEST_TRANSACTION_TYPE);
        expect(row, `a "${TEST_TRANSACTION_TYPE}" row exists from the previous tests`).not.toBeNull();

        await commission.disableAccountRow(row!);
        await expect(commission.statusBadge(row!), 'row is Disabled after disableAccountRow').toHaveClass(/status-inactive/);

        await commission.activateAccountRow(row!);
        await expect(commission.statusBadge(row!), 'row is Active again after activateAccountRow').toHaveClass(/status-active/);

        // Leave the disposable test account clean for the next run rather
        // than an Active override lingering indefinitely — there is no
        // delete for these rows (see disableAccountRow's header comment).
        await commission.disableAccountRow(row!);
    });
});
