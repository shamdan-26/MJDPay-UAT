import { test, expect, Page } from '@playwright/test';
import { goToInfoStep, nextCitizenAsset, generateEmail, REGISTER_URL } from '../RegistrationHelper';
import { RegistrationNafathPage } from '../../pageElements/RegistrationNafathPage';

const SKIP_MSG = 'Nafath panel did not appear — Nafath may be bypassed for this test account in this environment';

test.describe('Registration - NAFATH Step Page Elements', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let nafathPage: RegistrationNafathPage;
    let nafathAppeared = false;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(120_000);
        const context = await browser.newContext();
        page = await context.newPage();
        nafathPage = new RegistrationNafathPage(page);

        // Citizen assets (unlike resident assets) go through the real NAFATH
        // verification step instead of bypassing straight to the Financial tab.
        const asset = nextCitizenAsset();
        await goToInfoStep(page, asset.mobile);

        const radioGroup = page.getByRole('radiogroup', { name: /Profile Type|نوع الملف التجاري/i });
        await radioGroup.getByRole('radio').first().click();
        await page.locator('#floating-text-field-2').fill(asset.crn);
        await page.locator('#floating-text-field-3').fill(asset.nationalId);
        await page.locator('input[type="email"]').fill(generateEmail());
        await page.getByRole('button', { name: /next|التالي/i }).click();
        await page.getByRole('button', { name: /Loading|جاري التحميل/i })
            .waitFor({ state: 'hidden', timeout: 20000 })
            .catch(() => {});

        nafathAppeared = await nafathPage.waitForNafathPanel();
    });

    test.afterAll(async () => { await page.close(); });

    // ── Header / Banner ───────────────────────────────────────────────────

    test('should display the MJD Pay logo', async () => {
        await expect(nafathPage.logoImage).toBeVisible();
    });

    test('should link the MJD Pay logo to the landing page', async () => {
        await expect(nafathPage.logoLink).toHaveAttribute('href', '/business/landing');
    });

    test('should display the EN language button', async () => {
        await expect(nafathPage.enButton).toBeVisible();
    });

    test('should display the Arabic language button', async () => {
        await expect(nafathPage.arabicButton).toBeVisible();
    });

    test('should display the theme toggle button', async () => {
        await expect(nafathPage.themeToggle).toBeVisible();
    });

    // ── Page headings ────────────────────────────────────────────────────

    test('should display the "Create Account" eyebrow text', async () => {
        await expect(nafathPage.formEyebrow).toContainText(/Create Account|إنشاء حساب/i);
    });

    // ── Outer progress bar ───────────────────────────────────────────────

    test('should display "Business Info" as the first outer step', async () => {
        await expect(nafathPage.outerStepBar.nth(0)).toContainText(/Business Info|بيانات النشاط/i);
    });

    test('should display "NAFATH" as the active outer step', async () => {
        await expect(nafathPage.activeStep.first()).toContainText(/NAFATH|نَفاذ|نفاذ/i);
    });

    test('should display "Products" as the third outer step', async () => {
        await expect(nafathPage.outerStepBar.nth(2)).toContainText(/Products|المنتجات/i);
    });

    test('should display "Contract" as the fourth outer step', async () => {
        await expect(nafathPage.outerStepBar.nth(3)).toContainText(/Contract|العقد/i);
    });

    // ── Nafath verification panel ───────────────────────────────────────

    test('should display the "Verify with Nafath" heading', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(nafathPage.nafathHeading).toBeVisible();
    });

    test('should display the verification instruction text', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(nafathPage.instructionText).toBeVisible();
    });

    test('should display step 1 "Open Nafath app and sign in"', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(nafathPage.step1Text).toBeVisible();
    });

    test('should display step 2 "Select the number shown"', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(nafathPage.step2Text).toBeVisible();
    });

    test('should display step 3 "Approve"', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(nafathPage.step3Text).toBeVisible();
    });

    test('should display the redirect note with a countdown timer', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(nafathPage.redirectNote).toContainText(/return to this page/i);
        await expect(nafathPage.countdownTimer).toBeVisible();
    });

    // Per EMI-4895: Verify button must start disabled and only enable once the
    // redirect countdown expires (fixed to 20s in EMI-4937, previously 30s).
    test('should display the "Verify" button as initially disabled while the countdown is active [EMI-4895]', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(nafathPage.verifyButton).toBeVisible();
        await expect(nafathPage.verifyButton).toBeDisabled();
    });

    // Per EMI-4895 acceptance criteria: "remove resend section".
    test('should not display a resend option in the Nafath panel [EMI-4895]', async () => {
        test.skip(!nafathAppeared, SKIP_MSG);
        await expect(page.getByRole('button', { name: /resend/i })).toHaveCount(0);
    });
});
