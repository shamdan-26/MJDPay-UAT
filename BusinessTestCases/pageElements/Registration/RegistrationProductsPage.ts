import { type Page, type Locator } from '@playwright/test';

/** Header/footer/product-card locators confirmed live against UAT
 *  (dev.majdpay.com/business/auth/register). The Devices & Delivery locators
 *  (device counter, delivery-type toggle, address radios, contact fields)
 *  match a live DOM extraction of that sub-step. Review/order-ready-state
 *  locators were authored from EMI-5783's acceptance criteria and are not
 *  yet verified against a live build — they favor broad role/text matches
 *  so they degrade to "not found" rather than false-matching an unrelated
 *  element. */
export class RegistrationProductsPage {
    readonly page: Page;

    // Header / Banner
    readonly logoImage: Locator;
    readonly logoLink: Locator;
    readonly enButton: Locator;
    readonly arabicButton: Locator;
    readonly themeToggle: Locator;

    readonly formEyebrow: Locator;
    readonly formTitle: Locator;
    readonly formSubTitle: Locator;
    readonly outerStepBar: Locator;
    readonly activeStep: Locator;
    readonly continueButton: Locator;
    readonly cancelButton: Locator;
    readonly selectedCounter: Locator;

    // Product cards
    readonly productCards: Locator;

    // PoS card — inline expand
    readonly requestDevicesNowButton: Locator;
    readonly skipSetupLaterButton: Locator;
    readonly skippedMessage: Locator;
    readonly requestNowFromSkipButton: Locator;

    // Devices & Delivery
    readonly deviceCountInput: Locator;
    readonly decreaseDeviceCountButton: Locator;
    readonly increaseDeviceCountButton: Locator;
    readonly deliveryModeToggle: Locator;
    readonly singleLocationDeliveryOption: Locator;
    readonly splitByDeviceDeliveryOption: Locator;
    readonly deliveryGroupOneLabel: Locator;
    readonly wathiqAddressOption: Locator;
    readonly customPinAddressOption: Locator;
    readonly updateWathiqAddressButton: Locator;
    readonly contactNameInput: Locator;
    readonly contactMobileInput: Locator;
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

