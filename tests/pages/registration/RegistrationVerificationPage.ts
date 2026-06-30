import { type Page, type Locator } from '@playwright/test';

export class RegistrationVerificationPage {
    readonly page: Page;

    // IBAN
    readonly ibanInput: Locator;
    readonly ibanHint: Locator;

    // IBAN proof upload
    readonly ibanProofLabel: Locator;
    readonly ibanUploadPrompt: Locator;

    // VAT
    readonly vatInput: Locator;

    // CR (Commercial Registration)
    readonly crUploadLabel: Locator;

    // Navigation
    readonly nextButton: Locator;
    readonly backButton: Locator;
    readonly loadingButton: Locator;

    // Step indicators
    readonly stepIndicator: Locator;

    constructor(page: Page) {
        this.page = page;

        this.ibanInput      = page.getByRole('textbox', { name: /iban/i });
        this.ibanHint       = page.getByText(/24 characters starting with SA/i);
        this.ibanProofLabel = page.getByText(/iban proof/i);
        this.ibanUploadPrompt = page.getByText(/click to upload/i).first();

        this.vatInput = page.getByRole('textbox', { name: /vat number/i });

        this.crUploadLabel = page.getByText(/commercial registration/i).first();

        this.nextButton    = page.getByRole('button', { name: /next/i });
        this.backButton    = page.getByRole('button', { name: /back/i });
        this.loadingButton = page.getByRole('button', { name: 'Loading' });

        this.stepIndicator = page.getByText(/verification/i).first();
    }

    async waitForLoad(): Promise<void> {
        await this.ibanInput.waitFor({ state: 'visible', timeout: 15000 });
    }
}
