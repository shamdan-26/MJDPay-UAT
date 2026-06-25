import { test, expect, Page } from '@playwright/test';
import { goToVerificationStep } from './helpers';

test.describe('Registration – Verification & Uploads Page', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        page = await context.newPage();
        await goToVerificationStep(page);
    }, 120_000);

    test.afterAll(async () => {
        await page.close();
    });

    // ── Tab indicator ─────────────────────────────────────────────────────────

    test('should show the Verification & Uploads step fields on arrival', async () => {
        await expect(page.getByRole('textbox', { name: /iban/i })).toBeVisible();
    });

    test('should display the step progression indicator', async () => {
        await expect(page.getByText(/verification/i).first()).toBeVisible();
    });

    // ── IBAN field ────────────────────────────────────────────────────────────

    test('should display the IBAN field label', async () => {
        await expect(page.getByText(/iban/i).first()).toBeVisible();
    });

    test('should display the IBAN input', async () => {
        await expect(page.getByRole('textbox', { name: /iban/i })).toBeVisible();
    });

    test('should show the correct placeholder for IBAN', async () => {
        await expect(page.getByRole('textbox', { name: /iban/i }))
            .toHaveAttribute('placeholder', /SA0380000001234567891234/i);
    });

    test('should display the IBAN hint "24 characters starting with SA"', async () => {
        await expect(page.getByText(/24 characters starting with SA/i)).toBeVisible();
    });

    // ── IBAN Proof upload ─────────────────────────────────────────────────────

    test('should display the IBAN Proof upload area', async () => {
        await expect(page.getByText(/iban proof/i)).toBeVisible();
    });

    test('should display the "Click to upload" prompt for IBAN proof', async () => {
        await expect(page.getByText(/click to upload/i).first()).toBeVisible();
    });

    test('should display the accepted file types for IBAN proof', async () => {
        await expect(page.getByText(/pdf|jpg/i).first()).toBeVisible();
    });

    test('should display the max file size for IBAN proof (5MB)', async () => {
        await expect(page.getByText(/5\s*mb/i).first()).toBeVisible();
    });

    // ── VAT Number field ──────────────────────────────────────────────────────

    test('should display the VAT Number field label', async () => {
        await expect(page.getByText(/vat number/i).first()).toBeVisible();
    });

    test('should display the VAT Number input', async () => {
        await expect(page.getByRole('textbox', { name: /vat number/i })).toBeVisible();
    });

    test('should show the correct placeholder for VAT Number', async () => {
        await expect(page.getByRole('textbox', { name: /vat number/i }))
            .toHaveAttribute('placeholder', /300123456700003/i);
    });

    test('should display the VAT Number hint referencing ZATCA', async () => {
        await expect(page.getByText(/zatca/i).first()).toBeVisible();
    });

    // ── VAT Certificate upload ────────────────────────────────────────────────

    test('should display the VAT Certificate upload area', async () => {
        await expect(page.getByText(/vat certificate/i)).toBeVisible();
    });

    test('should display the "Click to upload" prompt for VAT certificate', async () => {
        await expect(page.getByText(/click to upload/i).first()).toBeVisible();
    });

    // ── Navigation buttons ────────────────────────────────────────────────────

    test('should display the Back button', async () => {
        await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
    });

    test('should display the Sign Up button', async () => {
        await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
    });

    test('should have Sign Up disabled when required fields are empty', async () => {
        await expect(page.getByRole('button', { name: /sign up/i })).toBeDisabled();
    });

    // ── Footer ────────────────────────────────────────────────────────────────

    test('should display "Already have an account?" text', async () => {
        await expect(page.getByText(/already have an account/i)).toBeVisible();
    });

    test('should display Terms & Conditions link', async () => {
        await expect(page.getByText(/terms & conditions/i)).toBeVisible();
    });

    test('should display Privacy Policy link', async () => {
        await expect(page.getByText(/privacy policy/i)).toBeVisible();
    });
});
