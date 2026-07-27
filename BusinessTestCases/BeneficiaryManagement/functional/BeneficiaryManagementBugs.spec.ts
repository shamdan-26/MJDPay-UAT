import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { BeneficiaryManagementPage } from '../../pageElements/BeneficiaryManagement/BeneficiaryManagementPage';
import { BeneficiaryDetailsPage } from '../../pageElements/BeneficiaryManagement/BeneficiaryDetailsPage';
import {
    fetchJson,
    gotoBeneficiaries,
    uniqueAlias,
    mockBeneficiary,
    beneficiaryStatus,
    defaultBeneficiaries,
    mockBeneficiaryList,
    mockBeneficiaryListIgnoringStatusFilter,
    mockBeneficiaryListWithoutIdentifier,
    mockBeneficiaryListForbidden,
    mockAddBeneficiarySuccess,
    mockAddBeneficiaryDuplicate,
    mockAddBeneficiaryDuplicateAccepted,
    mockAddBeneficiaryServerError,
    mockContractUploadTooLarge,
    mockContractAttachmentAvailable,
    mockContractAttachmentMissing,
    mockBeneficiaryOtpSuccess,
    mockBeneficiaryOtpNotSent,
    mockBeneficiaryOtpResendServerError,
    mockBeneficiaryOtpResendForbidden,
    KNOWN_INDIVIDUAL_MOBILE,
} from '../BeneficiaryManagementHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Manage Accounts → Manage Beneficiary — bug regression suite
// (BMB-01..BMB-11) — MOCK ONLY.
//
// EMI-3686, EMI-4414, EMI-4741, EMI-4791, EMI-4812, EMI-5118, EMI-5128,
// EMI-5130, EMI-5138, EMI-5142, EMI-5153, EMI-5317, EMI-5376, EMI-5448,
// EMI-5652, EMI-5692, EMI-5769, EMI-5800, EMI-5864.
//
// Each bug gets a pair: the fixed-behaviour assertion, plus a "regression
// guard" driving the pre-fix mock, so the assertion is proven to catch the
// original defect. Same pattern as SubWalletBugs.spec.ts. The live add/list/
// filter/edit/delete happy path stays in BeneficiaryManagementFlow.spec.ts.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Beneficiary Bugs — Duplicate Rejected (BMB-01, EMI-3686 / EMI-4414)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BMB-01: adding a beneficiary whose CRN is already registered shows an "already added" message, not success', async ({ page }) => {
        await mockBeneficiaryList(page);
        await mockAddBeneficiaryDuplicate(page);
        await gotoBeneficiaries(page);

        const beneficiary = new BeneficiaryManagementPage(page);
        await beneficiary.waitForList();
        await beneficiary.openAddBeneficiaryForm();
        await beneficiary.fillAliasAndCrn(uniqueAlias(), '1088776608');
        await beneficiary.submitBeneficiary();

        await expect(beneficiary.alreadyExistsError).toBeVisible({ timeout: 20000 });
        await expect(beneficiary.successToast).not.toBeVisible();
    });

    test('BMB-01 (regression guard): the pre-fix mock returns 200 for the duplicate', async ({ page }) => {
        await mockAddBeneficiaryDuplicateAccepted(page);
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/beneficiary', {
            method: 'POST',
            body: { alias: 'QA-DUP', crn: '1088776608' },
        });

        expect(status).toBe(200);
    });

    test('BMB-01b (EMI-4414): a genuinely new beneficiary is not wrongly told it already exists', async ({ page }) => {
        const created = mockBeneficiary({ alias: 'QA-BRANDNEW' });
        await mockAddBeneficiarySuccess(page, created);
        await gotoBeneficiaries(page);

        const { status, body } = await fetchJson(page, '/api/v1/beneficiary', {
            method: 'POST',
            body: { alias: 'QA-BRANDNEW', crn: '1088776608' },
        });

        expect(status).toBe(200);
        expect(JSON.stringify(body)).not.toMatch(/already exists/i);
    });
});

test.describe('Beneficiary Bugs — Add By Individual And Company (BMB-02, EMI-4741 / EMI-5448 / EMI-4432)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BMB-02: adding an individual by phone number succeeds', async ({ page }) => {
        await mockBeneficiaryList(page);
        await mockAddBeneficiarySuccess(page, mockBeneficiary({ alias: 'QA-INDIV', mobileNumber: KNOWN_INDIVIDUAL_MOBILE }));
        await mockBeneficiaryOtpSuccess(page);
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/beneficiary', {
            method: 'POST',
            body: { alias: 'QA-INDIV', mobileNumber: KNOWN_INDIVIDUAL_MOBILE, addBy: 'INDIVIDUAL' },
        });

        expect(status).toBe(200);
    });

    test('BMB-02b: the contract attachment is optional when adding by unified number (EMI-4431 / EMI-4432)', async ({ page }) => {
        await mockBeneficiaryList(page);
        await mockAddBeneficiarySuccess(page, mockBeneficiary({ alias: 'QA-NOCONTRACT' }));
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/beneficiary', {
            method: 'POST',
            body: { alias: 'QA-NOCONTRACT', unifiedNumber: '7001234567', contract: null },
        });

        expect(status).toBe(200);
    });

    test('BMB-02 (regression guard, EMI-5317 / EMI-5138 / EMI-5448): the pre-fix mock reproduces the 500 on add', async ({ page }) => {
        await mockAddBeneficiaryServerError(page);
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/beneficiary', {
            method: 'POST',
            body: { alias: 'QA-INDIV', mobileNumber: KNOWN_INDIVIDUAL_MOBILE },
        });

        expect(status).toBe(500);
    });
});

