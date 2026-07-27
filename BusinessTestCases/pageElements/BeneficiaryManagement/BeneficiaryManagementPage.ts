import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Bill Beneficiary Management (EMI-185, epic EMI-2192). Reached via the
 * homepage sidebar "Manage Beneficiary" link (HomepageSidebarPage.
 * manageBeneficiarySidebarLink) — the sidebar link itself already exists and
 * is nav-smoke-tested in HomepageSidebarNavigation.spec.ts, but the actual
 * add/list/filter/edit/delete flow on the destination page had no page
 * object or coverage anywhere in the repo before this file. Not in
 * QA-DATA-TESTID-HANDOFF.md §4 (Beneficiary management is explicitly listed
 * under the "not yet covered" §5 list) — every locator below is a
 * best-effort guess built directly from EMI-185's field-by-field AC wording,
 * same caveat as CreateBillPage.ts / PaymentLinkPage.ts. Reconcile against
 * the live DOM (or request testids from FE) before relying on this for CI
 * gating.
 */
export class BeneficiaryManagementPage {
    readonly page: Page;

    // Entry point
    readonly addBeneficiaryButton: Locator;

    // Add Beneficiary form
    readonly aliasInput: Locator;
    readonly crnInput: Locator;
    readonly lookupCrnButton: Locator;
    readonly crnBrandName: Locator;
    readonly aliasFieldError: Locator;
    readonly crnFieldError: Locator;
    readonly saveBeneficiaryButton: Locator;

    // "Add By" selector — EMI-4432 added the dropdown that switches between an
    // individual's phone number and a company unified number, and made the
    // contract attachment optional.
    readonly addByDropdown: Locator;
    readonly mobileNumberInput: Locator;
    readonly unifiedNumberInput: Locator;
    readonly contractUploadInput: Locator;
    readonly fileTooLargeError: Locator;

    // OTP step (reuses the shared six-box OTP pattern; no dedicated OtpPage
    // instance here since this form's OTP container may render inline)
    readonly otpInputs: Locator;
    readonly otpSubmitButton: Locator;
    readonly resendOtpButton: Locator;

    // Beneficiaries list
    readonly beneficiaryRows: Locator;
    readonly aliasFilterInput: Locator;
    readonly crnFilterInput: Locator;
    readonly statusFilterDropdown: Locator;
    readonly clearFilterButton: Locator;
    readonly identifierCells: Locator;
    readonly deleteBeneficiaryButton: Locator;
    readonly editBeneficiaryButton: Locator;
    readonly deleteConfirmDialog: Locator;
    readonly deleteConfirmButton: Locator;

    // Result / validation
    readonly successToast: Locator;
    readonly errorToast: Locator;
    readonly requiredFieldError: Locator;
    readonly alreadyExistsError: Locator;
    readonly unauthorizedMessage: Locator;

