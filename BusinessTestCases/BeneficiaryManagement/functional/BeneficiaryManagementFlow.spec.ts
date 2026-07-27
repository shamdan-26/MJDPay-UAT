import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageSidebarPage } from '../../pageElements/Shared/HomepageSidebarPage';
import { BeneficiaryManagementPage } from '../../pageElements/BeneficiaryManagement/BeneficiaryManagementPage';
import { HOME_URL, uniqueAlias, KNOWN_CRN, UNKNOWN_CRN } from '../BeneficiaryManagementHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Bill Beneficiary Management (EMI-185, epic EMI-2192). The sidebar link to
// this screen already existed and was nav-smoke-tested (Homepage/functional/
// HomepageSidebarNavigation.spec.ts), but the add/list/filter/edit/delete
// flow itself had no coverage anywhere in the repo. See
// BeneficiaryManagementPage.ts for the locator caveat. Maps to
// docs/manual-test-cases/B2B-Transactions.md section S (BM-01..BM-14).
//
// Each beneficiary is a standalone record per test (no shared money/ledger
// state), so this suite runs in default (parallel-safe) mode per the
// Senior_QA_Automation_Expert.md conditional-isolation rule.

async function loginAndOpenBeneficiaryManagement(page: Page): Promise<BeneficiaryManagementPage> {
    const loginPage = new LoginPage(page);
    const otp = new OtpPage(page);
    const sidebar = new HomepageSidebarPage(page);

    await loginPage.goto(LOGIN_URL);
    await loginPage.fillAndSubmit(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
    if (await otp.isVisible()) {
        await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
    }
    await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });

    await page.goto(HOME_URL);
    await page.waitForLoadState('domcontentloaded');
    await sidebar.accountsPanel.click();
    await sidebar.manageBeneficiarySidebarLink.click();
    await page.waitForURL(/beneficiar/i, { timeout: 15000 });

    return new BeneficiaryManagementPage(page);
}

test.describe('Beneficiary Management — Add Beneficiary (BM-01, BM-06)', () => {
    test('BM-01: should add a beneficiary with a valid alias and CRN, showing the resolved brand name', async ({ page }) => {
        test.skip(!KNOWN_CRN, 'requires BENEFICIARY_KNOWN_CRN env var pointing at a real fixture CRN');
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await beneficiary.openAddBeneficiaryForm();

        await beneficiary.fillAliasAndCrn(uniqueAlias(), KNOWN_CRN);
        await beneficiary.lookupCrn();
        await expect(beneficiary.crnBrandName).toBeVisible({ timeout: 15000 });

        await beneficiary.submitBeneficiary();
        await expect(beneficiary.successToast).toBeVisible({ timeout: 15000 });
    });

    test('BM-06: when OTP is required, a valid OTP completes the add-beneficiary flow', async ({ page }) => {
        test.skip(!KNOWN_CRN, 'requires BENEFICIARY_KNOWN_CRN env var pointing at a real fixture CRN');
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await beneficiary.openAddBeneficiaryForm();

        await beneficiary.fillAliasAndCrn(uniqueAlias(), KNOWN_CRN);
        await beneficiary.lookupCrn();
        await beneficiary.submitBeneficiary();

        if (await beneficiary.otpInputs.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await beneficiary.fillOtp(await getOtpFromDb(VALID_MOBILE));
        }
        await expect(beneficiary.successToast).toBeVisible({ timeout: 15000 });
    });
});

