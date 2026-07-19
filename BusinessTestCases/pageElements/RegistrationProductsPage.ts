import { type Page, type Locator } from '@playwright/test';

/** Authored from EMI-5783's acceptance criteria (onboarding PoS request flow).
 *  Not yet verified against a live build — locators favor broad role/text
 *  matches so they degrade to "not found" rather than false-matching an
 *  unrelated element. Reconcile against the real DOM on first live run. */
export class RegistrationProductsPage {
    readonly page: Page;

    readonly formEyebrow: Locator;
    readonly formTitle: Locator;
    readonly activeStep: Locator;
    readonly continueButton: Locator;
    readonly cancelButton: Locator;
    readonly selectedCounter: Locator;

    // PoS card — inline expand
    readonly requestDevicesNowButton: Locator;
    readonly skipSetupLaterButton: Locator;
    readonly skippedMessage: Locator;
    readonly requestNowFromSkipButton: Locator;

    // Devices & Delivery
    readonly deviceCountInput: Locator;
    readonly deliveryModeToggle: Locator;
    readonly wathiqAddressOption: Locator;
    readonly customPinAddressOption: Locator;
    readonly addLocationGroupButton: Locator;
    readonly removeLocationGroupButton: Locator;
    readonly walletPicker: Locator;
    readonly devicesDeliveryNextButton: Locator;
    readonly devicesDeliveryBackButton: Locator;

    // Review
    readonly reviewTotalDevices: Locator;
    readonly reviewDeliveryBreakdown: Locator;
    readonly reviewConfirmationNote: Locator;
    readonly reviewBackButton: Locator;
    readonly reviewConfirmButton: Locator;

    // Order-ready inline state
    readonly orderReadySummary: Locator;
    readonly orderReadyEditButton: Locator;
    readonly orderReadyRemoveButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.formEyebrow = page.locator('#register-form-eyebrow');
        this.formTitle   = page.locator('#register-form-title');
        this.activeStep  = page.locator('.mp-step.is-active');

        this.continueButton  = page.getByRole('button', { name: /^continue$/i });
        this.cancelButton    = page.getByRole('button', { name: /cancel/i });
        this.selectedCounter = page.getByText(/^\d+\s+Selected$/i).first();

        this.requestDevicesNowButton  = page.getByTestId('register-pos-request-now-checkbox');
        this.skipSetupLaterButton     = page.getByTestId('register-products-continue-btn');
        this.skippedMessage           = page.getByText(/set up later|skipped/i).first();
        this.requestNowFromSkipButton = page.getByRole('button', { name: /actually,?\s*request now/i });

        this.deviceCountInput   = page.getByRole('spinbutton', { name: /number of devices|device count/i })
            .or(page.getByRole('textbox', { name: /number of devices|device count/i }));
        this.deliveryModeToggle = page.getByRole('radiogroup', { name: /delivery mode/i })
            .or(page.getByRole('group', { name: /delivery mode/i }));
        this.wathiqAddressOption     = page.getByText(/national\s*wathiq/i).first();
        this.customPinAddressOption  = page.getByText(/custom\s*pin/i).first();
        this.addLocationGroupButton    = page.getByRole('button', { name: /add.*(location|group)/i });
        this.removeLocationGroupButton = page.getByRole('button', { name: /remove.*(location|group)/i }).first();
        this.walletPicker = page.getByRole('combobox', { name: /wallet/i })
            .or(page.getByRole('listbox', { name: /wallet/i }));
        this.devicesDeliveryNextButton = page.getByRole('button', { name: /^next$/i });
        this.devicesDeliveryBackButton = page.getByRole('button', { name: /^back$/i });

        this.reviewTotalDevices      = page.getByText(/total devices?/i).first();
        this.reviewDeliveryBreakdown = page.getByText(/delivery (group|breakdown)/i).first();
        this.reviewConfirmationNote  = page.getByText(/order will be created|created once.*onboarding|created when.*complet/i).first();
        this.reviewBackButton    = page.getByRole('button', { name: /^back$/i });
        this.reviewConfirmButton = page.getByRole('button', { name: /confirm/i });

        this.orderReadySummary     = page.getByText(/devices?\s*ordered|order ready|\d+\s*device/i).first();
        this.orderReadyEditButton   = page.getByRole('button', { name: /^edit$/i });
        this.orderReadyRemoveButton = page.getByRole('button', { name: /^remove$/i });
    }

    productCard(name: string): Locator {
        return this.page.locator('button')
            .filter({ has: this.page.locator('.mp-product-card__desc', { hasText: name }) })
            .first();
    }
}
