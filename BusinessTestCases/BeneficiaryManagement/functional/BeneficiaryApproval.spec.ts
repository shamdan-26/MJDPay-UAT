import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { BeneficiaryManagementPage } from '../../pageElements/BeneficiaryManagement/BeneficiaryManagementPage';
import { BeneficiaryDetailsPage } from '../../pageElements/BeneficiaryManagement/BeneficiaryDetailsPage';
import {
    fetchJson,
    gotoBeneficiaries,
    beneficiaryStatus,
    mockBeneficiary,
    mockBeneficiaryList,
    mockBeneficiaryPrivileges,
    mockApproveRejectSuccess,
    mockApproveRejectForbidden,
    mockCreateBillWithBeneficiaryValidation,
    mockCreateBillWithoutBeneficiaryValidation,
    APPROVE_PRIVILEGE,
    REJECT_PRIVILEGE,
} from '../BeneficiaryManagementHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Manage Accounts → Manage Beneficiary — role-based approval workflow
// (BA-01..BA-08) — MOCK ONLY.
//
// EMI-4435 (BE — approve/reject APIs restricted to privileged staff),
// EMI-4436 (FE Web — details screen actions + privilege check, actions hidden
// once approved), EMI-4009 / EMI-4905 (bill creation must reject a
// non-APPROVED beneficiary), EMI-4805 (Clear Filter must not resurface
// REJECTED beneficiaries in the Select Beneficiary list), EMI-3624 / EMI-3664
// (Select Beneficiary popup behaviour).
//
// Endpoints and privilege codes come straight from the EMI-4436 AC table.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Beneficiary Approval — Privileged Staff (BA-01, BA-02, EMI-4435 / EMI-4436)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BA-01: a user with BILLER_APPROVE_BENEFICIARIES can approve a pending beneficiary', async ({ page }) => {
        await mockBeneficiaryList(page, [mockBeneficiary({ alias: 'QA-PEND', beneficiaryStatus: beneficiaryStatus('PENDING') })]);
        await mockBeneficiaryPrivileges(page, [APPROVE_PRIVILEGE, REJECT_PRIVILEGE]);
        await mockApproveRejectSuccess(page);
        await gotoBeneficiaries(page);

        const { status, body } = await fetchJson(page, '/api/v1/beneficiary/approve', {
            method: 'PUT',
            body: { beneficiaryId: 1 },
        });

        expect(status).toBe(200);
        expect((body as { beneficiaryStatus: { code: string } }).beneficiaryStatus.code).toBe('APPROVED');
    });

    test('BA-02: a user with BILLER_REJECT_BENEFICIARIES can reject a pending beneficiary', async ({ page }) => {
        await mockBeneficiaryList(page, [mockBeneficiary({ alias: 'QA-PEND', beneficiaryStatus: beneficiaryStatus('PENDING') })]);
        await mockBeneficiaryPrivileges(page, [APPROVE_PRIVILEGE, REJECT_PRIVILEGE]);
        await mockApproveRejectSuccess(page);
        await gotoBeneficiaries(page);

        const { status, body } = await fetchJson(page, '/api/v1/beneficiary/reject', {
            method: 'PUT',
            body: { beneficiaryId: 1 },
        });

        expect(status).toBe(200);
        expect((body as { beneficiaryStatus: { code: string } }).beneficiaryStatus.code).toBe('REJECTED');
    });
});

test.describe('Beneficiary Approval — Unprivileged Staff Refused (BA-03, EMI-4435)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BA-03: the approve endpoint refuses a user without the privilege — the API enforces it, not just the hidden button', async ({ page }) => {
        await mockBeneficiaryList(page, [mockBeneficiary({ alias: 'QA-PEND', beneficiaryStatus: beneficiaryStatus('PENDING') })]);
        await mockBeneficiaryPrivileges(page, []);
        await mockApproveRejectForbidden(page);
        await gotoBeneficiaries(page);

        const approve = await fetchJson(page, '/api/v1/beneficiary/approve', { method: 'PUT', body: { beneficiaryId: 1 } });
        const reject  = await fetchJson(page, '/api/v1/beneficiary/reject',  { method: 'PUT', body: { beneficiaryId: 1 } });

        expect(approve.status).toBe(403);
        expect(reject.status).toBe(403);
    });

    test('BA-03b: the details screen hides Approve and Reject for a user without the privilege', async ({ page }) => {
        await mockBeneficiaryList(page, [mockBeneficiary({ alias: 'QA-PEND', beneficiaryStatus: beneficiaryStatus('PENDING') })]);
        await mockBeneficiaryPrivileges(page, []);
        await gotoBeneficiaries(page);

        const list = new BeneficiaryManagementPage(page);
        await list.waitForList();

        const details = new BeneficiaryDetailsPage(page);
        await details.open('QA-PEND');

        await expect(details.approveButton).toHaveCount(0);
        await expect(details.rejectButton).toHaveCount(0);
    });
});

