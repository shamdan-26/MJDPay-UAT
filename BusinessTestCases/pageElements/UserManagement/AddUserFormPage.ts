import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Manage Accounts → Manage Users → Add New User form (Business web portal).
 *
 * EMI-4847 defines the current shape of this form: first/last name fields were
 * REMOVED and a National ID / Iqama field was added, and the Nafath screen
 * opens immediately after the user record is created. EMI-4844 defines the
 * lifecycle the created user enters (PENDING_VERIFICATION → UNDER_REVIEW →
 * ACTIVE). EMI-4997 is why the group/privilege selection is asserted here.
 *
 * Locators are best-effort — Manage Users is not in QA-DATA-TESTID-HANDOFF.md.
 */
export class AddUserFormPage {
    readonly page: Page;

    readonly nationalIdInput: Locator;
    readonly mobileInput: Locator;
    readonly emailInput: Locator;
    readonly groupDropdown: Locator;
    readonly roleDropdown: Locator;
    readonly submitButton: Locator;
    readonly cancelButton: Locator;

    /** EMI-4847: these must NOT exist on the form any more. */
    readonly firstNameInput: Locator;
    readonly lastNameInput: Locator;

    // Nafath step (EMI-4847)
    readonly nafathScreen: Locator;
    readonly nafathRandomNumber: Locator;

    // Validation / feedback
    readonly requiredFieldError: Locator;
    readonly invalidNationalIdError: Locator;
    readonly successToast: Locator;
    readonly errorToast: Locator;

    constructor(page: Page) {
        this.page = page;

        this.nationalIdInput = page.getByLabel(/national\s*id|iqama|identity/i).or(page.getByPlaceholder(/national\s*id|iqama/i)).first();
        this.mobileInput     = page.getByLabel(/mobile|phone/i).or(page.getByPlaceholder(/mobile|phone/i)).first();
        this.emailInput      = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)).first();
        this.groupDropdown   = page.getByLabel(/group/i).or(page.locator('mat-select[id*="group"]')).first();
        this.roleDropdown    = page.getByLabel(/role/i).or(page.locator('mat-select[id*="role"]')).first();
        this.submitButton    = page.getByRole('button', { name: /save|add|submit|create|confirm/i }).first();
        this.cancelButton    = page.getByRole('button', { name: /cancel|close/i }).first();

        this.firstNameInput = page.getByLabel(/first\s*name/i);
        this.lastNameInput  = page.getByLabel(/last\s*name/i);

        this.nafathScreen      = page.getByText(/nafath/i).first();
        this.nafathRandomNumber = page.locator('[class*="nafath"] [class*="number"], [data-testid="nafath-random-number"]').first();

        this.requiredFieldError      = page.getByText(/is required|field is required/i).first();
        this.invalidNationalIdError  = page.getByText(/(national\s*id|iqama|identity).*(invalid|not valid)/i).first();
        this.successToast = page.getByTestId('toast-message').or(page.getByText(/successfully/i)).first();
        this.errorToast   = page.getByText(/error|failed|went wrong/i).first();
    }

    async fillForm(input: { nationalId: string; mobile: string; email?: string; group?: string }): Promise<void> {
        await expect(this.nationalIdInput).toBeVisible({ timeout: 15000 });
        await this.nationalIdInput.fill(input.nationalId);
        await this.mobileInput.fill(input.mobile);
        if (input.email) await this.emailInput.fill(input.email);
        if (input.group) await this.selectGroup(input.group);
    }

    async selectGroup(group: string): Promise<void> {
        await this.groupDropdown.click();
        await this.page.getByRole('option', { name: new RegExp(group, 'i') }).first().click();
    }

    async submit(): Promise<void> {
        await this.submitButton.click();
    }

    /**
     * EMI-5092 / EMI-5112: the Save button used to spin forever or throw a
     * generic "Something went wrong". Either a success or a *specific*
     * validation message is acceptable — an endless spinner is not.
     */
    async assertSubmitSettles(timeout = 20000): Promise<void> {
        await expect(this.successToast.or(this.requiredFieldError).or(this.invalidNationalIdError))
            .toBeVisible({ timeout });
        await expect(this.page.getByText(/^something went wrong!?$/i)).not.toBeVisible();
    }
}
