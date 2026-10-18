import { test, expect } from '@playwright/test';
import { RESIDENT_ASSETS, generateEmail, nextResidentAsset } from '../../helpers/RegistrationHelper';
import { PROFILE_MERCHANT, PROFILE_FREELANCER, CRN_INPUT, ID_INPUT, EMAIL_INPUT, NEXT_BTN, ACTIVE_STEP, FORM_TITLE, BUSINESS_INFO_TEXT, FINANCIAL_TITLE_TEXT, MONTHLY_EXPECTED_NUMBER, NAFATH_TEXT, NEXT_BTN_NAME, BACK_BTN_NAME, Asset, gotoTab1, fillTab1AndAdvance } from '../../helpers/infoStepForm';

test.describe('Registration – Tab 1 → Tab 2 Transition', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }) => {
        test.setTimeout(120_000);
        // Round-robin via nextResidentAsset() rather than the fixed
        // RESIDENT_ASSETS[workerIndex % length] lookup — that pattern can hand out an
        // identity another describe block/spec file already pushed past Financial &
        // Business (see project_resident_assets_worker_index_races memory), landing on
        // Products instead of Financial and breaking every test in this block that
        // expects fillTab1AndAdvance() to reach Tab 2. Confirmed reproducing 2026-08-18:
        // "should stay on the /register URL after advancing to Tab 2" timed out waiting
        // for the Financial field because its worker-indexed asset had already resumed
        // to Products. nextResidentAsset() skips assets already flagged used, so this
        // always gets an account that hasn't registered before.
        asset = nextResidentAsset();
        await gotoTab1(page, context, asset);
    });

    // Happy – all profile types

    test.skip('should advance to Tab 2 with Freelancer profile', { annotation: [{ type: 'testcase', description: "RI-112: Advance to Tab 2 with Freelancer profile" }] }, async ({ page }) => {
        await fillTab1AndAdvance(page, asset, PROFILE_FREELANCER);
        await expect(page.locator(FORM_TITLE)).toContainText(FINANCIAL_TITLE_TEXT);
    });

    test('should stay on the /register URL after advancing to Tab 2', { annotation: [{ type: 'testcase', description: "RI-113: Stay on the /register URL after advancing to Tab 2" }] }, async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        expect(page.url()).toContain('/business/auth/register');
    });

    // Tab 2 elements present
    test('should show the Monthly Expected Number of Bills field on Tab 2', { annotation: [{ type: 'testcase', description: "RI-114: Show the Monthly Expected Number of Bills field on Tab 2" }] }, async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        await expect(page.getByRole('textbox', { name: MONTHLY_EXPECTED_NUMBER })).toBeVisible();
    });

    test('should show the Next button on Tab 2', { annotation: [{ type: 'testcase', description: "RI-115: Show the Next button on Tab 2" }] }, async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        await expect(page.getByRole('button', { name: NEXT_BTN_NAME })).toBeVisible();
    });

    test('should show the Back button on Tab 2', { annotation: [{ type: 'testcase', description: "RI-116: Show the Back button on Tab 2" }] }, async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        await expect(page.getByRole('button', { name: BACK_BTN_NAME })).toBeVisible();
    });

    // Negative – backend rejection
    test('should not reach Tab 2 when an unrecognised CRN / National ID pair is submitted', { annotation: [{ type: 'testcase', description: "RI-117: Not reach Tab 2 when an unrecognised CRN / National ID pair is submitted" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill('9999999999');
        await page.locator(ID_INPUT).fill('9999999999');
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await expect(page.locator(NEXT_BTN)).toBeEnabled({ timeout: 10000 });
        await page.locator(NEXT_BTN).click();
        await page.getByRole('button', { name: /Loading|جاري التحميل/i })
            .waitFor({ state: 'hidden', timeout: 20000 })
            .catch(() => {});
        await expect(
            page.getByRole('textbox', { name: MONTHLY_EXPECTED_NUMBER })
        ).not.toBeVisible({ timeout: 10000 });
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Back Navigation – state preservation
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Back Navigation (Tab 2 → Tab 1)', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;
    let emailUsed: string;

    test.beforeEach(async ({ page, context }) => {
        test.setTimeout(120_000);
        // Round-robin via nextResidentAsset() rather than the fixed
        // RESIDENT_ASSETS[workerIndex % length] lookup used elsewhere in this file —
        // that pattern can hand out an identity another describe block/spec file has
        // already pushed past Financial & Business (see project_resident_assets_worker_index_races
        // memory), which breaks this test's Tab-2-then-Back flow. nextResidentAsset()
        // skips assets already flagged used, so this always gets a fresh mobile.
        asset = nextResidentAsset();
        emailUsed = generateEmail();
        await gotoTab1(page, context, asset);
        // Fill with Merchant so profile type can be checked on return
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill(emailUsed);
        await expect(page.locator(NEXT_BTN)).toBeEnabled({ timeout: 10000 });
        await page.locator(NEXT_BTN).click();
        await page.getByRole('button', { name: /Loading|جاري التحميل/i })
            .waitFor({ state: 'hidden', timeout: 20000 })
            .catch(() => {});
        await page.getByRole('textbox', { name: MONTHLY_EXPECTED_NUMBER })
            .waitFor({ state: 'visible', timeout: 30000 });
    });

    test('should keep Next enabled on Tab 1 after going Back', { annotation: [{ type: 'testcase', description: "RI-118: Keep Next enabled on Tab 1 after going Back" }] }, async ({ page }) => {
        await page.getByRole('button', { name: BACK_BTN_NAME }).click();
        await expect(page.locator(NEXT_BTN)).toBeEnabled({ timeout: 10000 });
    });

    test.skip('should successfully re-advance to Tab 2 after going Back and clicking Next', { annotation: [{ type: 'testcase', description: "RI-119: Successfully re-advance to Tab 2 after going Back and clicking Next" }] }, async ({ page }) => {
        await page.getByRole('button', { name: BACK_BTN_NAME }).click();
        await page.locator(NEXT_BTN).click();
        await page.getByRole('button', { name: /Loading|جاري التحميل/i })
            .waitFor({ state: 'hidden', timeout: 20000 })
            .catch(() => {});
        await expect(page.locator(FORM_TITLE)).toContainText(FINANCIAL_TITLE_TEXT, { timeout: 15000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Step Indicator Progression
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Step Indicator Progression', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should show "Business Info" as the active inner step on load', { annotation: [{ type: 'testcase', description: "RI-120: Show \"Business Info\" as the active inner step on load" }] }, async ({ page }) => {
        await expect(page.locator(ACTIVE_STEP).first()).toContainText(BUSINESS_INFO_TEXT);
    });

    test('should not show NAFATH as active while on Tab 1', { annotation: [{ type: 'testcase', description: "RI-121: Not show NAFATH as active while on Tab 1" }] }, async ({ page }) => {
        await expect(page.locator(ACTIVE_STEP).first()).not.toContainText(NAFATH_TEXT);
    });
});
