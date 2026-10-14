import { test, expect, Page, Browser } from '@playwright/test';
import { goToInfoStep, goToInfoStepMocked, RESIDENT_ASSETS, generateEmail } from '../../RegistrationHelper';
import { RegistrationInfoPage } from '../../../pageElements/Registration/RegistrationInfoPage';

async function navigateToInfoStep(browser: Browser, workerIndex: number): Promise<InfoNav> {
    const context = await browser.newContext();
    const page: Page = await context.newPage();
    const asset = RESIDENT_ASSETS[workerIndex % RESIDENT_ASSETS.length];
    // Read-only checks: reach Business Info through the mocked OTP bypass (no real OTP, no pool identity burned).
    await goToInfoStepMocked(page, asset.mobile);
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 });
    return { page, infoPage: new RegistrationInfoPage(page) };
}

interface InfoNav { page: Page; infoPage: RegistrationInfoPage }

test.describe('Registration - Info Page — Form', { tag: ['@registration', '@business-info', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    // ─────────────────────────────────────────────────────────────────────────
    // Tab Panel 1 — Business Info Form  [ref_24 – ref_58]
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('Tab Panel 1 — Business Info Form [ref_24 – ref_58]', () => {

        // ── Element visibility (shared page, navigate once) ───────────────────

        test.describe('Element Visibility', () => {
            test.describe.configure({ mode: 'serial' });

            let infoPage: RegistrationInfoPage;

            test.beforeAll(async ({ browser }, workerInfo) => {
                test.setTimeout(120_000);
                ({ infoPage } = await navigateToInfoStep(browser, workerInfo.workerIndex));
            });

            test('should display the tab panel container [ref_24]', { annotation: [{ type: 'testcase', description: "RI-19: Display the tab panel container" }] }, async () => {
                await expect(infoPage.page.getByRole('tabpanel').first()).toBeVisible();
            });

            test('should display the Business Info form element [ref_25]', { annotation: [{ type: 'testcase', description: "RI-20: Display the Business Info form element" }] }, async () => {
                await expect(infoPage.page.locator('form').first()).toBeVisible();
            });

            // ── Profile Type [ref_26 – ref_39] ───────────────────────────────

            test('should display the Profile Type label [ref_26]', { annotation: [{ type: 'testcase', description: "RI-21: Display the Profile Type label" }] }, async () => {
                await expect(infoPage.profileTypeLabel).toContainText(' نوع الحساب ');
            });

            test('should display the Profile Type radiogroup [ref_27]', { annotation: [{ type: 'testcase', description: "RI-22: Display the Profile Type radiogroup" }] }, async () => {
                await expect(infoPage.profileTypeGroup).toBeVisible();
            });

            test('should display exactly two Profile Type options', { annotation: [{ type: 'testcase', description: "RI-23: Display exactly two Profile Type options" }] }, async () => {
                await expect(infoPage.profileTypeGroup.getByRole('radio')).toHaveCount(2);
            });

            test('should display the Merchant radio option [ref_28]', { annotation: [{ type: 'testcase', description: "RI-24: Display the Merchant radio option" }] }, async () => {
                await expect(infoPage.merchantButton).toBeVisible();
            });

            test('should display the Merchant label and description [ref_29, ref_30]', { annotation: [{ type: 'testcase', description: "RI-25: Display the Merchant label and description" }] }, async () => {
                await expect(infoPage.merchantButton.locator('.mp-rc-title')).toContainText(' تاجر ');
                await expect(infoPage.merchantButton.locator('.mp-rc-sub')).toContainText('استقبل المدفوعات وأدر متجرك.');
            });

            test('should display the Freelancer radio option [ref_37]', { annotation: [{ type: 'testcase', description: "RI-26: Display the Freelancer radio option" }] }, async () => {
                await expect(infoPage.freelancerCard).toBeVisible();
            });

            test('should display the Freelancer label and description [ref_38, ref_39]', { annotation: [{ type: 'testcase', description: "RI-27: Display the Freelancer label and description" }] }, async () => {
                await expect(infoPage.freelancerCard.locator('.mp-rc-title')).toContainText(' مستقل ');
                await expect(infoPage.freelancerCard.locator('.mp-rc-sub')).toContainText(' قريباً للمهنيين الأفراد. ');
            });

            // ── Unified Number / CRN [ref_40 – ref_43] ───────────────────────

            test('should display the Unified Number label [ref_40]', { annotation: [{ type: 'testcase', description: "RI-28: Display the Unified Number label" }] }, async () => {
                await expect(infoPage.crnLabel).toContainText('الرقم الموحد للشركة');
            });

            test('should display the Unified Number tooltip button [ref_41]', { annotation: [{ type: 'testcase', description: "RI-29: Display the Unified Number tooltip button" }] }, async () => {
                await expect(infoPage.crnTooltipButton).toBeVisible();
            });

            test('should display the Unified Number input wrapper [ref_42]', { annotation: [{ type: 'testcase', description: "RI-30: Display the Unified Number input wrapper" }] }, async () => {
                await expect(infoPage.crnGroup).toBeVisible();
            });

            test('should display the Unified Number textbox with correct placeholder [ref_43]', { annotation: [{ type: 'testcase', description: "RI-31: Display the Unified Number textbox with correct placeholder" }] }, async () => {
                await expect(infoPage.crnInput).toHaveAttribute('placeholder', 'مثال: 7001234567');
            });

            // ── National ID / Iqama [ref_45 – ref_48] ────────────────────────

            test('should display the National ID/Iqama label [ref_45]', { annotation: [{ type: 'testcase', description: "RI-32: Display the National ID/Iqama label" }] }, async () => {
                await expect(infoPage.idLabel).toContainText('رقم الهوية الوطنية / الإقامة');
            });

            test('should display the National ID/Iqama tooltip button [ref_46]', { annotation: [{ type: 'testcase', description: "RI-33: Display the National ID/Iqama tooltip button" }] }, async () => {
                await expect(infoPage.idTooltipButton).toBeVisible();
            });

            test('should display the National ID/Iqama input wrapper [ref_47]', { annotation: [{ type: 'testcase', description: "RI-34: Display the National ID/Iqama input wrapper" }] }, async () => {
                await expect(infoPage.idGroup).toBeVisible();
            });

            test('should display the National ID/Iqama textbox with correct placeholder [ref_48]', { annotation: [{ type: 'testcase', description: "RI-35: Display the National ID/Iqama textbox with correct placeholder" }] }, async () => {
                await expect(infoPage.idInput).toHaveAttribute('placeholder', 'مثال: 1012345678');
            });

            // ── Email [ref_50 – ref_51] ───────────────────────────────────────

            test('should display the Email label [ref_50]', { annotation: [{ type: 'testcase', description: "RI-36: Display the Email label" }] }, async () => {
                await expect(infoPage.emailLabel).toContainText('البريد الإلكتروني');
            });

            test('should display the Email textbox with correct placeholder [ref_51]', { annotation: [{ type: 'testcase', description: "RI-37: Display the Email textbox with correct placeholder" }] }, async () => {
                await expect(infoPage.emailInput).toHaveAttribute('placeholder', 'مثال: example@email.com');
            });

            // ── Next button [ref_53] ──────────────────────────────────────────

            test('should display the Next button [ref_53]', { annotation: [{ type: 'testcase', description: "RI-38: Display the Next button" }] }, async () => {
                await expect(infoPage.nextButton).toBeVisible();
                await expect(infoPage.nextButton).toContainText('التالي');
            });

            // ── Footer [ref_54 – ref_58] ──────────────────────────────────────

            test('should display "Already have an account?" text [ref_54]', { annotation: [{ type: 'testcase', description: "RI-39: Display \"Already have an account?\" text" }] }, async () => {
                await expect(infoPage.alreadyHaveAccountText).toContainText(' لديك حساب بالفعل؟ ');
            });

            test('should display the Log In link [ref_55]', { annotation: [{ type: 'testcase', description: "RI-40: Display the Log In link" }] }, async () => {
                await expect(infoPage.loginLink).toContainText('تسجيل الدخول');
            });

            test('should display "By continuing, you agree to our" text [ref_56]', { annotation: [{ type: 'testcase', description: "RI-41: Display \"By continuing, you agree to our\" text" }] }, async () => {
                await expect(
                    infoPage.page.locator('#login-line span', { hasText: ' بالمتابعة، فإنك توافق على ' }).first()
                ).toBeVisible();
            });

            test('should display Terms & Conditions reference [ref_57]', { annotation: [{ type: 'testcase', description: "RI-42: Display Terms & Conditions reference" }] }, async () => {
                await expect(infoPage.footer).toContainText(' الشروط والأحكام ');
            });

            test('should display Privacy Policy reference [ref_58]', { annotation: [{ type: 'testcase', description: "RI-43: Display Privacy Policy reference" }] }, async () => {
                await expect(infoPage.footer).toContainText(' سياسة الخصوصية ');
            });
        });

        // ── Field interactions (fresh page per test) ──────────────────────────

        test.describe('Field Interactions', () => {

            let currentAsset: typeof RESIDENT_ASSETS[number];
            let infoPage: RegistrationInfoPage;

            test.beforeEach(async ({ page, context }, testInfo) => {
                test.setTimeout(120_000);
                currentAsset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
                await goToInfoStep(page, currentAsset.mobile);
                await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 });
                infoPage = new RegistrationInfoPage(page);
                await infoPage.crnInput.clear();
                await infoPage.idInput.clear();
                await infoPage.emailInput.clear();
            });

            test('should allow selecting Merchant profile type [ref_28]', { annotation: [{ type: 'testcase', description: "RI-44: Allow selecting Merchant profile type" }] }, async () => {
                await infoPage.merchantButton.click();
                await expect(infoPage.merchantButton).toHaveAttribute('aria-checked', 'true');
            });

            test('should not allow selecting Freelancer profile type — disabled as "Coming Soon" [ref_37]', { annotation: [{ type: 'testcase', description: "RI-45: Not allow selecting Freelancer profile type — disabled as \"Coming Soon\"" }] }, async () => {
                // The card is genuinely disabled, so a plain click() would hang on
                // Playwright's actionability check; force it through and confirm
                // the click was a no-op.
                await infoPage.freelancerCard.click({ force: true });
                await expect(infoPage.freelancerCard).not.toHaveAttribute('aria-checked', 'true');
            });

            test('should accept input in the Unified Number field [ref_43]', { annotation: [{ type: 'testcase', description: "RI-46: Accept input in the Unified Number field" }] }, async () => {
                await infoPage.crnInput.fill(currentAsset.crn);
                await expect(infoPage.crnInput).toHaveValue(currentAsset.crn);
            });

            test('should display the Clear button for Unified Number after entry [ref_44]', { annotation: [{ type: 'testcase', description: "RI-47: Display the Clear button for Unified Number after entry" }] }, async () => {
                await infoPage.crnInput.fill(currentAsset.crn);
                await expect(infoPage.crnClearButton).toBeVisible();
            });

            test('should accept input in the National ID/Iqama field [ref_48]', { annotation: [{ type: 'testcase', description: "RI-48: Accept input in the National ID/Iqama field" }] }, async () => {
                await infoPage.idInput.fill(currentAsset.nationalId);
                await expect(infoPage.idInput).toHaveValue(currentAsset.nationalId);
            });

            test('should accept input in the Email field [ref_51]', { annotation: [{ type: 'testcase', description: "RI-49: Accept input in the Email field" }] }, async () => {
                await infoPage.emailInput.fill('test@example.com');
                await expect(infoPage.emailInput).toHaveValue('test@example.com');
            });

            test('should have the Next button disabled when form is incomplete [ref_53]', { annotation: [{ type: 'testcase', description: "RI-50: Have the Next button disabled when form is incomplete" }] }, async () => {
                await expect(infoPage.nextButton).toBeDisabled();
            });

            test('should enable the Next button when all fields are filled with valid data [ref_53]', { annotation: [{ type: 'testcase', description: "RI-51: Enable the Next button when all fields are filled with valid data" }] }, async () => {
                await infoPage.fill(infoPage.merchantButton, currentAsset.crn, currentAsset.nationalId, generateEmail());
                await expect(infoPage.nextButton).toBeEnabled();
            });
        });
    });

});
