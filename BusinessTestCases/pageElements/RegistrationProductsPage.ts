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

        this.deviceCountInput   = page.getByRole('spinbutton', { name: /number of devices|device count|total devices|إجمالي الأجهزة/i })
            .or(page.getByRole('textbox', { name: /number of devices|device count|total devices|إجمالي الأجهزة/i }));
        this.decreaseDeviceCountButton = page.getByRole('button', { name: /decrease|إنقاص/i });
        this.increaseDeviceCountButton = page.getByRole('button', { name: /increase|زيادة/i });
        this.deliveryModeToggle = page.getByRole('radiogroup', { name: /delivery mode|التوصيل/i })
            .or(page.getByRole('group', { name: /delivery mode|التوصيل/i }));
        this.singleLocationDeliveryOption = page.getByText(/single location|موقع واحد/i).first();
        this.splitByDeviceDeliveryOption  = page.getByText(/split by device|تقسيم حسب الأجهزة/i).first();
        this.deliveryGroupOneLabel = page.getByText(/group 1|المجموعة 1/i).first();
        this.wathiqAddressOption     = page.getByText(/national.*wathi?q|العنوان الوطني.*واثق/i).first();
        this.customPinAddressOption  = page.getByText(/custom.*map location|موقع مخصص على الخريطة/i).first();
        this.updateWathiqAddressButton = page.getByRole('button', { name: /update wathi?q address|تحديث عنوان واثق/i });
        this.contactNameInput  = page.getByRole('textbox', { name: /contact name|اسم جهة الاتصال/i })
            .or(page.getByPlaceholder(/recipient.*full name|الاسم الكامل للمستلم/i));
        this.contactMobileInput = page.getByRole('textbox', { name: /contact.*mobile|رقم جوال جهة الاتصال/i })
            .or(page.getByPlaceholder(/0512345678/i));
        this.addLocationGroupButton    = page.getByRole('button', { name: /add.*(location|group)/i });
        this.removeLocationGroupButton = page.getByRole('button', { name: /remove.*(location|group)/i }).first();
        this.walletPicker = page.getByRole('combobox', { name: /wallet/i })
            .or(page.getByRole('listbox', { name: /wallet/i }));
        // The Devices & Delivery sub-panel's own footer button shares the exact
        // same "Continue"/"متابعة" text as the outer Products-step continueButton
        // — when both are mounted at once this locator's underlying query
        // resolves to 2 elements. .last() prefers the panel-local button, which
        // Angular typically renders after the outer step chrome in DOM order;
        // reconcile with a proper container-scoped selector once the real DOM
        // structure for this panel is confirmed.
        this.devicesDeliveryNextButton = page.getByRole('button', { name: /^next$|^continue$|متابعة/i }).last();
        this.devicesDeliveryBackButton = page.getByRole('button', { name: /^back$|رجوع/i }).last();

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
