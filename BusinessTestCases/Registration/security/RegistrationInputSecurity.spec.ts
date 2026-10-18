import { test, expect, Page } from '@playwright/test';
import { REGISTER_URL, VALID_EMAIL, nextResidentAsset, goToFinancialStep, fillFinancialForm } from '../helpers/RegistrationHelper';
import { RegistrationFinancialPage } from '../../pageElements/Registration/RegistrationFinancialPage';
import { RegistrationVerificationPage } from '../../pageElements/Registration/RegistrationVerificationPage';
import { CRN_INPUT, ID_INPUT, EMAIL_INPUT, EMAIL_ERROR, gotoTab1 } from '../helpers/infoStepForm';

// ─────────────────────────────────────────────────────────────────────────────
// Registration input security — XSS and SQL-injection probes for every free-text
// field of the wizard, in one place (previously copy-pasted across the Mobile,
// Info, Financial and Verification functional specs).
//
// One shared page walks the wizard forward in order — Mobile → Business Info →
// Financial & Business → Verification & Uploads — so the whole file costs a
// single pool identity instead of one per step. Probes only type into fields
// (never submit), so nothing here advances the registration.
// ─────────────────────────────────────────────────────────────────────────────

const XSS_SCRIPT = '<script>alert("xss")</script>';
const XSS_IMG    = '<img src=x onerror=alert(1)>';

/** Fails if a JS dialog (alert) opens while `fillPayload` runs — the signature of an executed XSS payload. */
async function expectNoDialog(page: Page, fillPayload: () => Promise<void>): Promise<void> {
    let alertFired = false;
    page.once('dialog', dialog => { alertFired = true; dialog.dismiss(); });
    await fillPayload();
    await page.waitForTimeout(500);
    expect(alertFired).toBe(false);
}