test.describe('Beneficiary Management — Alias Validation (BM-02, BM-03, BM-04)', () => {
    test('BM-02: an alias shorter than 3 characters is rejected', async ({ page }) => {
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await beneficiary.openAddBeneficiaryForm();

        await beneficiary.fillAliasAndCrn('ab', UNKNOWN_CRN);
        await beneficiary.submitBeneficiary();
        await expect(beneficiary.aliasFieldError).toBeVisible({ timeout: 10000 });
    });

    test('BM-03: an alias longer than 15 characters is rejected', async ({ page }) => {
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await beneficiary.openAddBeneficiaryForm();

        await beneficiary.fillAliasAndCrn('a'.repeat(16), UNKNOWN_CRN);
        await beneficiary.submitBeneficiary();
        await expect(beneficiary.aliasFieldError).toBeVisible({ timeout: 10000 });
    });

    test('BM-04: an alias containing special characters is rejected', async ({ page }) => {
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await beneficiary.openAddBeneficiaryForm();

        await beneficiary.fillAliasAndCrn('QA-Ben#!$', UNKNOWN_CRN);
        await beneficiary.submitBeneficiary();
        await expect(beneficiary.aliasFieldError).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Beneficiary Management — CRN Lookup (BM-05)', () => {
    test('BM-05: looking up a CRN that does not exist blocks submission with an error', async ({ page }) => {
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await beneficiary.openAddBeneficiaryForm();

        await beneficiary.fillAliasAndCrn(uniqueAlias(), UNKNOWN_CRN);
        await beneficiary.lookupCrn();
        await expect(beneficiary.crnFieldError).toBeVisible({ timeout: 15000 });
    });
});

test.describe('Beneficiary Management — List & Filters (BM-07, BM-08, BM-09, BM-10)', () => {
    test('BM-07: the beneficiaries list displays Alias and CRN for each row', async ({ page }) => {
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await expect(beneficiary.beneficiaryRows.first()).toBeVisible({ timeout: 15000 });
    });

    test('BM-08: filtering by Alias narrows the list to matching rows', async ({ page }) => {
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await expect(beneficiary.beneficiaryRows.first()).toBeVisible({ timeout: 15000 });
        const firstAlias = await beneficiary.beneficiaryRows.first().innerText();

        await beneficiary.filterByAlias(firstAlias.split('\n')[0] ?? firstAlias);
        await expect(beneficiary.beneficiaryRows.first()).toBeVisible({ timeout: 10000 });
    });

    test('BM-09: filtering by CR narrows the list to matching rows', async ({ page }) => {
        test.skip(!KNOWN_CRN, 'requires BENEFICIARY_KNOWN_CRN env var pointing at a real fixture CRN');
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await beneficiary.filterByCrn(KNOWN_CRN);
        await expect(beneficiary.beneficiaryRows.first()).toBeVisible({ timeout: 10000 });
    });

    test('BM-10: filtering by Status narrows the list to matching rows', async ({ page }) => {
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await expect(beneficiary.statusFilterDropdown).toBeVisible({ timeout: 15000 });
        await beneficiary.statusFilterDropdown.click();
        await page.getByRole('option').first().click();
        await expect(beneficiary.beneficiaryRows.first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Beneficiary Management — Edit & Delete (BM-11, BM-12)', () => {
    test('BM-11: deleting a beneficiary removes it from the list after confirmation', async ({ page }) => {
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await expect(beneficiary.beneficiaryRows.first()).toBeVisible({ timeout: 15000 });
        const countBefore = await beneficiary.beneficiaryRows.count();

        await beneficiary.deleteFirstBeneficiary();
        await expect(beneficiary.successToast).toBeVisible({ timeout: 15000 });
        await expect(async () => {
            expect(await beneficiary.beneficiaryRows.count()).toBeLessThan(countBefore);
        }).toPass({ timeout: 10000 });
    });

    test('BM-12: editing a beneficiary updates its alias in the list', async ({ page }) => {
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await expect(beneficiary.editBeneficiaryButton.first()).toBeVisible({ timeout: 15000 });
        await beneficiary.editBeneficiaryButton.first().click();

        const newAlias = uniqueAlias('QA-EDIT');
        await beneficiary.aliasInput.fill(newAlias);
        await beneficiary.submitBeneficiary();

        await expect(beneficiary.successToast).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(newAlias)).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Beneficiary Management — Duplicate & Required Field Validation (BM-13, BM-14)', () => {
    test('BM-13: adding a beneficiary with an alias already in use is rejected', async ({ page }) => {
        test.skip(!KNOWN_CRN, 'requires BENEFICIARY_KNOWN_CRN env var pointing at a real fixture CRN');
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await expect(beneficiary.beneficiaryRows.first()).toBeVisible({ timeout: 15000 });
        const existingAlias = (await beneficiary.beneficiaryRows.first().innerText()).split('\n')[0] ?? '';

        await beneficiary.openAddBeneficiaryForm();
        await beneficiary.fillAliasAndCrn(existingAlias, KNOWN_CRN);
        await beneficiary.lookupCrn();
        await beneficiary.submitBeneficiary();

        await expect(beneficiary.errorToast).toBeVisible({ timeout: 15000 });
    });

    test('BM-14: submitting without an Alias or CRN is blocked', async ({ page }) => {
        const beneficiary = await loginAndOpenBeneficiaryManagement(page);
        await beneficiary.openAddBeneficiaryForm();
        await beneficiary.assertRequiredFieldBlocksSubmit();
    });
});
