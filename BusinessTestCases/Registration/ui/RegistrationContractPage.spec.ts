import { test, expect, Page } from '@playwright/test';
import { goToContractStep } from '../RegistrationHelper';
import { RegistrationContractPage } from '../../pageElements/Registration/RegistrationContractPage';

// ─────────────────────────────────────────────────────────────────────────────
// Registration — Contract Review (Tab 4 of 4: "العقد")
//
// Covers the full page shell reached at this step: header/banner, the
// step-indicator area (Final step / Contract review / instructions), the
// 4-tab outer stepper, the contract document itself (PDF download, title,
// version/registration-date fields, intro paragraph, customer name, and the
// 4 numbered sections), and the checkbox + Cancel/Submit buttons. Element/text
// presence only — submitting the contract to complete registration is out of
// scope here.
//
// Confirmed live against a UAT DOM dump: the document is a v4.0.0 "اتفاقية
// تقديم خدمات رقمية" template — a plain table/paragraph/section-title
// structure, not semantic headings, with 4 sections (أولاً–رابعاً) and no
// separate acknowledgement panel. The 4 contract-section locators are matched
// positionally (RegistrationContractPage.section(n)).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration — Contract Review', () => {
    test.describe.configure({ mode: 'serial', retries: 1 });

    let page: Page;
    let contract: RegistrationContractPage;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(120_000);
        const context = await browser.newContext();
        page = await context.newPage();
        await goToContractStep(page);
        contract = new RegistrationContractPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    // ── Header / Banner ──────────────────────────────────────────────────────

    test('should display the MJD Pay logo', async () => {
        await expect(contract.logoImage).toBeVisible();
    });

    test('should link the logo to the business landing page', async () => {
        await expect(contract.logoLink).toHaveAttribute('href', /\/business\/landing/);
    });

    test('should display the EN language button', async () => {
        await expect(contract.enButton).toBeVisible();
    });

    test('should display the Arabic (العربية) language button', async () => {
        await expect(contract.arabicButton).toBeVisible();
    });

    test('should display the Switch theme button', async () => {
        await expect(contract.themeToggle).toBeVisible();
    });

    // ── Step indicator ────────────────────────────────────────────────────────

    test('should display the "Final step" label', async () => {
        await expect(contract.finalStepLabel).toBeVisible();
    });

    test('should display the "Contract review" title', async () => {
        await expect(contract.contractReviewTitle).toBeVisible();
    });

    test('should display instruction text about reading and agreeing to complete registration', async () => {
        await expect(contract.instructionText.first()).toBeVisible();
    });

    test('should display all four outer step labels: Business Info, NAFATH, Products, Contract', async () => {
        await expect(contract.outerStepBar.filter({ hasText: 'بيانات النشاط التجاري' })).toBeVisible();
        await expect(contract.outerStepBar.filter({ hasText: 'نَفاذ' })).toBeVisible();
        await expect(contract.outerStepBar.filter({ hasText: 'المنتجات' })).toBeVisible();
        await expect(contract.outerStepBar.filter({ hasText: 'العقد' })).toBeVisible();
    });

    test('should mark the Contract tab as the active step', async () => {
        await expect(contract.activeStep).toContainText('العقد');
    });

    // ── Contract document ────────────────────────────────────────────────────

    test('should display the "Download PDF file" button', async () => {
        await expect(contract.downloadPdfButton).toBeVisible();
    });

    test('should display the contract document title', async () => {
        await expect(contract.agreementHeading).toBeVisible();
    });

    test('should display the contract version field', async () => {
        await expect(contract.contractVersionLabel).toBeVisible();
        await expect(contract.contractVersionValue).toBeVisible();
        await expect(contract.contractVersionValue).not.toBeEmpty();
    });

    test('should display the registration date field showing today\'s date', async () => {
        const now = new Date();
        const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        await expect(contract.acceptanceDateLabel).toBeVisible();
        await expect(contract.acceptanceDateValue).toHaveText(todayYmd);
    });

    test('should display a non-empty intro paragraph', async () => {
        await expect(contract.introParagraph).toBeVisible();
        await expect(contract.introParagraph).not.toBeEmpty();
    });

    test('should display the involved company\'s name in the customer-info table', async () => {
        await expect(contract.customerNameValue).toBeVisible();
        await expect(contract.customerNameValue).not.toBeEmpty();
    });

    // ── Numbered contract sections ───────────────────────────────────────────
    // Section count/topics vary by build (UAT: 4 fixed sections; dev: ~10 with
    // different topics) — validated generically so this passes on either.

    test('should display at least one numbered contract section, each with visible non-empty heading text', async () => {
        const count = await contract.contractSections.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 1; i <= count; i++) {
            const section = contract.section(i);
            await expect(section).toBeVisible();
            await expect(section).not.toBeEmpty();
        }
    });

    // ── Consent & actions ────────────────────────────────────────────────────

    test('should display the "I have read and agree to the contract terms" checkbox, unchecked', async () => {
        await expect(contract.agreeCheckboxLabel).toBeVisible();
        await expect(contract.agreeCheckbox).toBeVisible();
        await expect(contract.agreeCheckbox).not.toBeChecked();
    });

    test('should display the Cancel button', async () => {
        await expect(contract.cancelButton).toBeVisible();
    });

    test('should display the Submit and finish button', async () => {
        await expect(contract.submitButton).toBeVisible();
    });
});