test.describe('Registration – Input Security (XSS / SQL injection)', { tag: ['@registration', '@security'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'security' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        page = await context.newPage();
    });

    test.afterAll(async () => { await page.context().close(); });

    // ── Step 1: Mobile ───────────────────────────────────────────────────────
    test.describe('Mobile step', () => {
        test.beforeAll(async () => {
            await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        });

        test('should not execute an XSS payload entered in the Mobile number field', { annotation: [{ type: 'testcase', description: "RM-31: Not execute an XSS payload entered in the Mobile number field" }] }, async () => {
            const input = page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ });
            await expectNoDialog(page, () => input.fill(XSS_SCRIPT));
            await expect(page.getByRole('button', { name: /next|التالي/i })).toBeDisabled();
        });

        test('should not accept a SQL injection pattern in the Mobile number field', { annotation: [{ type: 'testcase', description: "RM-32: Not accept a SQL injection pattern in the Mobile number field" }] }, async () => {
            const input = page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ });
            await input.clear();
            await input.pressSequentially("' OR '1'='1");
            expect(/[^0-9]/.test(await input.inputValue())).toBe(false);
        });
    });

    // ── Step 2: Business Info ────────────────────────────────────────────────
    test.describe('Business Info step', () => {
        test.beforeAll(async () => {
            test.setTimeout(180_000);
            await gotoTab1(page, page.context(), nextResidentAsset());
        });

        test('should not execute an XSS payload entered in the CRN field', { annotation: [{ type: 'testcase', description: "RI-63: Not execute an XSS payload entered in the CRN field" }] }, async () => {
            await expectNoDialog(page, () => page.locator(CRN_INPUT).fill(XSS_SCRIPT));
        });

        test('should not execute an XSS payload entered in the National ID field', { annotation: [{ type: 'testcase', description: "RI-76: Not execute an XSS payload entered in the National ID field" }] }, async () => {
            await expectNoDialog(page, () => page.locator(ID_INPUT).fill(XSS_IMG));
        });

        test('should not execute XSS entered in the email field', { annotation: [{ type: 'testcase', description: "RI-94: Not execute XSS entered in the email field" }] }, async () => {
            await expectNoDialog(page, async () => {
                await page.locator(EMAIL_INPUT).fill(XSS_SCRIPT);
                await page.locator(EMAIL_INPUT).blur();
            });
            await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
        });

        test('should treat SQL injection pattern in email as invalid and show error', { annotation: [{ type: 'testcase', description: "RI-95: Treat SQL injection pattern in email as invalid and show error" }] }, async () => {
            await page.locator(EMAIL_INPUT).fill("' OR '1'='1'; --");
            await page.locator(EMAIL_INPUT).blur();
            await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
        });
    });

    // ── Step 3: Financial & Business ─────────────────────────────────────────
    test.describe('Financial & Business step', () => {
        let financialPage: RegistrationFinancialPage;

        test.beforeAll(async () => {
            // goToFinancialStep can cycle up to 10 pool identities (~30-60s each).
            test.setTimeout(600_000);
            financialPage = new RegistrationFinancialPage(page);
            await goToFinancialStep(page, { profileType: 'merchant', email: VALID_EMAIL });
        });

        test('should not execute an XSS payload entered in the Monthly Expected Number field', { annotation: [{ type: 'testcase', description: "RF-58: Not execute an XSS payload entered in the Monthly Expected Number field" }] }, async () => {
            await expectNoDialog(page, () => financialPage.monthlyBillsInput.fill(XSS_SCRIPT));
        });

        test('should not execute an XSS payload entered in the Monthly Expected Sum field', { annotation: [{ type: 'testcase', description: "RF-59: Not execute an XSS payload entered in the Monthly Expected Sum field" }] }, async () => {
            await expectNoDialog(page, () => financialPage.monthlyAmountInput.fill(XSS_IMG));
        });

        test('should not accept a SQL injection pattern in the Expected Monthly Withdrawal field', { annotation: [{ type: 'testcase', description: "RF-60: Not accept a SQL injection pattern in the Expected Monthly Withdrawal field" }] }, async () => {
            const input = financialPage.monthlyWithdrawalInput;
            await input.clear();
            await input.pressSequentially("1' OR '1'='1");
            expect(/[^0-9]/.test(await input.inputValue())).toBe(false);
        });

        test('should not accept a SQL injection pattern in the Expected Monthly Deposit field', { annotation: [{ type: 'testcase', description: "RF-61: Not accept a SQL injection pattern in the Expected Monthly Deposit field" }] }, async () => {
            const input = financialPage.monthlyDepositInput;
            await input.clear();
            await input.pressSequentially('1; DROP TABLE users;--');
            expect(/[^0-9]/.test(await input.inputValue())).toBe(false);
        });
    });

    // ── Step 4: Verification & Uploads ───────────────────────────────────────
    test.describe('Verification & Uploads step', () => {
        let verification: RegistrationVerificationPage;

        test.beforeAll(async () => {
            test.setTimeout(120_000);
            // Replaces the probe garbage with valid values, then advances on the same identity.
            await fillFinancialForm(page);
            await new RegistrationFinancialPage(page).next();
            verification = new RegistrationVerificationPage(page);
            await verification.waitForLoad();
        });

        test('should not execute an XSS payload entered in the IBAN field', { annotation: [{ type: 'testcase', description: "RVU-56: Not execute an XSS payload entered in the IBAN field" }] }, async () => {
            await expectNoDialog(page, () => verification.ibanInput.fill(XSS_SCRIPT));
        });

        test('should not execute an XSS payload entered in the VAT Number field', { annotation: [{ type: 'testcase', description: "RVU-57: Not execute an XSS payload entered in the VAT Number field" }] }, async () => {
            await expectNoDialog(page, () => verification.vatInput.fill(XSS_IMG));
        });

        test('should treat a SQL injection pattern in the IBAN field as invalid', { annotation: [{ type: 'testcase', description: "RVU-58: Treat a SQL injection pattern in the IBAN field as invalid" }] }, async () => {
            await verification.ibanInput.fill("SA03' OR '1'='1");
            await page.getByRole('button', { name: /sign up|إنشاء حساب/i }).click({ force: true });
            const hasError = await page.locator('[class*="error"], [role="alert"]').isVisible().catch(() => false);
            const stillOnPage = await verification.ibanInput.isVisible().catch(() => false);
            expect(hasError || stillOnPage).toBeTruthy();
        });
    });
});
