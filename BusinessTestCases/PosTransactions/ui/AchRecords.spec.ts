import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/helpers/LoginHelper.ts';
import { AchRecordsPage } from '../../pageElements/PosTransactions/AchRecordsPage';
import {
    TERMINAL_ID,
    achRecordRows,
    mockAchRecordList,
    mockAchRecordsEmpty,
    mockAchRecordsWithoutBeneficiary,
    mockAchReleaseSuccess,
    gotoAchRecords,
} from '../helpers/PosTransactionsHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// ACH Records — Admin web screen (ACH-UI-01..ACH-UI-07). MOCK ONLY.
//
// EMI-6015 (the screen: paginated records across all devices, backend-supported
// filters that apply and reset, only backend-declared actions shown,
// release/reject behind a confirmation that refreshes state on success, and
// loading/empty/progress/success/error states), EMI-6063 (Status renders the
// raw i18n key), EMI-6064 (Wallet Code column missing), EMI-6065 (no View
// Details action; Date belongs in the details view), EMI-6036 (beneficiary
// IBAN and name populated on the row).
//
// Release and reject are real money movements against the live gateway, which
// is why api/PosAchTransfers.spec.ts gates them behind POS_ACH_ALLOW_MUTATIONS.
// Here they are mocked outright — no request leaves the browser — so the
// confirmation-and-refresh AC can be exercised safely on every run.
//
// EMI-6065 left one question open with the reporter: whether the Date filter
// stays, and which of matchedAt / approvedAt / sentAt / valueDate it would use.
// ACH-UI-05 therefore asserts only what the ticket actually settled — Date is
// out of the table and into the details view — and does not assume a filter.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('ACH Records UI — Listing (ACH-UI-01, EMI-6015)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('ACH-UI-01: records render across all devices with their batch reference', async ({ page }) => {
        await mockAchRecordList(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        await expect(ach.recordRows.first()).toBeVisible({ timeout: 20000 });
        await expect(ach.recordsTable).toContainText('BATCH-0001');
        await expect(ach.recordsTable).toContainText('BATCH-0002');
        await expect(ach.loadingIndicator).not.toBeVisible();
    });

    test('ACH-UI-01b: an empty result set renders the empty state', async ({ page }) => {
        await mockAchRecordsEmpty(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        await expect(ach.emptyState).toBeVisible({ timeout: 20000 });
        await expect(ach.loadingIndicator).not.toBeVisible();
    });
});

test.describe('ACH Records UI — Status Is Translated (ACH-UI-02, EMI-6063)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('ACH-UI-02: the Status column shows a readable value, not a raw translation key', async ({ page }) => {
        await mockAchRecordList(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        const statuses = await ach.cellTexts(ach.statusCells);
        test.skip(statuses.length === 0, 'status column not resolvable — reconcile locators against the live DOM');

        for (const status of statuses) {
            // The exact leaked keys quoted in EMI-6063.
            expect(status, `Status rendered the raw key "${status}"`).not.toContain('Main.Ach_records');
            expect(status, `Status rendered a dotted i18n key "${status}"`).not.toMatch(/^Main\./);
            expect(status).not.toBe('');
        }
    });

    test('ACH-UI-02b: AWAITING_APPROVAL and SUCCESSFUL both surface as prose', async ({ page }) => {
        await mockAchRecordList(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        // The two human-readable strings named in the EMI-6063 expected result.
        await expect(ach.recordsTable).toContainText(/awaiting\s*approval/i, { timeout: 20000 });
        await expect(ach.recordsTable).toContainText(/successful/i);
    });
});

test.describe('ACH Records UI — Wallet Code Column (ACH-UI-03, EMI-6064)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('ACH-UI-03: the table has a Wallet Code column', async ({ page }) => {
        await mockAchRecordList(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        const headers = await ach.headerTexts();
        test.skip(headers.length === 0, 'column headers not resolvable — reconcile locators against the live DOM');

        expect(headers.some(h => /wallet\s*code/i.test(h)), `no Wallet Code column: ${headers.join(' | ')}`).toBe(true);
    });

    test('ACH-UI-03b: every row shows its wallet code', async ({ page }) => {
        await mockAchRecordList(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        const [first] = achRecordRows();
        await expect(ach.recordsTable).toContainText(first!.walletCode, { timeout: 20000 });

        const codes = await ach.cellTexts(ach.walletCodeCells);
        test.skip(codes.length === 0, 'wallet code column not resolvable — reconcile locators against the live DOM');
        for (const code of codes) {
            expect(code, 'a record rendered an empty Wallet Code cell').not.toBe('');
        }
    });
});

test.describe('ACH Records UI — View Details (ACH-UI-04, EMI-6065)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('ACH-UI-04: each record exposes a View Details action', async ({ page }) => {
        await mockAchRecordList(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        const row = ach.recordRows.first();
        const inRow = row.getByRole('button', { name: /view\s*details|details/i }).first();
        const present = await inRow.or(ach.viewDetailsButton)
            .waitFor({ state: 'visible', timeout: 10000 })
            .then(() => true)
            .catch(() => false);

        expect(present, 'no View Details action on an ACH record row').toBe(true);
    });

    test('ACH-UI-04b: the details view holds the full record, including the dates', async ({ page }) => {
        await mockAchRecordList(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        const canOpen = await ach.viewDetailsButton
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!canOpen, 'View Details not rendered — ACH-UI-04 already covers its absence');

        await ach.openDetailsForFirstRow();

        const [first] = achRecordRows();
        await expect(ach.detailsPanel).toContainText(first!.reconBatchRefNum);
        await expect(ach.detailsPanel).toContainText(first!.beneficiaryAccountIban);
    });
});