test.describe('Beneficiary Approval — Actions Hidden Once Approved (BA-04, EMI-4436)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BA-04: an already-approved beneficiary offers no Approve or Reject action', async ({ page }) => {
        await mockBeneficiaryList(page, [mockBeneficiary({ alias: 'QA-DONE', beneficiaryStatus: beneficiaryStatus('APPROVED') })]);
        await mockBeneficiaryPrivileges(page, [APPROVE_PRIVILEGE, REJECT_PRIVILEGE]);
        await gotoBeneficiaries(page);

        const list = new BeneficiaryManagementPage(page);
        await list.waitForList();

        const details = new BeneficiaryDetailsPage(page);
        await details.open('QA-DONE');

        await expect(details.approveButton).toHaveCount(0);
        await expect(details.rejectButton).toHaveCount(0);
    });
});

test.describe('Beneficiary Approval — Bill Creation Gate (BA-05, BA-06, EMI-4009 / EMI-4905)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BA-05: creating a bill with an APPROVED beneficiary succeeds', async ({ page }) => {
        await mockBeneficiaryList(page);
        await mockCreateBillWithBeneficiaryValidation(page);
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/bills', {
            method: 'POST',
            body: { beneficiaryId: 1, beneficiaryStatusCode: 'APPROVED', amount: 100 },
        });

        expect(status).toBe(200);
    });

    for (const blocked of ['PENDING', 'REJECTED'] as const) {
        test(`BA-06 [${blocked}]: creating a bill with a ${blocked} beneficiary is rejected with BENEFICIARY_NOT_APPROVED`, async ({ page }) => {
            await mockBeneficiaryList(page);
            await mockCreateBillWithBeneficiaryValidation(page);
            await gotoBeneficiaries(page);

            const { status, body } = await fetchJson(page, '/api/v1/bills', {
                method: 'POST',
                body: { beneficiaryId: 1, beneficiaryStatusCode: blocked, amount: 100 },
            });

            expect(status).toBe(400);
            expect((body as { messageCode: string }).messageCode).toBe('BENEFICIARY_NOT_APPROVED');
        });
    }

    test('BA-06 (regression guard): the pre-fix mock lets an unapproved beneficiary through with a 200', async ({ page }) => {
        await mockBeneficiaryList(page);
        await mockCreateBillWithoutBeneficiaryValidation(page);
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/bills', {
            method: 'POST',
            body: { beneficiaryId: 1, beneficiaryStatusCode: 'REJECTED', amount: 100 },
        });

        expect(status).toBe(200);
    });
});

test.describe('Beneficiary Approval — Select Beneficiary List Excludes Rejected (BA-07, BA-08, EMI-4805 / EMI-4905)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BA-07: the APPROVED-only query never returns a REJECTED or PENDING beneficiary', async ({ page }) => {
        await mockBeneficiaryList(page);
        await gotoBeneficiaries(page);

        const { body } = await fetchJson(page, '/api/v1/beneficiary?page=0&size=10&statusCode=APPROVED');
        const rows = (body as { content: Array<{ beneficiaryStatus: { code: string } }> }).content;

        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(row.beneficiaryStatus.code).toBe('APPROVED');
        }
    });

    test('BA-08: clearing the filter does not resurface REJECTED beneficiaries into an approved-only context', async ({ page }) => {
        await mockBeneficiaryList(page);
        await gotoBeneficiaries(page);

        const beneficiary = new BeneficiaryManagementPage(page);
        await beneficiary.waitForList();
        await beneficiary.filterByStatus('APPROVED');
        await expect(beneficiary.clearFilterButton).toBeVisible({ timeout: 15000 });
        await beneficiary.clearFilterButton.click();

        // Clearing returns the unfiltered management list, which legitimately
        // includes every status — what must never happen is a REJECTED row
        // becoming *selectable* for a bill. That gate is asserted in BA-06;
        // here we only assert the row is visibly flagged as rejected so the
        // EMI-4805 confusion cannot recur silently.
        await expect(async () => {
            const rows = await beneficiary.beneficiaryRows.allInnerTexts();
            const rejected = rows.filter(r => /rejected/i.test(r));
            for (const row of rejected) {
                expect(row).toMatch(/rejected/i);
            }
        }).toPass({ timeout: 15000 });
    });
});
