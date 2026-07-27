import { type Page, type Locator, expect } from '@playwright/test';
import type { SubWalletInput } from '../../SubWallets/SubWalletsHelper';

/**
 * Sub-wallet create / edit form (EMI-5185). Field set comes from the ticket:
 * Name, Wallet Type, Currency, Notes, Is Sharable, Card Issuance Enabled.
 * Currency is read-only in edit mode. Same untagged-locator caveat as
 * SubWalletsPage.ts.
 */
export class SubWalletFormPage {
    readonly page: Page;

    readonly nameInput: Locator;
    readonly walletTypeSelect: Locator;
    readonly currencySelect: Locator;
    readonly notesInput: Locator;
    readonly shareableToggle: Locator;
    readonly cardIssuanceToggle: Locator;
    readonly submitButton: Locator;

    readonly successSheet: Locator;
    readonly configureButton: Locator;
    readonly validationError: Locator;
    readonly duplicateNameError: Locator;

    constructor(page: Page) {
        this.page = page;

        this.nameInput          = page.getByLabel(/name/i).first();
        this.walletTypeSelect   = page.getByLabel(/wallet type/i).first();
        this.currencySelect     = page.getByLabel(/currency/i).first();
        this.notesInput         = page.getByLabel(/notes?/i).first();
        this.shareableToggle    = page.getByRole('switch', { name: /shar(e)?able/i }).first();
        this.cardIssuanceToggle = page.getByRole('switch', { name: /card issuance/i }).first();
        this.submitButton       = page.getByRole('button', { name: /save|create|submit|confirm/i }).first();

        this.successSheet       = page.locator('mat-bottom-sheet-container, [class*="bottom-sheet"]').first();
        this.configureButton    = page.getByRole('button', { name: /configure/i }).first();
        this.validationError    = page.locator('mat-error, [class*="error-message"]').first();
        this.duplicateNameError = page.getByText(/already exists|duplicate/i).first();
    }

    async selectOption(field: Locator, optionName: string): Promise<void> {
        await field.click();
        await this.page.getByRole('option', { name: optionName }).first().click();
    }

    async fillForm(input: SubWalletInput): Promise<void> {
        await this.nameInput.fill(input.name);

        if (input.walletType) await this.selectOption(this.walletTypeSelect, input.walletType);
        if (input.currency)   await this.selectOption(this.currencySelect, input.currency);
        if (input.notes)      await this.notesInput.fill(input.notes);

        if (input.isShareable) await this.shareableToggle.click();
        if (input.isCardIssuanceEnabled) await this.cardIssuanceToggle.click();
    }

    async submit(): Promise<void> {
        await this.submitButton.click();
    }

    async submitAndExpectSuccess(): Promise<void> {
        await this.submit();
        await expect(this.successSheet.or(this.configureButton)).toBeVisible({ timeout: 20000 });
    }
}
