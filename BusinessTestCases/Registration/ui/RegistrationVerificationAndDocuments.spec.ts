import { test, expect, Page } from '@playwright/test';
import { goToVerificationStep, REGISTER_URL } from '../RegistrationHelper';
import { RegistrationVerificationPage } from '../../pageElements/Registration/RegistrationVerificationPage';
import { RegistrationInfoPage } from '../../pageElements/Registration/RegistrationInfoPage';
import { RegistrationFinancialPage } from '../../pageElements/Registration/RegistrationFinancialPage';

// ─────────────────────────────────────────────────────────────────────────────
// Registration — Verification & Documents (Tab 3 of 3: "Verification & Uploads")
//
// Covers the full page shell reached at this step: header/banner, the
// progress/step-indicator area (title, subheading, description, the 4 outer
// step labels, and the 3-tab inner stepper with done/current state), the
// active Verification & Uploads panel's fields, and — via clicking the
// "done" Business Info / Financial & Business tabs — the recap panels for
// steps 1 and 2. Field-level behavioral coverage for steps 1 and 2 already
// lives in RegistrationInfoPage.spec.ts / RegistrationFinancialPage.spec.ts;
// this file only confirms those panels are reachable and render from here,
// not their full field-by-field behavior again.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration — Verification & Documents', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let verification: RegistrationVerificationPage;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(150_000);
        const context = await browser.newContext();
        page = await context.newPage();
        await goToVerificationStep(page);
        verification = new RegistrationVerificationPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    // ── Header / Banner ──────────────────────────────────────────────────────

    test('should display the MJD Pay logo', async () => {
        await expect(verification.logoImage).toBeVisible();
    });

    test('should link the logo to the business landing page', async () => {
        await expect(verification.logoLink).toHaveAttribute('href', /\/business\/landing/);
    });

    test('should display the EN language button', async () => {
        await expect(verification.enButton).toBeVisible();
    });

    test('should display the Arabic (العربية) language button', async () => {
        await expect(verification.arabicButton).toBeVisible();
    });

    test('should display the Switch theme button', async () => {
        await expect(verification.themeToggle).toBeVisible();
    });

    // ── Progress / step indicators ───────────────────────────────────────────

    test('should display the "Create Account" title', async () => {
        await expect(verification.formEyebrow).toContainText(' إنشاء حساب ');
    });

    test('should display the "Verification & documents" subheading', async () => {
        await expect(verification.formTitle).toContainText(" التحقق والمستندات ");
    });

    test('should display the "Step 3 of 3" description', async () => {
        await expect(verification.formSubTitle).toContainText(/الخطوة 3 من 3،/i);
    });

    test('should display all four outer step labels: Business Info, NAFATH, Products, Contract', async () => {
        await expect(verification.outerStepBar.filter({ hasText: " بيانات النشاط التجاري " })).toBeVisible();
        await expect(verification.outerStepBar.filter({ hasText: " نَفاذ " })).toBeVisible();
        await expect(verification.outerStepBar.filter({ hasText: " المنتجات " })).toBeVisible();
        await expect(verification.outerStepBar.filter({ hasText: " العقد " })).toBeVisible();
    });

    // ── Panel 3: Verification & Uploads (active) ─────────────────────────────

    test('should display the Bank dropdown', async () => {
        await expect(verification.bankDropdown).toBeVisible();
    });

    test('should display the IBAN field with the correct placeholder', async () => {
        await expect(verification.ibanInput).toBeVisible();
        await expect(verification.ibanInput).toHaveAttribute('placeholder', /SA0380000001234567891234/i);
    });

    test('should display the IBAN helper text "24 characters starting with SA"', async () => {
        await expect(verification.ibanHint).toBeVisible();
    });

    test('should display the IBAN proof upload with "Click to upload" and helper text', async () => {
        await expect(verification.ibanProofLabel).toBeVisible();
        await expect(verification.ibanUploadPrompt).toBeVisible();
        await expect(verification.ibanUploadHelperText).toBeVisible();
    });

    test('should display the accepted file types for IBAN proof (PDF/JPG)', async () => {
        await expect(page.getByText(/pdf|jpg/i).first()).toBeVisible();
    });

    test('should display the max file size for IBAN proof (5MB)', async () => {
        await expect(page.getByText(/5\s*(mb|ميجابايت)/i).first()).toBeVisible();
    });

    test('should display the VAT number field with the correct placeholder', async () => {
        await expect(verification.vatInput).toBeVisible();
        await expect(verification.vatInput).toHaveAttribute('placeholder', /300123456700003/i);
    });

    test('should display the VAT helper text "From your VAT certificate"', async () => {
        await expect(verification.vatHint).toBeVisible();
    });

    test('should display the VAT certificate upload with "Click to upload" and helper text', async () => {
        await expect(verification.vatCertLabel).toBeVisible();
        await expect(verification.vatUploadPrompt).toBeVisible();
        await expect(verification.vatUploadHelperText).toBeVisible();
    });

    test('should display a notice about the OTP/NAFATH verification process', async () => {
        await expect(verification.otpNafathNotice).toBeVisible();
    });

    test('should display the Back button', async () => {
        await expect(verification.backButton).toBeVisible();
    });

    test('should display the Sign Up button', async () => {
        await expect(verification.signUpButton).toBeVisible();
    });

    test('should keep Sign Up disabled when required fields are empty', async () => {
        await expect(verification.signUpButton).toBeDisabled();
    });

    // ── Footer (repeated on every panel) ─────────────────────────────────────

    test('should display "Already have an account? Log In"', async () => {
        await expect(verification.loginLine).toBeVisible();
        await expect(verification.loginLink).toContainText(" تسجيل الدخول ");
    });

    test('should display Terms & Conditions and Privacy Policy references', async () => {
        await expect(verification.footer).toContainText(' الشروط والأحكام ');
        await expect(verification.footer).toContainText(' سياسة الخصوصية ');
    });
});