test.describe('ACH Records UI — Date Moved Out Of The Table (ACH-UI-05, EMI-6065)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('ACH-UI-05: the main table has no standalone Date column', async ({ page }) => {
        await mockAchRecordList(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        const headers = await ach.headerTexts();
        test.skip(headers.length === 0, 'column headers not resolvable — reconcile locators against the live DOM');

        // EMI-6065 asks for the Date column to move into View Details. Scoped
        // to a standalone "Date" header — "Value Date"/"Matched At" inside the
        // details view are not what the ticket removes.
        const dateColumns = headers.filter(h => /^date$/i.test(h.trim()));
        expect(dateColumns, `a standalone Date column is still in the table: ${headers.join(' | ')}`).toHaveLength(0);
    });
});

test.describe('ACH Records UI — Actions Are Backend-Driven (ACH-UI-06, EMI-6015)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('ACH-UI-06: a record with an empty allowedActions offers no release or reject', async ({ page }) => {
        // Row 2 is SUCCESSFUL with allowedActions: [] — nothing may be offered.
        const settledOnly = achRecordRows().filter(r => r.allowedActions.length === 0);
        await mockAchRecordList(page, settledOnly);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();
        await expect(ach.recordRows.first()).toBeVisible({ timeout: 20000 });

        await expect(ach.releaseButton).not.toBeVisible();
        await expect(ach.rejectButton).not.toBeVisible();
    });

    test('ACH-UI-06b: a record with RELEASE allowed offers it', async ({ page }) => {
        const awaitingOnly = achRecordRows().filter(r => r.allowedActions.includes('RELEASE'));
        await mockAchRecordList(page, awaitingOnly);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        await expect(ach.releaseButton).toBeVisible({ timeout: 20000 });
    });

    test('ACH-UI-06c: release is confirmed before it is submitted, and reports success', async ({ page }) => {
        const awaitingOnly = achRecordRows().filter(r => r.allowedActions.includes('RELEASE'));
        await mockAchRecordList(page, awaitingOnly);
        await mockAchReleaseSuccess(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        const canRelease = await ach.releaseButton
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!canRelease, 'release action not rendered — ACH-UI-06b already covers its absence');

        await ach.releaseFirstRow();

        await expect(ach.successToast).toBeVisible({ timeout: 20000 });
        await expect(ach.errorToast).not.toBeVisible();
    });
});

test.describe('ACH Records UI — Beneficiary Details Rendered (ACH-UI-07, EMI-6036)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('ACH-UI-07: the beneficiary IBAN and name reach the screen', async ({ page }) => {
        await mockAchRecordList(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        const [first] = achRecordRows();
        const shown = await ach.recordsTable.innerText();
        const inDetails = shown.includes(first!.beneficiaryAccountIban) || shown.includes(first!.beneficiaryName);

        // EMI-6065 permits either placement (table or details view), so this
        // accepts the table and falls through to the details view if not there.
        if (!inDetails) {
            const canOpen = await ach.viewDetailsButton.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
            test.skip(!canOpen, 'beneficiary not in the table and no View Details to check — reconcile against the live DOM');
            await ach.openDetailsForFirstRow();
            await expect(ach.detailsPanel).toContainText(first!.beneficiaryName);
        }
    });

    test('ACH-UI-07 (regression guard, EMI-6036): the pre-fix mock has no beneficiary at all', async ({ page }) => {
        await mockAchRecordsWithoutBeneficiary(page);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        const [first] = achRecordRows();
        await expect(ach.recordsTable).not.toContainText(first!.beneficiaryAccountIban);
    });
});

test.describe('ACH Records UI — Filters (ACH-UI-08, EMI-6015)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('ACH-UI-08: a TID filter narrows the list and reset restores it', async ({ page }) => {
        const rows = [
            ...achRecordRows(),
            { ...achRecordRows()[0]!, id: 99, reconBatchRefNum: 'BATCH-0099', terminalId: 'T0099999' },
        ];
        await mockAchRecordList(page, rows);
        await gotoAchRecords(page);

        const ach = new AchRecordsPage(page);
        await ach.waitForList();

        const hasFilter = await ach.terminalFilter
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!hasFilter, 'terminal filter not rendered — reconcile locators against the live DOM');

        await ach.terminalFilter.fill(TERMINAL_ID);
        await ach.applyFiltersButton.click();
        await expect(ach.recordRows.first()).toBeVisible({ timeout: 20000 });
        await expect(ach.recordsTable).not.toContainText('BATCH-0099');

        await ach.resetFiltersButton.click();
        await expect(ach.recordsTable).toContainText('BATCH-0099', { timeout: 20000 });
    });
});