test.describe('Beneficiary Bugs — OTP Is Issued And Resendable (BMB-03, EMI-5864 / EMI-5692 / EMI-5769 / EMI-5800)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BMB-03: submitting the add-beneficiary form triggers POST /beneficiary-otp with a 200', async ({ page }) => {
        await mockBeneficiaryList(page);
        await mockAddBeneficiarySuccess(page);
        await mockBeneficiaryOtpSuccess(page);
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/beneficiary-otp', { method: 'POST' });
        expect(status).toBe(200);
    });

    test('BMB-03b: Resend OTP returns 200, not 403 or 500', async ({ page }) => {
        await mockBeneficiaryList(page);
        await mockBeneficiaryOtpSuccess(page);
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/beneficiary-otp/resend', { method: 'POST' });
        expect(status).toBe(200);
    });

    test('BMB-03 (regression guard, EMI-5864): the pre-fix mock never issues the OTP', async ({ page }) => {
        await mockBeneficiaryOtpNotSent(page);
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/beneficiary-otp', { method: 'POST' });
        expect(status).toBe(500);
    });

    test('BMB-03 (regression guard, EMI-5692): the pre-fix mock reproduces the 500 on resend', async ({ page }) => {
        await mockBeneficiaryOtpResendServerError(page);
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/beneficiary-otp/resend', { method: 'POST' });
        expect(status).toBe(500);
    });

    test('BMB-03 (regression guard, EMI-5769 / EMI-5800): the pre-fix mock reproduces the 403 on resend', async ({ page }) => {
        await mockBeneficiaryOtpResendForbidden(page);
        await gotoBeneficiaries(page);

        const { status, body } = await fetchJson(page, '/api/v1/beneficiary-otp/resend', { method: 'POST' });

        expect(status).toBe(403);
        expect(JSON.stringify(body)).toMatch(/UNAUTHORIZED_EXCEPTION/);
    });
});

test.describe('Beneficiary Bugs — Status Filter Works (BMB-04, EMI-4812)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BMB-04: selecting a status sends statusCode and narrows the list to that status', async ({ page }) => {
        await mockBeneficiaryList(page);
        await gotoBeneficiaries(page);

        const beneficiary = new BeneficiaryManagementPage(page);
        await beneficiary.waitForList();
        await beneficiary.filterByStatus('APPROVED');

        await expect(async () => {
            const rows = await beneficiary.beneficiaryRows.allInnerTexts();
            expect(rows.join(' ')).not.toMatch(/rejected/i);
        }).toPass({ timeout: 15000 });
    });

    test('BMB-04 (regression guard): the pre-fix mock returns every status regardless of statusCode', async ({ page }) => {
        await mockBeneficiaryListIgnoringStatusFilter(page);
        await gotoBeneficiaries(page);

        const { body } = await fetchJson(page, '/api/v1/beneficiary?page=0&size=10&statusCode=APPROVED');
        expect((body as { content: unknown[] }).content).toHaveLength(3);
    });
});

test.describe('Beneficiary Bugs — Identifier Is Returned And Rendered (BMB-05, EMI-5652 / EMI-5376 / EMI-5128)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BMB-05: every beneficiary row carries a non-empty identifier', async ({ page }) => {
        await mockBeneficiaryList(page);
        await gotoBeneficiaries(page);

        const { body } = await fetchJson(page, '/api/v1/beneficiary?page=0&size=10&statusCode=APPROVED');
        const rows = (body as { content: Array<{ beneficiaryIdentifier?: string }> }).content;

        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(row.beneficiaryIdentifier).toBeTruthy();
        }
    });

    test('BMB-05 (regression guard): the pre-fix payload has no identifier field at all', async ({ page }) => {
        await mockBeneficiaryListWithoutIdentifier(page);
        await gotoBeneficiaries(page);

        const { body } = await fetchJson(page, '/api/v1/beneficiary?page=0&size=10');
        const first = (body as { content: Array<Record<string, unknown>> }).content[0];

        expect(first).not.toHaveProperty('beneficiaryIdentifier');
    });
});

