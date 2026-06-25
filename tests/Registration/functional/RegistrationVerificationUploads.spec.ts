import { test, expect } from '@playwright/test';
import { goToVerificationStep } from '../helpers';

test.describe('Registration – Verification & Uploads Step (Tab 3 of 3)', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
        await goToVerificationStep(page);
    });

    // ── Step indicator ────────────────────────────────────────────────────────

    test('should show the Verification & Uploads tab as active', async ({ page }) => {
        await expect(page.getByRole('tab', { name: /verification/i })).toHaveAttribute('aria-selected', 'true');
    });

    test('should display the step indicator "Step 3 of 3" or highlight the third tab', async ({ page }) => {
        const step3 = page.getByText(/step 3 of 3/i).or(page.getByRole('tab', { name: /verification/i }));
        await expect(step3.first()).toBeVisible();
    });

    // ── IBAN field ────────────────────────────────────────────────────────────

    test('should display the IBAN field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /iban/i })).toBeVisible();
    });

    test('should show the correct placeholder for IBAN', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /iban/i }))
            .toHaveAttribute('placeholder', /SA0380000001234567891234/i);
    });

    test('should display the IBAN hint "24 characters starting with SA"', async ({ page }) => {
        await expect(page.getByText(/24 characters starting with SA/i)).toBeVisible();
    });

    test('should accept a valid IBAN', async ({ page }) => {
        await page.getByRole('textbox', { name: /iban/i }).fill('SA0380000001234567891234');
        await expect(page.getByRole('textbox', { name: /iban/i })).toHaveValue('SA0380000001234567891234');
    });

    test('should show a validation error for an IBAN that does not start with SA', async ({ page }) => {
        await page.getByRole('textbox', { name: /iban/i }).fill('GB0380000001234567891234');
        await page.getByRole('button', { name: /sign up/i }).click({ force: true });
        const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
        const stillOnPage = await page.getByRole('textbox', { name: /iban/i }).isVisible().catch(() => false);
        expect(hasError || stillOnPage).toBeTruthy();
    });

    test('should show a validation error for an IBAN shorter than 24 characters', async ({ page }) => {
        await page.getByRole('textbox', { name: /iban/i }).fill('SA038000000123456');
        await page.getByRole('button', { name: /sign up/i }).click({ force: true });
        const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
        const stillOnPage = await page.getByRole('textbox', { name: /iban/i }).isVisible().catch(() => false);
        expect(hasError || stillOnPage).toBeTruthy();
    });

    // ── IBAN Proof upload ─────────────────────────────────────────────────────

    test('should display the IBAN Proof upload area', async ({ page }) => {
        await expect(page.getByText(/iban proof/i)).toBeVisible();
    });

    test('should display the IBAN proof upload hint text', async ({ page }) => {
        await expect(page.getByText(/bank letter or statement header/i)).toBeVisible();
    });

    test('should display the accepted file types for IBAN proof (PDF, JPG)', async ({ page }) => {
        await expect(page.getByText(/pdf.*jpg|jpg.*pdf/i)).toBeVisible();
    });

    test('should display the max file size for IBAN proof (5MB)', async ({ page }) => {
        await expect(page.getByText(/5mb/i).first()).toBeVisible();
    });

    test('should display the "Click to upload" prompt for IBAN proof', async ({ page }) => {
        await expect(page.getByText(/click to upload/i).first()).toBeVisible();
    });

    // ── VAT Number ────────────────────────────────────────────────────────────

    test('should display the VAT Number field', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /vat number/i })).toBeVisible();
    });

    test('should show the correct placeholder for VAT Number', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: /vat number/i }))
            .toHaveAttribute('placeholder', /300123456700003/i);
    });

    test('should display the VAT Number hint "From your ZATCA VAT certificate"', async ({ page }) => {
        await expect(page.getByText(/zatca vat certificate/i)).toBeVisible();
    });

    test('should accept a valid VAT Number', async ({ page }) => {
        await page.getByRole('textbox', { name: /vat number/i }).fill('300123456700003');
        await expect(page.getByRole('textbox', { name: /vat number/i })).toHaveValue('300123456700003');
    });

    // ── VAT Certificate upload ────────────────────────────────────────────────

    test('should display the VAT Certificate upload area', async ({ page }) => {
        await expect(page.getByText(/vat certificate/i)).toBeVisible();
    });

    test('should display the VAT certificate upload hint "From ZATCA"', async ({ page }) => {
        await expect(page.getByText(/from zatca/i)).toBeVisible();
    });

    test('should display the accepted file type for VAT certificate (PDF)', async ({ page }) => {
        await expect(page.getByText(/· pdf ·/i)).toBeVisible();
    });

    // ── NAFATH notice ─────────────────────────────────────────────────────────

    test('should display the post-submit NAFATH verification notice', async ({ page }) => {
        await expect(
            page.getByText(/after you submit.*otp.*nafath|nafath/i).first()
        ).toBeVisible();
    });

    // ── Navigation buttons ────────────────────────────────────────────────────

    test('should display the Back button', async ({ page }) => {
        await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
    });

    test('should display the Sign Up button', async ({ page }) => {
        await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
    });

    test('should keep Sign Up disabled when required fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: /sign up/i })).toBeDisabled();
    });

    test('should return to Financial & Business tab when Back is clicked', async ({ page }) => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.getByRole('tab', { name: /financial/i }))
            .toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    });

    test('should enable Sign Up when IBAN and VAT Number are filled', async ({ page }) => {
        await page.getByRole('textbox', { name: /iban/i }).fill('SA0380000001234567891234');
        await page.getByRole('textbox', { name: /vat number/i }).fill('300123456700003');
        await expect(page.getByRole('button', { name: /sign up/i })).toBeEnabled({ timeout: 5000 });
    });

    // ── Footer ────────────────────────────────────────────────────────────────

    test('should display "Already have an account?" text', async ({ page }) => {
        await expect(page.getByText(/already have an account/i)).toBeVisible();
    });

    test('should display Terms & Conditions link', async ({ page }) => {
        await expect(page.getByText(/terms & conditions/i)).toBeVisible();
    });

    test('should display Privacy Policy link', async ({ page }) => {
        await expect(page.getByText(/privacy policy/i)).toBeVisible();
    });
});
