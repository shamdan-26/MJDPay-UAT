import { type Page, type Locator } from '@playwright/test';

/**
 * Header/step-bar CSS-class locators match the same markup as
 * RegistrationProductsPage/RegistrationVerificationPage (confirmed live on
 * those steps). Language toggle uses the `lang-en`/`lang-ar` data-testid from
 * QA-DATA-TESTID-HANDOFF.md §4.2 (confirmed live on RegistrationMobilePage),
 * kept alongside the role-based locator as a fallback since it's unconfirmed
 * on this specific post-mobile-step header variant.
 *
 * Contract-document locators below have to straddle two live template builds
 * seen across environments, so each one is a `.or()` of both shapes rather
 * than a single confirmed selector:
 *  - UAT, `v4.0.0` "اتفاقية تقديم خدمات رقمية": a plain table/`<p>` document
 *    — `<td class="header-title">`, a `.meta-table` for version/date,
 *    an `.info-table` for customer info, and 4 fixed `<div class="section-title">`
 *    sections (أولاً–رابعاً).
 *  - dev, `v12.0.0` "اتفاقية خدمات المحفظة الرقمية": markdown-rendered into
 *    `.contract-doc__content` as plain `<h1>`/`<h2>`/`<p>`/`<ul><li>` — version/
 *    date share one `<p>`, customer info lives in `<li>` bullets, and there
 *    are ~10 numbered `<h3>` sections instead of 4 fixed ones (plus a trailing
 *    unnumbered acknowledgement heading).
 * Only one shape is ever present on a given page, so `.or()` combinators
 * below don't risk a strict-mode ambiguity.
 */
export class RegistrationContractPage {
    readonly page: Page;

    // Header / Banner
    readonly logoImage: Locator;
    readonly logoLink: Locator;
    readonly enButton: Locator;
    readonly arabicButton: Locator;
    readonly themeToggle: Locator;

    // Step indicator
    readonly formEyebrow: Locator;
    readonly finalStepLabel: Locator;
    readonly contractReviewTitle: Locator;
    readonly instructionText: Locator;
    readonly outerStepBar: Locator;
    readonly activeStep: Locator;

    // Contract document
    readonly downloadPdfButton: Locator;
    readonly agreementHeading: Locator;
    readonly contractVersionLabel: Locator;
    readonly contractVersionValue: Locator;
    readonly acceptanceDateLabel: Locator;
    readonly acceptanceDateValue: Locator;
    readonly introParagraph: Locator;
    readonly customerNameValue: Locator;

    // Numbered contract sections (أولاً–رابعاً)
    readonly contractSections: Locator;

    // Acknowledgement & consent
    readonly agreeCheckbox: Locator;
    readonly agreeCheckboxLabel: Locator;

    // Actions
    readonly cancelButton: Locator;
    readonly submitButton: Locator;

