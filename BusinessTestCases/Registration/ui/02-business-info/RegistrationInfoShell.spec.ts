import { test, expect, Page, Browser } from '@playwright/test';
import { goToInfoStepMocked, RESIDENT_ASSETS } from '../../helpers/RegistrationHelper';
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

test.describe('Registration - Info Page — Shell', { tag: ['@registration', '@business-info', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    // ─────────────────────────────────────────────────────────────────────────
    // Header / Banner  [ref_1 – ref_7]
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('Header & Banner [ref_1 – ref_7]', () => {
        test.describe.configure({ mode: 'serial' });

        let infoPage: RegistrationInfoPage;

        test.beforeAll(async ({ browser }, workerInfo) => {
            test.setTimeout(120_000);
            ({ infoPage } = await navigateToInfoStep(browser, workerInfo.workerIndex));
        });

        test('should display the Change Language group [ref_4]', { annotation: [{ type: 'testcase', description: "RI-03: Display the Change Language group" }] }, async () => {
            await expect(infoPage.page.getByRole('group', { name: /change language/i })).toBeVisible();
        });

    });

// ─────────────────────────────────────────────────────────────────────────
    // Main Content, Headings & Outer Progress Bar  [ref_8 – ref_15]
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('Main Content, Headings & Progress Bar [ref_8 – ref_15]', () => {
        test.describe.configure({ mode: 'serial' });

        let infoPage: RegistrationInfoPage;

        test.beforeAll(async ({ browser }, workerInfo) => {
            test.setTimeout(120_000);
            ({ infoPage } = await navigateToInfoStep(browser, workerInfo.workerIndex));
        });

        test('should display the main page container [ref_8]', { annotation: [{ type: 'testcase', description: "RI-07: Display the main page container" }] }, async () => {
            await expect(infoPage.page.locator('main')).toBeVisible();
        });

        test('should display the "Create Account" eyebrow text [ref_9]', { annotation: [{ type: 'testcase', description: "RI-08: Display the \"Create Account\" eyebrow text" }] }, async () => {
            await expect(infoPage.formEyebrow).toContainText(' إنشاء حساب');
        });

        test('should display the "Tell us about your business" heading [ref_10]', { annotation: [{ type: 'testcase', description: "RI-09: Display the \"Tell us about your business\" heading" }] }, async () => {
            await expect(infoPage.formTitle).toContainText(' أخبرنا عن نشاطك التجاري ');
        });

        test('should display "1" as the active step number [ref_11]', { annotation: [{ type: 'testcase', description: "RI-10: Display \"1\" as the active step number" }] }, async () => {
            const activeStep = infoPage.outerStepBar.nth(0);
            await expect(activeStep.locator('.mp-step-meta .mp-step-num')).toContainText('1');
        });

        test('should display "Business Info" as the active outer step [ref_12]', { annotation: [{ type: 'testcase', description: "RI-11: Display \"Business Info\" as the active outer step" }] }, async () => {
            const step = infoPage.outerStepBar.nth(0);
            await expect(step).toHaveClass(/is-active/);
            await expect(step.locator('.mp-step-meta')).toContainText('1  بيانات النشاط التجاري');
        });

        test('should display "NAFATH" as the second outer step [ref_13]', { annotation: [{ type: 'testcase', description: "RI-12: Display \"NAFATH\" as the second outer step" }] }, async () => {
            await expect(infoPage.outerStepBar.nth(1).locator('.mp-step-meta')).toContainText(' 2  نفاذ  ');
        });

        test('should display "Products" as the third outer step [ref_14]', { annotation: [{ type: 'testcase', description: "RI-13: Display \"Products\" as the third outer step" }] }, async () => {
            await expect(infoPage.outerStepBar.nth(2).locator('.mp-step-meta')).toContainText(' المنتجات ');
        });

        test('should display "Contract" as the fourth outer step [ref_15]', { annotation: [{ type: 'testcase', description: "RI-14: Display \"Contract\" as the fourth outer step" }] }, async () => {
            await expect(infoPage.outerStepBar.nth(3).locator('.mp-step-meta')).toContainText(' العقد ');
        });
    });

// ─────────────────────────────────────────────────────────────────────────
    // Inner Tab Navigation  [ref_16 – ref_23]
    // ─────────────────────────────────────────────────────────────────────────

    test.describe('Inner Tab Navigation [ref_16 – ref_23]', () => {
        test.describe.configure({ mode: 'serial' });

        let infoPage: RegistrationInfoPage;

        test.beforeAll(async ({ browser }, workerInfo) => {
            test.setTimeout(120_000);
            ({ infoPage } = await navigateToInfoStep(browser, workerInfo.workerIndex));
        });

        test('should display the step bar [ref_16]', { annotation: [{ type: 'testcase', description: "RI-15: Display the step bar" }] }, async () => {
            await expect(infoPage.innerStepBar).toBeVisible();
        });

        test('should display Tab 1 — Business Info [ref_17, ref_19]', { annotation: [{ type: 'testcase', description: "RI-16: Display Tab 1 — Business Info" }] }, async () => {
            await expect(infoPage.page.locator('.mp-step.is-active', { hasText: ' بيانات النشاط التجاري ' }).first()).toBeVisible();
        });

        test('should display Tab 3 — Products [ref_22, ref_23]', { annotation: [{ type: 'testcase', description: "RI-17: Display Tab 3 — Products" }] }, async () => {
            await expect(infoPage.page.locator('.mp-step.ng-star-inserted', { hasText: ' المنتجات ' }).first()).toBeVisible();
        });

        test('should display Tab 4 — Contract [ref_24, ref_25]', { annotation: [{ type: 'testcase', description: "RI-18: Display Tab 4 — Contract" }] }, async () => {
            await expect(infoPage.page.locator('.mp-step.ng-star-inserted', { hasText: ' العقد' }).first()).toBeVisible();
        });
    });

});