        // Same post-mobile-step header as RegistrationInfoPage/RegistrationNafathPage
        // — match their locator strategy.
        this.logoImage = page.locator('#auth_header_logo[aria-label="MJD Pay"]');
        this.logoLink  = page.getByRole('link', { name: 'MJD Pay' });
        this.enButton     = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'EN' });
        this.arabicButton = page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'العربية' });
        this.themeToggle  = page.locator('button.mode-btn.header-icon-btn');

        this.formEyebrow  = page.locator('.form-eyebrow');
        this.formTitle    = page.locator('.form-title');
        this.formSubTitle = page.locator('.form-sub-title');
        this.outerStepBar = page.locator('.mp-step');
        this.activeStep   = page.locator('.mp-step.is-active');

        this.continueButton  = page.getByRole('button', { name: /^(continue|متابعة)$/i });
        this.cancelButton    = page.getByRole('button', { name: /^(cancel|إلغاء)$/i });
        this.selectedCounter = page.locator('.mp-product-footer__count');

        this.productCards = page.locator('.mp-product-card');

        this.requestDevicesNowButton  = page.getByTestId('register-pos-request-now-checkbox');
        // Confirmed live: this is the Products-step's own Continue button (its
        // testid literally reads "continue-btn"), not a distinct "Skip - set up
        // later" control — clicking it without first checking
        // requestDevicesNowButton advances straight to Contract, with no inline
        // "skipped" message. Reach Devices & Delivery by checking
        // requestDevicesNowButton *before* clicking this button.
        this.skipSetupLaterButton     = page.getByTestId('register-products-continue-btn');
        this.skippedMessage           = page.getByText(/set up later|skipped/i).first();
        this.requestNowFromSkipButton = page.getByRole('button', { name: /actually,?\s*request now/i });

        // Devices & Delivery panel locators below are confirmed live via
        // data-testid, discovered through a live DOM probe — QA-DATA-TESTID-HANDOFF.md
        // section 5 lists "My Products / POS" as not-yet-tagged, but these ids
        // exist in the live app regardless; the handoff doc is stale for this
        // flow. Prefer these over text/role locators per the handoff's guidance.
        this.deviceCountInput   = page.getByTestId('pos-delivery-editor-total-devices-input');
        this.decreaseDeviceCountButton = page.getByTestId('pos-delivery-editor-decrement-total-btn');
        this.increaseDeviceCountButton = page.getByTestId('pos-delivery-editor-increment-total-btn');
        // Correction: confirmed live there is no radiogroup/group role wrapping
        // the two delivery-mode radios with this accessible name — "التوصيل" /
        // "Delivery" renders as a plain text label above two independent radio
        // inputs (singleLocationDeliveryOption / splitByDeviceDeliveryOption
        // below already cover those individually), not an ARIA group.
        this.deliveryModeToggle = page.getByText(/^delivery$|^التوصيل$/i).first();
        this.singleLocationDeliveryOption = page.getByTestId('pos-delivery-editor-mode-single-radio');
        this.splitByDeviceDeliveryOption  = page.getByTestId('pos-delivery-editor-mode-split-radio');
        this.deliveryGroupOneLabel = page.getByText(/group 1|المجموعة 1/i).first();
        // Trailing "-0" indexes the first delivery group — the only one present
        // in single-location mode, which is what this suite otherwise assumes.
        this.wathiqAddressOption     = page.getByTestId('pos-delivery-editor-source-wathiq-radio-0');
        this.customPinAddressOption  = page.getByTestId('pos-delivery-editor-source-pin-radio-0');
        this.updateWathiqAddressButton = page.getByTestId('pos-delivery-editor-wathiq-refresh-btn-0');
        this.contactNameInput  = page.getByTestId('pos-delivery-editor-contact-name-input-0');
        // Correction: data-testid="pos-delivery-editor-contact-number-input-0" sits
        // directly on the real <input> (class="mat-mdc-input-element ..."), not a
        // wrapper — confirmed live via DOM inspection (aria-label="مثال: 0512345678").
        // getByTestId() alone resolves it; the earlier .getByRole('textbox') chain
        // was working around an incorrect assumption that the testid was on a
        // separate wrapper element.
        this.contactMobileInput = page.getByTestId('pos-delivery-editor-contact-number-input-0');
        // Confirmed live: the button's accessible name is Arabic-only by default
        // ("إضافة مجموعة موقع" — "Add location group") — the English-only pattern
        // never matched it, since this app defaults to Arabic like every other
        // step. removeLocationGroupButton's Arabic text isn't independently
        // confirmed live yet, but every other Arabic word for "remove" in this
        // codebase's UI is إزالة or حذف, so both are included defensively.
        this.addLocationGroupButton    = page.getByRole('button', { name: /add.*(location|group)|إضافة.*(مجموعة|موقع)/i });
        this.removeLocationGroupButton = page.getByRole('button', { name: /remove.*(location|group)|(إزالة|حذف).*(مجموعة|موقع)/i }).first();
        this.walletPicker = page.getByRole('combobox', { name: /wallet/i })
            .or(page.getByRole('listbox', { name: /wallet/i }));
        // register-pos-delivery-submit-btn/back-btn are the panel's own footer
        // buttons — distinct from the outer Products-step's continue button
        // (register-products-continue-btn), which shares the same visible
        // "متابعة" text and previously made the old role/text-based locator
        // ambiguous (resolved with .last(), never confirmed correct until now).
        this.devicesDeliveryNextButton = page.getByTestId('register-pos-delivery-submit-btn');
        this.devicesDeliveryBackButton = page.getByTestId('register-pos-delivery-back-btn');

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
            .filter({
                has: this.page.locator('.mp-product-card__desc, .mp-product-card__title, .mp-product-card__name', { hasText: name }),
            })
            .first();
    }

    /** The Wallet card — required, always present, and (per acceptance criteria)
     *  not deselectable. Used as the one card every asset's Products page is
     *  guaranteed to render, for UI-presence checks that don't depend on which
     *  optional products (PoS, Bill Payment, Payouts) happen to be offered. */
    walletCard(): Locator {
        // Anchored to the whole desc/title/name text (not a bare substring) so a
        // different card whose copy merely mentions "wallet" in passing (e.g. a
        // Payouts card's description) can't be picked up by productCard()'s
        // broader multi-field filter.
        return this.page.locator('button')
            .filter({
                has: this.page.locator(
                    '.mp-product-card__desc, .mp-product-card__title, .mp-product-card__name',
                    { hasText: /^\s*(محفظة|wallet)\s*$/i }
                ),
            })
            .first();
    }

    /** The "عرض المزيد" / "Show more" link inside a given product card. */
    showMoreLink(card: Locator): Locator {
        return card.getByRole('link', { name: /show more|عرض المزيد/i })
            .or(card.getByText(/show more|عرض المزيد/i));
    }

    /** The selected/checked indicator badge inside a given product card. */
    selectedBadge(card: Locator): Locator {
        return card.locator('.mp-product-card__check, .mp-product-card__badge, [class*="check"]').first();
    }
}