    constructor(page: Page) {
        this.page = page;

        // Same post-mobile-step header as RegistrationInfoPage/RegistrationNafathPage/RegistrationProductsPage.
        this.logoImage = page.locator('#auth_header_logo[aria-label="MJD Pay"]');
        this.logoLink  = page.getByRole('link', { name: 'MJD Pay' });
        // testid confirmed live on RegistrationMobilePage's header (QA-DATA-TESTID-HANDOFF.md §4.2);
        // role-based locator kept as fallback since this specific header variant is unconfirmed.
        this.enButton     = page.getByTestId('lang-en')
            .or(page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'EN' }));
        this.arabicButton = page.getByTestId('lang-ar')
            .or(page.getByRole('group', { name: /change language/i }).getByRole('button', { name: 'العربية' }));
        this.themeToggle  = page.locator('button.mode-btn.header-icon-btn');

        this.formEyebrow  = page.locator('.form-eyebrow');
        this.finalStepLabel      = page.getByText('الخطوة الأخيرة');
        this.contractReviewTitle = page.getByText('مراجعة العقد');
        this.instructionText     = page.getByText(/اقرأ|وافق|إتمام\s*التسجيل/);
        this.outerStepBar = page.locator('.mp-step');
        this.activeStep   = page.locator('.mp-step.is-active');

        this.downloadPdfButton = page.getByTestId('register-contract-download-pdf-btn')
            .or(page.getByRole('button', { name: /تنزيل ملف PDF/i }))
            .or(page.getByRole('link', { name: /تنزيل ملف PDF/i }));
        // Old build: <td class="header-title"> inside a plain table. New build: the
        // markdown-rendered document's <h1> (its <h2> is a "Arabic version" subtitle,
        // not the title). Literal copy varies across builds either way, so both are
        // matched by structure/tag, not text.
        this.agreementHeading = page.locator('.contract-doc .header-title')
            .or(page.locator('.contract-doc__content h1'));

        // Label observed live as "رقم إصدار العقد:" / "إصدار العقد:" in both builds —
        // matched by substring, so no .or() needed here.
        this.contractVersionLabel = page.getByText(/إصدار العقد:/);
        this.acceptanceDateLabel  = page.getByText(/تاريخ التسجيل:|تاريخ القبول:/);
        // Version value and acceptance-date value are the two <bdi>s sharing one
        // container with the version label — a table row in the old build, a <p> in
        // the new one (the rest of the new document has many more <bdi>s further
        // down for customer info, so scoping to that specific container — rather
        // than .first()/.last() over the whole document — matters here).
        const versionMetaContainer = page.locator('tr, p').filter({ hasText: /إصدار العقد:/ }).first();
        this.contractVersionValue = versionMetaContainer.locator('bdi').nth(0);
        this.acceptanceDateValue  = versionMetaContainer.locator('bdi').nth(1);

        // Old build: a direct-child <p> of .contract-doc__content. New build: <p>s are
        // nested under a wrapper <div>, and the first one is the version/date <p> —
        // so match any descendant <p> and skip that one to land on the actual intro
        // boilerplate in both builds.
        this.introParagraph = page.locator('.contract-doc__content p')
            .filter({ hasNotText: /إصدار العقد:/ })
            .first();
        // Old build: first row of a dedicated .info-table. New build: a <li> bullet
        // ("اسم الشركة / العميل: ...") inside the same markdown document.
        this.customerNameValue = page.locator('.contract-doc .info-table tr').first().locator('td bdi')
            .or(page.locator('.contract-doc__content li').filter({ hasText: /اسم الشركة/ }).locator('bdi').first());

        // Old build: 4 fixed <div class="section-title"> (أولاً–رابعاً). New build:
        // ~10 numbered <h3> headings ("1. ...", "2. ..." etc) — excludes the trailing
        // unnumbered acknowledgement heading, which isn't one of the numbered sections.
        this.contractSections = page.locator('.contract-doc .section-title')
            .or(page.locator('.contract-doc__content h3').filter({ hasText: /^\d+\./ }));

        this.agreeCheckbox = page.getByTestId('register-contract-accept-checkbox')
            .or(page.getByRole('checkbox', { name: /لقد قرأت وأوافق على شروط العقد/ }));
        this.agreeCheckboxLabel = page.getByText('لقد قرأت وأوافق على شروط العقد');

        // Cancel reuses the Products step's testid live; Submit has its own
        // register-contract-* testid — both confirmed against a live UAT DOM dump.
        this.cancelButton = page.getByTestId('register-products-cancel-btn')
            .or(page.getByRole('button', { name: /^إلغاء$/ }));
        this.submitButton = page.getByTestId('register-contract-submit-btn')
            .or(page.getByRole('button', { name: /^إرسال وإنهاء$/ }));
    }

    /** Waits for the Contract step's own content (not just the outer step bar) to render. */
    async waitForLoad(): Promise<void> {
        await this.agreementHeading.waitFor({ state: 'visible', timeout: 20000 });
    }

    /** The nth (1-based) numbered contract section heading. */
    section(index: number): Locator {
        return this.contractSections.nth(index - 1);
    }
}