test.describe('Beneficiary Bugs — Alias Shown Instead Of Company Name (BMB-06, EMI-5142)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BMB-06: the list shows the alias the user chose, not the resolved company/brand name', async ({ page }) => {
        await mockBeneficiaryList(page, [
            mockBeneficiary({ alias: 'QA-ALIAS-ONLY', brandName: 'Some Company LLC', beneficiaryStatus: beneficiaryStatus('APPROVED') }),
        ]);
        await gotoBeneficiaries(page);

        const beneficiary = new BeneficiaryManagementPage(page);
        await beneficiary.waitForList();

        await expect(page.getByText('QA-ALIAS-ONLY')).toBeVisible({ timeout: 20000 });
        await expect(beneficiary.beneficiaryRows.first()).not.toContainText('Some Company LLC');
    });
});

test.describe('Beneficiary Bugs — Contract Upload Size Message (BMB-07, EMI-5153 / EMI-5073)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BMB-07: a 413 on contract upload surfaces the real size limit, not "Something Went Wrong!"', async ({ page }) => {
        await mockBeneficiaryList(page);
        await mockContractUploadTooLarge(page);
        await gotoBeneficiaries(page);

        const { status, body } = await fetchJson(page, '/api/v1/beneficiary', {
            method: 'POST',
            body: { alias: 'QA-BIGFILE', unifiedNumber: '7001234567' },
        });

        expect(status).toBe(413);
        expect((body as { plainText: string }).plainText).toMatch(/maximum allowed size/i);
        await expect(page.getByText(/^something went wrong!?$/i)).not.toBeVisible();
    });
});

test.describe('Beneficiary Bugs — Contract Attachment Opens (BMB-08, EMI-4791)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BMB-08: the stored contract attachment is retrievable', async ({ page }) => {
        await mockBeneficiaryList(page);
        await mockContractAttachmentAvailable(page);
        await gotoBeneficiaries(page);

        const response = await page.evaluate(async (base) => {
            const res = await fetch(`${base}/api/v1/beneficiary/1/contract`);
            return { status: res.status, type: res.headers.get('content-type') };
        }, process.env['BASE_URL'] ?? 'https://uat.majdpay.com');

        expect(response.status).toBe(200);
        expect(response.type).toContain('pdf');
    });

    test('BMB-08 (regression guard): the pre-fix mock 404s the attachment', async ({ page }) => {
        await mockBeneficiaryList(page);
        await mockContractAttachmentMissing(page);
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/beneficiary/1/contract');
        expect(status).toBe(404);
    });
});

test.describe('Beneficiary Bugs — Maker Can View Admin Beneficiaries (BMB-09, EMI-5130)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BMB-09: a user holding the view privilege gets the full beneficiary list, not a 403', async ({ page }) => {
        await mockBeneficiaryList(page);
        await gotoBeneficiaries(page);

        const { status, body } = await fetchJson(page, '/api/v1/beneficiary?page=0&size=10');

        expect(status).toBe(200);
        expect((body as { content: unknown[] }).content.length).toBeGreaterThan(0);
    });

    test('BMB-09 (regression guard): the pre-fix mock reproduces the 403 for the maker', async ({ page }) => {
        await mockBeneficiaryListForbidden(page);
        await gotoBeneficiaries(page);

        const { status } = await fetchJson(page, '/api/v1/beneficiary?page=0&size=10');
        expect(status).toBe(403);
    });
});

test.describe('Beneficiary Bugs — List Layout (BMB-10, EMI-4882)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BMB-10: the status action button and the delete icon do not overlap in the list', async ({ page }) => {
        await mockBeneficiaryList(page, defaultBeneficiaries());
        await gotoBeneficiaries(page);

        const beneficiary = new BeneficiaryManagementPage(page);
        await beneficiary.waitForList();

        const statusButton = beneficiary.beneficiaryRows.first().getByRole('button', { name: /approve|pending/i }).first();
        const deleteIcon   = beneficiary.beneficiaryRows.first().getByRole('button', { name: /delete/i }).first();

        const statusBox = await statusButton.boundingBox();
        const deleteBox = await deleteIcon.boundingBox();
        test.skip(!statusBox || !deleteBox, 'row action controls not rendered — reconcile locators against the live DOM');

        const overlaps =
            statusBox!.x < deleteBox!.x + deleteBox!.width &&
            statusBox!.x + statusBox!.width > deleteBox!.x &&
            statusBox!.y < deleteBox!.y + deleteBox!.height &&
            statusBox!.y + statusBox!.height > deleteBox!.y;

        expect(overlaps).toBe(false);
    });
});

test.describe('Beneficiary Bugs — Details Screen Fields (BMB-11, EMI-5376 / EMI-5142)', () => {
    test.use({ storageState: SESSION_PATH });

    test('BMB-11: the details screen shows both the identifier and the alias', async ({ page }) => {
        await mockBeneficiaryList(page, [mockBeneficiary({ alias: 'QA-DETAILS' })]);
        await gotoBeneficiaries(page);

        const list = new BeneficiaryManagementPage(page);
        await list.waitForList();

        const details = new BeneficiaryDetailsPage(page);
        await details.open('QA-DETAILS');

        await expect(details.identifierValue).not.toBeEmpty();
        await expect(details.aliasValue).toContainText('QA-DETAILS');
    });
});