    constructor(page: Page) {
        this.page = page;

        this.addBeneficiaryButton = page.getByRole('button', { name: /add beneficiary/i });

        this.aliasInput   = page.getByLabel(/alias/i).or(page.getByPlaceholder(/alias/i));
        this.crnInput     = page.getByLabel(/^crn$/i).or(page.getByPlaceholder(/crn/i));
        this.lookupCrnButton = page.getByRole('button', { name: /lookup|search|check|verify/i });
        this.crnBrandName = page.getByText(/brand name/i).locator('xpath=following-sibling::*[1]').or(page.getByTestId('beneficiary-brand-name'));
        this.aliasFieldError = page.getByText(/alias.*(3|15|characters|invalid)/i).first();
        this.crnFieldError   = page.getByText(/crn.*(not found|invalid|does not exist)/i).first();
        this.saveBeneficiaryButton = page.getByRole('button', { name: /save|add|submit/i });

        this.addByDropdown       = page.getByLabel(/add\s*by/i).or(page.locator('mat-select[id*="addBy"]')).first();
        this.mobileNumberInput   = page.getByLabel(/mobile|phone/i).or(page.getByPlaceholder(/mobile|phone/i)).first();
        this.unifiedNumberInput  = page.getByLabel(/unified\s*number/i).or(page.getByPlaceholder(/unified/i)).first();
        this.contractUploadInput = page.locator('input[type="file"]').first();
        this.fileTooLargeError   = page.getByText(/exceeds the maximum allowed size|too large|50\s*MB/i).first();

        this.otpInputs      = page.getByRole('textbox', { name: /one time password/i });
        this.otpSubmitButton = page.getByRole('button', { name: /verify|confirm/i });
        this.resendOtpButton = page.getByRole('button', { name: /resend/i }).first();

        this.beneficiaryRows = page.locator('[class*="beneficiary-row"], tr').filter({ has: page.getByText(/.+/) });
        this.aliasFilterInput = page.getByPlaceholder(/alias/i).and(page.getByPlaceholder(/filter|search/i)).or(page.getByLabel(/filter.*alias/i));
        this.crnFilterInput   = page.getByPlaceholder(/cr\b/i).or(page.getByLabel(/filter.*cr/i));
        this.statusFilterDropdown = page.getByLabel(/status/i).or(page.locator('mat-select[id*="status"]'));
        this.clearFilterButton    = page.getByRole('button', { name: /clear\s*(filter|all)?/i }).first();
        this.identifierCells      = page.locator('[class*="identifier"], td[data-column="beneficiaryIdentifier"]');
        this.deleteBeneficiaryButton = page.getByRole('button', { name: /delete/i });
        this.editBeneficiaryButton   = page.getByRole('button', { name: /edit/i });
        this.deleteConfirmDialog = page.getByText(/are you sure.*delete/i);
        this.deleteConfirmButton = page.getByRole('button', { name: /yes|confirm|delete/i }).last();

        this.successToast = page.getByTestId('toast-message').or(page.getByText(/beneficiary (added|updated|deleted) successfully/i));
        this.errorToast    = page.getByText(/failed|error|already exists/i).first();
        this.requiredFieldError = page.getByText(/is required|field is required/i).first();
        this.alreadyExistsError = page.getByText(/already (been )?added|already exists/i).first();
        this.unauthorizedMessage = page.getByText(/not authorized|check your permissions/i).first();
    }

    async waitForList(): Promise<void> {
        await expect(this.beneficiaryRows.first().or(this.page.getByText(/no beneficiar|no data/i).first()))
            .toBeVisible({ timeout: 20000 });
    }

    /** EMI-4432: switch the form between "Individual" (phone) and "Company Unified Number". */
    async selectAddBy(option: 'individual' | 'company'): Promise<void> {
        await expect(this.addByDropdown).toBeVisible({ timeout: 15000 });
        await this.addByDropdown.click();
        const label = option === 'individual' ? /individual|phone|mobile/i : /company|unified/i;
        await this.page.getByRole('option', { name: label }).first().click();
    }

    async filterByStatus(status: string): Promise<void> {
        await expect(this.statusFilterDropdown).toBeVisible({ timeout: 15000 });
        await this.statusFilterDropdown.click();
        await this.page.getByRole('option', { name: new RegExp(status, 'i') }).first().click();
    }

    async openAddBeneficiaryForm(): Promise<void> {
        await expect(this.addBeneficiaryButton).toBeVisible({ timeout: 15000 });
        await this.addBeneficiaryButton.click();
    }

    async fillAliasAndCrn(alias: string, crn: string): Promise<void> {
        await expect(this.aliasInput).toBeVisible({ timeout: 15000 });
        await this.aliasInput.fill(alias);
        await this.crnInput.fill(crn);
    }

    async lookupCrn(): Promise<void> {
        await this.lookupCrnButton.click();
    }

    async submitBeneficiary(): Promise<void> {
        await this.saveBeneficiaryButton.click();
    }

    async fillOtp(otp: string): Promise<void> {
        const count = await this.otpInputs.count();
        for (let i = 0; i < count; i++) {
            await this.otpInputs.nth(i).pressSequentially(otp[i] ?? '0', { delay: 50 });
        }
        if (await this.otpSubmitButton.isVisible().catch(() => false)) {
            await this.otpSubmitButton.click();
        }
    }

    async filterByAlias(alias: string): Promise<void> {
        await this.aliasFilterInput.fill(alias);
    }

    async filterByCrn(crn: string): Promise<void> {
        await this.crnFilterInput.fill(crn);
    }

    async deleteFirstBeneficiary(): Promise<void> {
        await this.deleteBeneficiaryButton.first().click();
        await expect(this.deleteConfirmDialog).toBeVisible({ timeout: 10000 });
        await this.deleteConfirmButton.click();
    }

    async assertRequiredFieldBlocksSubmit(): Promise<void> {
        await expect(this.saveBeneficiaryButton).toBeDisabled({ timeout: 5000 })
            .catch(async () => {
                await this.saveBeneficiaryButton.click();
                await expect(this.requiredFieldError).toBeVisible({ timeout: 10000 });
            });
    }
}
