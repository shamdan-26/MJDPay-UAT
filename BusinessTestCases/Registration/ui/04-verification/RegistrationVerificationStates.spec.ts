import { test, expect, Page } from '@playwright/test';
import { goToVerificationStepMocked, apiError, json, VALID_IBAN, VALID_VAT_NUMBER, TEST_FILE_BUFFER } from '../../RegistrationHelper';
import { RegistrationVerificationPage } from '../../../pageElements/Registration/RegistrationVerificationPage';

// Verification & Uploads — upload failures, replace/retry, Sign Up submit states. Reached with no real OTP and no
// pool identity (OTP bypass + mocked Business Info submit); the file-upload and register endpoints are mocked per test.
const UPLOAD   = '**/file/attachment/upload**';
const REGISTER = '**/emi-profile/api/v1/register';

const pdf = (name: string, size?: number) => ({ name, mimeType: 'application/pdf', buffer: size ? Buffer.alloc(size, 1) : TEST_FILE_BUFFER });

test.describe('Registration – Verification & Uploads states', { tag: ['@registration', '@verification', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    let page: Page;
    let verification: RegistrationVerificationPage;

    test.beforeEach(async ({ page: p }) => {
        test.setTimeout(150_000);
        page = p;
        verification = new RegistrationVerificationPage(page);
    });

    test('should show an error and keep Sign Up disabled when the IBAN proof upload fails (500)', { annotation: [{ type: 'testcase', description: "RG-VERST-01: Should show an error and keep Sign Up disabled when the IBAN proof upload fails (500)" }] }, async () => {
        const err = apiError(500, 'FILE_UPLOAD_FAILED');
        await page.route(UPLOAD, route => json(route, err.status, err.body));
        await goToVerificationStepMocked(page);
        await verification.ibanInput.fill(VALID_IBAN);
        await verification.vatInput.fill(VALID_VAT_NUMBER);
        await page.locator('input[type="file"]').first().setInputFiles(pdf('iban_proof.pdf'));
        await expect(page.locator('[class*="error"], [role="alert"], .text-danger').filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: 10000 });
        await expect(verification.signUpButton).toBeDisabled();
    });

    test('should let a failed upload be retried with the same file', { annotation: [{ type: 'testcase', description: "RG-VERST-02: Should let a failed upload be retried with the same file" }] }, async () => {
        let calls = 0;
        await page.route(UPLOAD, route => {
            calls++;
            return calls === 1 ? json(route, 500, apiError(500, 'FILE_UPLOAD_FAILED').body) : json(route, 200, { fileId: 'file-1' });
        });
        await goToVerificationStepMocked(page);
        const input = page.locator('input[type="file"]').first();
        await input.setInputFiles(pdf('iban_proof.pdf'));
        await expect.poll(() => calls).toBe(1);
        await input.setInputFiles(pdf('iban_proof.pdf'));
        await expect.poll(() => calls).toBe(2);
    });

    test('should reject a renamed non-PDF (server says invalid file) without enabling Sign Up', { annotation: [{ type: 'testcase', description: "RG-VERST-03: Should reject a renamed non-PDF (server says invalid file) without enabling Sign Up" }] }, async () => {
        const err = apiError(400, 'INVALID_FILE_TYPE');
        await page.route(UPLOAD, route => json(route, err.status, err.body));
        await goToVerificationStepMocked(page);
        await verification.ibanInput.fill(VALID_IBAN);
        await verification.vatInput.fill(VALID_VAT_NUMBER);
        await page.locator('input[type="file"]').first().setInputFiles({ name: 'malware.pdf', mimeType: 'application/pdf', buffer: Buffer.from('MZ\x90\x00 not a pdf') });
        await expect(verification.signUpButton).toBeDisabled();
    });

    test('should not enable Sign Up for a zero-byte file', { annotation: [{ type: 'testcase', description: "RG-VERST-04: Should not enable Sign Up for a zero-byte file" }] }, async () => {
        await page.route(UPLOAD, route => json(route, 400, apiError(400, 'EMPTY_FILE').body));
        await goToVerificationStepMocked(page);
        await page.locator('input[type="file"]').first().setInputFiles({ name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) });
        await expect(verification.signUpButton).toBeDisabled();
    });

    test('should replace the IBAN proof when a second file is chosen', { annotation: [{ type: 'testcase', description: "RG-VERST-05: Should replace the IBAN proof when a second file is chosen" }] }, async () => {
        const ids: string[] = [];
        await page.route(UPLOAD, route => { const id = `file-${ids.length + 1}`; ids.push(id); return json(route, 200, { fileId: id }); });
        await goToVerificationStepMocked(page);
        const input = page.locator('input[type="file"]').first();
        await input.setInputFiles(pdf('first.pdf'));
        await expect.poll(() => ids.length).toBe(1);
        await input.setInputFiles(pdf('second.pdf'));
        await expect.poll(() => ids.length).toBe(2);
        await expect(page.getByText('second.pdf')).toBeVisible();
    });

    test('should keep the entered IBAN and VAT number after going Back and returning', { annotation: [{ type: 'testcase', description: "RG-VERST-06: Should keep the entered IBAN and VAT number after going Back and returning" }] }, async () => {
        await goToVerificationStepMocked(page);
        await verification.ibanInput.fill(VALID_IBAN);
        await verification.vatInput.fill(VALID_VAT_NUMBER);
        await verification.backButton.click();
        await page.getByRole('button', { name: /next|التالي/i }).click();
        await verification.waitForLoad();
        await expect(verification.ibanInput).toHaveValue(VALID_IBAN);
        await expect(verification.vatInput).toHaveValue(VALID_VAT_NUMBER);
    });

    test('should upper-case a lower-case IBAN', { annotation: [{ type: 'testcase', description: "RG-VERST-07: Should upper-case a lower-case IBAN" }] }, async () => {
        await goToVerificationStepMocked(page);
        await verification.ibanInput.fill(VALID_IBAN.toLowerCase());
        await expect(verification.ibanInput).toHaveValue(VALID_IBAN.toUpperCase());
    });

    test.describe('Sign Up submission', () => {
        async function fillAll() {
            await verification.ibanInput.fill(VALID_IBAN);
            await verification.vatInput.fill(VALID_VAT_NUMBER);
            const inputs = page.locator('input[type="file"]');
            await inputs.nth(0).setInputFiles(pdf('iban_proof.pdf'));
            await inputs.nth(1).setInputFiles(pdf('vat_certificate.pdf'));
            await expect(verification.signUpButton).toBeEnabled({ timeout: 15000 });
        }

        test('should stay on the step with Sign Up usable again when registration fails (500)', { annotation: [{ type: 'testcase', description: "RG-VERST-08: Should stay on the step with Sign Up usable again when registration fails (500)" }] }, async () => {
            await page.route(UPLOAD, route => json(route, 200, { fileId: 'file-x' }));
            const err = apiError(500, 'INTERNAL_ERROR');
            await page.route(REGISTER, route => route.request().method() === 'POST' ? json(route, err.status, err.body) : route.continue());
            await goToVerificationStepMocked(page);
            await fillAll();
            await verification.signUpButton.click();
            await expect(verification.ibanInput).toBeVisible();
            await expect(verification.signUpButton).toBeEnabled({ timeout: 15000 });
        });

        test('should send only one registration request when Sign Up is double-clicked', { annotation: [{ type: 'testcase', description: "RG-VERST-09: Should send only one registration request when Sign Up is double-clicked" }] }, async () => {
            let calls = 0;
            await page.route(UPLOAD, route => json(route, 200, { fileId: 'file-x' }));
            await page.route(REGISTER, async route => {
                if (route.request().method() !== 'POST') return route.continue();
                calls++;
                await new Promise(r => setTimeout(r, 1500));
                await json(route, 500, apiError(500, 'INTERNAL_ERROR').body);
            });
            await goToVerificationStepMocked(page);
            await fillAll();
            await verification.signUpButton.dblclick();
            await page.waitForTimeout(2500);
            expect(calls).toBe(1);
        });

        test('should send the uploaded file ids and the IBAN/VAT values in the registration request', { annotation: [{ type: 'testcase', description: "RG-VERST-10: Should send the uploaded file ids and the IBAN/VAT values in the registration request" }] }, async () => {
            let body: Record<string, unknown> | undefined;
            await page.route(UPLOAD, route => json(route, 200, { fileId: 'file-x' }));
            await page.route(REGISTER, route => {
                if (route.request().method() !== 'POST') return route.continue();
                body = route.request().postDataJSON();
                return json(route, 500, apiError(500, 'INTERNAL_ERROR').body);
            });
            await goToVerificationStepMocked(page);
            await fillAll();
            await verification.signUpButton.click();
            await expect.poll(() => body).toBeDefined();
            const text = JSON.stringify(body);
            expect(text).toContain(VALID_IBAN);
            expect(text).toContain(VALID_VAT_NUMBER);
            expect(text).toContain('file-x');
        });
    });
});
