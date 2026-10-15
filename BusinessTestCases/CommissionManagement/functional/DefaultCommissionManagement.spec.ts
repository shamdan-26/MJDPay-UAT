import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { AdminCommissionManagementPage, COMMISSION_CATEGORY, ACCOUNT_TYPE } from '../../pageElements/CommissionManagement/AdminCommissionManagementPage';
import {
    loginToCommissionManagement,
    ensureCommissionExistsAndActive,
    ensureCommissionExistsAndActiveByPlatform,
    randomCommissionValues,
} from '../CommissionManagementHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Admin Portal → Commission Management → Default Commission.
//
// For a given account type (Merchant/Biller/...) + transaction type: verify it
// exists in the Default Commission list, create it via "Add New Commission"
// if it doesn't, activate it if it's Disabled, then open its edit-pencil form
// and update its amount/min/max/value with randomly generated values.
//
// Own-browser admin login (the admin SPA is a separate app from the merchant
// portal, so session.json / fixtures.ts's `page` don't apply) — same
// bespoke-beforeAll pattern BankTransfer/Products/AdminOtpConfig specs use.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Commission Management — Default Commission', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(180000);

    let context: BrowserContext;
    let page: Page;
    let commission: AdminCommissionManagementPage;

    test.beforeAll(async ({ browser }) => {
        ({ context, page, commission } = await loginToCommissionManagement(browser));
        await commission.gotoDefaultCommission();
    });

    test.afterAll(async () => {
        await context.close();
    });

    test('Merchant Bank Transfer exists, is Active, and gets its values updated', async () => {
        const row = await ensureCommissionExistsAndActive(
            commission,
            COMMISSION_CATEGORY.BANK_TRANSFER,
            ACCOUNT_TYPE.MERCHANT,
            'Merchant Bank Transfer',
            randomCommissionValues(),
        );

        await expect(commission.transactionTypeCell(row)).toHaveText('Merchant Bank Transfer');
        await expect(commission.statusBadge(row), 'row is Active after ensureCommissionExistsAndActive').toHaveClass(/status-active/);

        // Capture the pre-edit displayed values so the update can be verified
        // by "did it change" rather than an exact-format string match — the
        // grid renders amounts with thousands separators the raw form input
        // doesn't use.
        const beforeMin = (await commission.minValueCell(row).textContent())?.trim();
        const beforeMax = (await commission.maxValueCell(row).textContent())?.trim();
        const beforeAmount = (await commission.amountCell(row).textContent())?.trim();

        const newValues = randomCommissionValues();
        await commission.editCommission(row, newValues);

        await expect(commission.minValueCell(row)).not.toHaveText(beforeMin ?? '');
        await expect(commission.maxValueCell(row)).not.toHaveText(beforeMax ?? '');
        await expect(commission.amountCell(row)).not.toHaveText(beforeAmount ?? '');
    });

    // "Biller Bank Cashin" is a live-observed case of a transaction type
    // whose grid cell has been seen rendering as a raw internal code instead
    // of its friendly name — a plain text-scan (`findRowByTransactionType`)
    // can never match it. This exercises the filter-panel-based lookup
    // (`ensureCommissionExistsAndActiveByPlatform` / `findRowByFilter`)
    // that's immune to that, and specifically targets WEB since that's the
    // platform TopupCommission.spec.ts's live-tier tests depend on.
    test('Biller Bank Cashin (WEB) exists, is Active, and gets its values updated', async () => {
        const { row } = await ensureCommissionExistsAndActiveByPlatform(
            commission,
            COMMISSION_CATEGORY.CASH_IN,
            ACCOUNT_TYPE.BILLER,
            'Biller Bank Cashin',
            'WEB',
            randomCommissionValues(),
        );

        await expect(commission.statusBadge(row), 'row is Active after ensureCommissionExistsAndActiveByPlatform').toHaveClass(/status-active/);

        const beforeMin = (await commission.minValueCell(row).textContent())?.trim();
        const beforeMax = (await commission.maxValueCell(row).textContent())?.trim();
        const beforeAmount = (await commission.amountCell(row).textContent())?.trim();

        const newValues = { ...randomCommissionValues(), platform: 'WEB' as const };
        await commission.editCommission(row, newValues);

        await expect(commission.minValueCell(row)).not.toHaveText(beforeMin ?? '');
        await expect(commission.maxValueCell(row)).not.toHaveText(beforeMax ?? '');
        await expect(commission.amountCell(row)).not.toHaveText(beforeAmount ?? '');
    });
});
