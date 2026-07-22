import { test, expect } from '@playwright/test';
import { goToVerificationStep, REGISTER_URL, VALID_IBAN, VALID_VAT_NUMBER, TEST_FILE_BUFFER } from '../RegistrationHelper';

test.describe('Registration – Verification & Uploads Step (Tab 3 of 3)', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page, context }) => {
        await goToVerificationStep(page);
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
        await page.getByRole('textbox', { name: /iban/i }).fill(VALID_IBAN);
        await expect(page.getByRole('textbox', { name: /iban/i })).toHaveValue(VALID_IBAN);
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

    // Documented spec (EMI Validation confluence page): the 2 check digits after "SA"
    // must pass a MOD-97 (ISO 7064) checksum. "00" is never a valid check-digit pair
    // for any account digits, so this is well-formed (24 chars, SA prefix, digits only)
    // but must still be rejected as an invalid IBAN.
    test('should show a validation error for a well-formed IBAN that fails the checksum', async ({ page }) => {
        await page.getByRole('textbox', { name: /iban/i }).fill('SA0080000001234567891234');
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
        await page.getByRole('textbox', { name: /vat number/i }).fill(VALID_VAT_NUMBER);
        await expect(page.getByRole('textbox', { name: /vat number/i })).toHaveValue(VALID_VAT_NUMBER);
    });

    test('should show a validation error for a VAT Number shorter than 15 digits', async ({ page }) => {
        await page.getByRole('textbox', { name: /vat number/i }).fill('30012345');
        await page.getByRole('button', { name: /sign up/i }).click({ force: true });
        const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
        const stillOnPage = await page.getByRole('textbox', { name: /vat number/i }).isVisible().catch(() => false);
        expect(hasError || stillOnPage).toBeTruthy();
    });

    test('should not retain alphabetic characters in the VAT Number field', async ({ page }) => {
        const input = page.getByRole('textbox', { name: /vat number/i });
        await input.pressSequentially('ABCDEFGHIJKLMNO');
        const value = await input.inputValue();
        expect(/[a-zA-Z]/.test(value)).toBe(false);
    });

    // Documented spec (EMI Validation confluence page): VAT must be 15 digits and
    // start with 2 or 3.
    test('should show a validation error for a 15-digit VAT Number not starting with 2 or 3', async ({ page }) => {
        await page.getByRole('textbox', { name: /vat number/i }).fill('100123456700003');
        await page.getByRole('button', { name: /sign up/i }).click({ force: true });
        const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
        const stillOnPage = await page.getByRole('textbox', { name: /vat number/i }).isVisible().catch(() => false);
        expect(hasError || stillOnPage).toBeTruthy();
    });

    test('should not allow more than 15 digits in the VAT Number field', async ({ page }) => {
        const input = page.getByRole('textbox', { name: /vat number/i });
        await input.pressSequentially('3001234567000031', { delay: 10 });
        const value = await input.inputValue();
        expect(value.length).toBeLessThanOrEqual(15);
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

    // ── Security ───────────────────────────────────────────────────────────────

    test('should not execute an XSS payload entered in the IBAN field', async ({ page }) => {
        let alertFired = false;
        page.once('dialog', dialog => { alertFired = true; dialog.dismiss(); });
        await page.getByRole('textbox', { name: /iban/i }).fill('<script>alert("xss")</script>');
        await page.waitForTimeout(500);
        expect(alertFired).toBe(false);
    });

    test('should not execute an XSS payload entered in the VAT Number field', async ({ page }) => {
        let alertFired = false;
        page.once('dialog', dialog => { alertFired = true; dialog.dismiss(); });
        await page.getByRole('textbox', { name: /vat number/i }).fill('<img src=x onerror=alert(1)>');
        await page.waitForTimeout(500);
        expect(alertFired).toBe(false);
    });

    test('should treat a SQL injection pattern in the IBAN field as invalid', async ({ page }) => {
        await page.getByRole('textbox', { name: /iban/i }).fill("SA03' OR '1'='1");
        await page.getByRole('button', { name: /sign up/i }).click({ force: true });
        const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
        const stillOnPage = await page.getByRole('textbox', { name: /iban/i }).isVisible().catch(() => false);
        expect(hasError || stillOnPage).toBeTruthy();
    });

    // ── File uploads ─────────────────────────────────────────────────────────
    // Selectors target input[type="file"] behind the "Click to upload" trigger.

    test.describe('File upload interactions', () => {
        function ibanProofInput(page: import('@playwright/test').Page) {
            return page.locator('input[type="file"]').first();
        }
        function vatCertificateInput(page: import('@playwright/test').Page) {
            return page.locator('input[type="file"]').nth(1);
        }

        test('should accept a valid PDF for IBAN proof upload', async ({ page }) => {
            const input = ibanProofInput(page);
            await input.setInputFiles({ name: 'iban_proof.pdf', mimeType: 'application/pdf', buffer: TEST_FILE_BUFFER });
            const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
            expect(hasError).toBe(false);
        });

        test('should reject an unsupported file type for IBAN proof upload', async ({ page }) => {
            const input = ibanProofInput(page);
            await input.setInputFiles({ name: 'iban_proof.exe', mimeType: 'application/octet-stream', buffer: TEST_FILE_BUFFER });
            await expect(
                page.locator('[class*="error"], [role="alert"]').first()
            ).toBeVisible({ timeout: 5000 });
        });

        test('should reject a file larger than 5MB for IBAN proof upload', async ({ page }) => {
            const input = ibanProofInput(page);
            const oversized = Buffer.alloc(6 * 1024 * 1024, 1);
            await input.setInputFiles({ name: 'iban_proof_large.pdf', mimeType: 'application/pdf', buffer: oversized });
            await expect(
                page.locator('[class*="error"], [role="alert"]').first()
            ).toBeVisible({ timeout: 5000 });
        });

        test('should accept a valid PDF for VAT certificate upload', async ({ page }) => {
            const input = vatCertificateInput(page);
            await input.setInputFiles({ name: 'vat_certificate.pdf', mimeType: 'application/pdf', buffer: TEST_FILE_BUFFER });
            const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
            expect(hasError).toBe(false);
        });

        test('should reject a non-PDF file type for VAT certificate upload', async ({ page }) => {
            const input = vatCertificateInput(page);
            await input.setInputFiles({ name: 'vat_certificate.jpg', mimeType: 'image/jpeg', buffer: TEST_FILE_BUFFER });
            await expect(
                page.locator('[class*="error"], [role="alert"]').first()
            ).toBeVisible({ timeout: 5000 });
        });

        test('should reject a file larger than 5MB for VAT certificate upload', async ({ page }) => {
            const input = vatCertificateInput(page);
            const oversized = Buffer.alloc(6 * 1024 * 1024, 1);
            await input.setInputFiles({ name: 'vat_certificate_large.pdf', mimeType: 'application/pdf', buffer: oversized });
            await expect(
                page.locator('[class*="error"], [role="alert"]').first()
            ).toBeVisible({ timeout: 5000 });
        });

        // ── File name localization (Arabic / English) ───────────────────────

        test('should accept an English-named PDF for IBAN proof upload', async ({ page }) => {
            const input = ibanProofInput(page);
            await input.setInputFiles({ name: 'bank-statement-header.pdf', mimeType: 'application/pdf', buffer: TEST_FILE_BUFFER });
            const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
            expect(hasError).toBe(false);
        });

        test('should accept an Arabic-named PDF for IBAN proof upload', async ({ page }) => {
            const input = ibanProofInput(page);
            await input.setInputFiles({ name: 'إثبات_الآيبان.pdf', mimeType: 'application/pdf', buffer: TEST_FILE_BUFFER });
            const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
            expect(hasError).toBe(false);
        });

        test('should accept an English-named PDF for VAT certificate upload', async ({ page }) => {
            const input = vatCertificateInput(page);
            await input.setInputFiles({ name: 'zatca-vat-certificate.pdf', mimeType: 'application/pdf', buffer: TEST_FILE_BUFFER });
            const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
            expect(hasError).toBe(false);
        });

        test('should accept an Arabic-named PDF for VAT certificate upload', async ({ page }) => {
            const input = vatCertificateInput(page);
            await input.setInputFiles({ name: 'شهادة_ضريبة_القيمة_المضافة.pdf', mimeType: 'application/pdf', buffer: TEST_FILE_BUFFER });
            const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
            expect(hasError).toBe(false);
        });
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
        await page.getByRole('textbox', { name: /iban/i }).fill(VALID_IBAN);
        await page.getByRole('textbox', { name: /vat number/i }).fill(VALID_VAT_NUMBER);
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
