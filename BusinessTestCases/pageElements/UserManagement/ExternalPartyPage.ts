import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Admin Portal → Externals → Service Provider (External Parties).
 * Reached at `/admin/main/external-part` — the exact path quoted in EMI-6067.
 *
 * Ticket: EMI-6067 ("Role" dropdown is empty in the Add External Party modal,
 * blocking party creation). The modal's own fields — Name, Email, Mobile
 * Number, Status, Role — are named verbatim in that ticket's repro steps, so
 * the field set here is confirmed even though the testids are not.
 *
 * Locators are best-effort: the Admin Portal is not in
 * QA-DATA-TESTID-HANDOFF.md at all. Reconcile against the live DOM before
 * using this for CI gating — same caveat as ManageUsersPage.ts.
 */
export class ExternalPartyPage {
    readonly page: Page;

    readonly partiesTable: Locator;
    readonly partyRows: Locator;
    readonly emptyState: Locator;

    readonly addPartyButton: Locator;
    readonly modal: Locator;

    readonly nameInput: Locator;
    readonly emailInput: Locator;
    readonly mobileInput: Locator;
    readonly statusDropdown: Locator;
    readonly roleDropdown: Locator;
    readonly submitButton: Locator;

    readonly requiredFieldError: Locator;
    readonly successToast: Locator;
    readonly errorToast: Locator;

    constructor(page: Page) {
        this.page = page;

        this.partiesTable = page.getByRole('table').or(page.locator('[class*="external-part"] table, mat-table')).first();
        this.partyRows    = this.partiesTable.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
        this.emptyState   = page.getByText(/no (external )?part(y|ies)|no data|no records/i).first();

        this.addPartyButton = page.getByRole('button', { name: /add\s*external\s*party/i }).first();
        this.modal          = page.getByRole('dialog').first();

        this.nameInput      = page.getByLabel(/^name$/i).first();
        this.emailInput     = page.getByLabel(/e-?mail/i).first();
        this.mobileInput    = page.getByLabel(/mobile|phone/i).first();
        this.statusDropdown = page.getByLabel(/status/i).or(page.locator('mat-select[id*="status"]')).first();
        this.roleDropdown   = page.getByLabel(/^role$/i).or(page.locator('mat-select[id*="role"]')).first();
        this.submitButton   = page.getByRole('button', { name: /add\s*external\s*party|submit|save/i }).last();

        // The exact validation string quoted in EMI-6067.
        this.requiredFieldError = page.getByText(/this field is required/i).first();
        this.successToast = page.getByTestId('toast-message').or(page.getByText(/successfully/i)).first();
        this.errorToast   = page.getByText(/error|failed|went wrong/i).first();
    }

    async openAddPartyModal(): Promise<void> {
        await expect(this.addPartyButton).toBeVisible({ timeout: 15000 });
        await this.addPartyButton.click();
        await expect(this.modal).toBeVisible({ timeout: 15000 });
    }

    async openRoleDropdown(): Promise<void> {
        await expect(this.roleDropdown).toBeVisible({ timeout: 15000 });
        await this.roleDropdown.click();
    }

    /** Options currently rendered by the open Role dropdown — empty is the EMI-6067 defect. */
    roleOptions(): Locator {
        return this.page.getByRole('option');
    }

    async fillRequiredFields(input: { name: string; email: string; mobile: string }): Promise<void> {
        await this.nameInput.fill(input.name);
        await this.emailInput.fill(input.email);
        await this.mobileInput.fill(input.mobile);
    }
}
