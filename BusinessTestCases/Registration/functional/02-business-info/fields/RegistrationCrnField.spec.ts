import { test, expect } from '@playwright/test';
import { RESIDENT_ASSETS, generateEmail } from '../../../helpers/RegistrationHelper';
import { PROFILE_MERCHANT, CRN_INPUT, ID_INPUT, EMAIL_INPUT, NEXT_BTN, CLEAR_BTN_NAME, Asset, gotoTab1, fillTab1 } from '../../../helpers/infoStepForm';

// ─────────────────────────────────────────────────────────────────────────────
// 2. Unified Number (CRN) Field
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Unified Number (CRN) Field', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    // Happy
    test('should accept a valid CRN and retain the value', { annotation: [{ type: 'testcase', description: "RI-55: Accept a valid CRN and retain the value" }] }, async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await expect(page.locator(CRN_INPUT)).toHaveValue(asset.crn);
    });

    test('should be empty on initial page load', { annotation: [{ type: 'testcase', description: "RI-56: Be empty on initial page load" }] }, async ({ page }) => {
        await expect(page.locator(CRN_INPUT)).toHaveValue('');
    });

    test('should show the Clear button after a value is entered', { annotation: [{ type: 'testcase', description: "RI-57: Show the Clear button after a value is entered" }] }, async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await expect(
            page.locator('#register-unifiedNumber-group').getByRole('button', { name: CLEAR_BTN_NAME })
        ).toBeVisible();
    });

    test('should clear the CRN field when the Clear button is clicked', { annotation: [{ type: 'testcase', description: "RI-58: Clear the CRN field when the Clear button is clicked" }] }, async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator('#register-unifiedNumber-group').getByRole('button', { name: CLEAR_BTN_NAME }).click();
        await expect(page.locator(CRN_INPUT)).toHaveValue('');
    });

    test('should hide the Clear button after the field is emptied via Clear', { annotation: [{ type: 'testcase', description: "RI-59: Hide the Clear button after the field is emptied via Clear" }] }, async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator('#register-unifiedNumber-group').getByRole('button', { name: CLEAR_BTN_NAME }).click();
        await expect(
            page.locator('#register-unifiedNumber-group').getByRole('button', { name: CLEAR_BTN_NAME })
        ).not.toBeVisible();
    });

    // Negative – character filtering
    test('should not retain alphabetic characters in the CRN field', { annotation: [{ type: 'testcase', description: "RI-60: Not retain alphabetic characters in the CRN field" }] }, async ({ page }) => {
        await page.locator(CRN_INPUT).pressSequentially('ABCDEFGHIJ');
        const value = await page.locator(CRN_INPUT).inputValue();
        expect(/[a-zA-Z]/.test(value)).toBe(false);
    });

    test('should not retain special characters in the CRN field', { annotation: [{ type: 'testcase', description: "RI-61: Not retain special characters in the CRN field" }] }, async ({ page }) => {
        await page.locator(CRN_INPUT).pressSequentially('@#$%^&*()!');
        const value = await page.locator(CRN_INPUT).inputValue();
        expect(/[@#$%^&*()!]/.test(value)).toBe(false);
    });

    test('should keep Next disabled when CRN is cleared after full form fill', { annotation: [{ type: 'testcase', description: "RI-62: Keep Next disabled when CRN is cleared after full form fill" }] }, async ({ page }) => {
        await fillTab1(page, asset);
        await page.locator('#register-unifiedNumber-group').getByRole('button', { name: CLEAR_BTN_NAME }).click();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Security

    test('should handle a 1000-character input without crashing', { annotation: [{ type: 'testcase', description: "RI-64: Handle a 1000-character input without crashing" }] }, async ({ page }) => {
        await page.locator(CRN_INPUT).fill('1'.repeat(1000));
        await expect(page.locator(CRN_INPUT)).toBeVisible();
    });

    // Boundary – documented spec: CRN must be 10-15 digits (EMI Validation confluence page)
    test('should not allow more than 15 digits in the CRN field', { annotation: [{ type: 'testcase', description: "RI-65: Not allow more than 15 digits in the CRN field" }] }, async ({ page }) => {
        const input = page.locator(CRN_INPUT);
        await input.pressSequentially('1234567890123456', { delay: 10 });
        const value = await input.inputValue();
        expect(value.length).toBeLessThanOrEqual(15);
    });

    test('should keep Next disabled when CRN is shorter than the minimum 10 digits', { annotation: [{ type: 'testcase', description: "RI-66: Keep Next disabled when CRN is shorter than the minimum 10 digits" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill('123456789'); // 9 digits — below the documented 10-char minimum
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should enable Next when CRN is exactly 15 digits (maximum valid length)', { annotation: [{ type: 'testcase', description: "RI-67: Enable Next when CRN is exactly 15 digits (maximum valid length)" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill('123456789012345'); // 15 digits — the documented maximum
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await expect(page.locator(NEXT_BTN)).toBeEnabled({ timeout: 10000 });
    });
});
