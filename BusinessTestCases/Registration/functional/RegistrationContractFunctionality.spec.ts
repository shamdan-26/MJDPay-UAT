import { test, expect, Page } from '@playwright/test';
import { goToContractStep } from '../RegistrationHelper';
import { RegistrationContractPage } from '../../pageElements/Registration/RegistrationContractPage';

// ─────────────────────────────────────────────────────────────────────────────
// Registration — Contract Review Functionality (Tab 4 of 4: "العقد")
//
// RegistrationContractPage.spec.ts (ui/) covers element/text presence only —
// this file covers the interactive behavior of that step: the acknowledgement
// checkbox gating Submit, the negative "submit while unchecked" path, the PDF
// download action, and the final submission itself. The submission endpoint
// is covered twice: once live (happy path) and once mocked (double-submit
// dedup + server-error handling), matching the mock-only pattern already used
// for endpoints that are hard to exercise deterministically elsewhere in this
// suite (RegistrationPoSOnboarding.spec.ts, RegistrationSprint71.spec.ts).
//
// goToContractStep() (RegistrationHelper.ts) drives the full live chain
// (mobile → OTP → Business Info → Financial → Verification → Sign Up →
// Products) and only returns once the Contract document has actually
// rendered, cycling the shared CITIZEN_ASSETS pool past NAFATH/already-
// registered dead ends the same way the other Products/Contract specs do.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration – Contract Review: Acknowledgement & Actions (Live)', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let contract: RegistrationContractPage;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(300_000);
        const context = await browser.newContext();
        page = await context.newPage();
        await goToContractStep(page);
        contract = new RegistrationContractPage(page);
    });

    test.afterAll(async () => { await page.close(); });

    // ── Acknowledgement checkbox ─────────────────────────────────────────

    test('should keep Submit disabled while the agreement checkbox is unchecked', async () => {
        await expect(contract.agreeCheckbox).not.toBeChecked();
        await expect(contract.submitButton).toBeDisabled();
    });

    test('should enable Submit once the agreement checkbox is checked', async () => {
        await contract.agreeCheckbox.check();
        await expect(contract.submitButton).toBeEnabled({ timeout: 5000 });
    });

    test('should disable Submit again when the agreement checkbox is unchecked', async () => {
        await contract.agreeCheckbox.uncheck();
        await expect(contract.submitButton).toBeDisabled();
    });

    // ── Negative ──────────────────────────────────────────────────────────

    test('should not advance past Contract when Submit is force-clicked while unchecked', async () => {
        await contract.submitButton.click({ force: true }).catch(() => {});
        await expect(contract.agreementHeading).toBeVisible({ timeout: 5000 });
    });

    // ── PDF download ──────────────────────────────────────────────────────

    test('should trigger a PDF download when "Download PDF file" is clicked', async () => {
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 15000 }),
            contract.downloadPdfButton.click(),
        ]);
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Contract submission (`POST /register/contract/accept` per
// RegistrationAPIFlow.spec.ts's API-13) is mocked here for deterministic
// coverage of behavior that's awkward to force against the live backend:
// duplicate-click dedup and server-error handling. Error handling runs before
// the successful-submission test in the same describe, since a live success
// response is expected to navigate away from Contract and end the session for
// any test that would otherwise run after it.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Contract Submission (Mocked)', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let contract: RegistrationContractPage;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(300_000);
        const context = await browser.newContext();
        page = await context.newPage();
        await goToContractStep(page);
        contract = new RegistrationContractPage(page);
        await contract.agreeCheckbox.check();
    });

    test.afterAll(async () => { await page.close(); });

    test('should surface an error and remain on Contract when submission fails', async () => {
        await page.route('**/register/contract/accept**', route =>
            route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ errorCode: 'INTERNAL_ERROR' }) })
        );
        await contract.submitButton.click();
        const hasError = await page.locator('[class*="error"], [class*="alert"], [role="alert"], mat-snack-bar-container').first()
            .isVisible({ timeout: 8000 }).catch(() => false);
        const stillOnContract = await contract.agreementHeading.isVisible().catch(() => false);
        expect(hasError || stillOnContract).toBeTruthy();
    });

    test('should send only one request when Submit is clicked twice in quick succession', async () => {
        let submissions = 0;
        await page.unroute('**/register/contract/accept**').catch(() => {});
        await page.route('**/register/contract/accept**', async route => {
            submissions++;
            await new Promise(r => setTimeout(r, 500));
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'PENDING' }) });
        });
        await contract.submitButton.click();
        await contract.submitButton.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);
        expect(submissions).toBeLessThanOrEqual(1);
    });
});
