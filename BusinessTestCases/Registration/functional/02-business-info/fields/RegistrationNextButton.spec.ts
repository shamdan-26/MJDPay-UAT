import { test, expect } from '@playwright/test';
import { RESIDENT_ASSETS, generateEmail } from '../../../helpers/RegistrationHelper';
import { PROFILE_MERCHANT, PROFILE_FREELANCER, CRN_INPUT, ID_INPUT, EMAIL_INPUT, NEXT_BTN, ACTIVE_STEP, CLEAR_BTN_NAME, BUSINESS_INFO_TEXT, Asset, gotoTab1, fillTab1 } from '../../../helpers/infoStepForm';

// ─────────────────────────────────────────────────────────────────────────────
// 5. Next Button Enable / Disable Logic
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Next Button Enable/Disable Logic', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    // All-empty
    test('should be disabled when all fields are empty', { annotation: [{ type: 'testcase', description: "RI-97: Be disabled when all fields are empty" }] }, async ({ page }) => {
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Single-field filled
    test('should be disabled when only Profile Type is selected', { annotation: [{ type: 'testcase', description: "RI-98: Be disabled when only Profile Type is selected" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should be disabled when only CRN is filled', { annotation: [{ type: 'testcase', description: "RI-99: Be disabled when only CRN is filled" }] }, async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should be disabled when only National ID is filled', { annotation: [{ type: 'testcase', description: "RI-100: Be disabled when only National ID is filled" }] }, async ({ page }) => {
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should be disabled when only Email is filled', { annotation: [{ type: 'testcase', description: "RI-101: Be disabled when only Email is filled" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user@example.com');
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Two fields filled
    test('should be disabled with Profile Type + CRN only', { annotation: [{ type: 'testcase', description: "RI-102: Be disabled with Profile Type + CRN only" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should be disabled with Profile Type + National ID only', { annotation: [{ type: 'testcase', description: "RI-103: Be disabled with Profile Type + National ID only" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should be disabled with Profile Type + Email only', { annotation: [{ type: 'testcase', description: "RI-104: Be disabled with Profile Type + Email only" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(EMAIL_INPUT).fill('user@example.com');
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Three fields filled
    test('should be disabled with Profile Type + CRN + National ID (no email)', { annotation: [{ type: 'testcase', description: "RI-105: Be disabled with Profile Type + CRN + National ID (no email)" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test.skip('should be disabled with CRN + National ID + Email (no profile type)', { annotation: [{ type: 'testcase', description: "RI-106: Be disabled with CRN + National ID + Email (no profile type)" }] }, async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill('user@example.com');
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Enabled – all 4 profile types
    test('should be enabled when all fields are filled with Merchant profile', { annotation: [{ type: 'testcase', description: "RI-107: Be enabled when all fields are filled with Merchant profile" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
    });

    test.skip('should be enabled when all fields are filled with Freelancer profile', { annotation: [{ type: 'testcase', description: "RI-108: Be enabled when all fields are filled with Freelancer profile" }] }, async ({ page }) => {
        await page.locator(PROFILE_FREELANCER).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
    });

    // Re-disable after clearing
    test('should become disabled again after clearing the CRN from a complete form', { annotation: [{ type: 'testcase', description: "RI-109: Become disabled again after clearing the CRN from a complete form" }] }, async ({ page }) => {
        await fillTab1(page, asset);
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
        await page.locator('#register-unifiedNumber-group').getByRole('button', { name: CLEAR_BTN_NAME }).click();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should become disabled again after clearing the National ID from a complete form', { annotation: [{ type: 'testcase', description: "RI-110: Become disabled again after clearing the National ID from a complete form" }] }, async ({ page }) => {
        await fillTab1(page, asset);
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
        await page.locator('#register-id-group').getByRole('button', { name: CLEAR_BTN_NAME }).click();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should not advance to Tab 2 when Next is force-clicked while disabled', { annotation: [{ type: 'testcase', description: "RI-111: Not advance to Tab 2 when Next is force-clicked while disabled" }] }, async ({ page }) => {
        await page.locator(NEXT_BTN).click({ force: true });
        await expect(page.locator(ACTIVE_STEP).first()).toContainText(BUSINESS_INFO_TEXT, { timeout: 5000 });
    });
});
