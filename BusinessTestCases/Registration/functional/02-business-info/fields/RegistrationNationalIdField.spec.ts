import { test, expect } from '@playwright/test';
import { RESIDENT_ASSETS, generateEmail } from '../../../helpers/RegistrationHelper';
import { PROFILE_MERCHANT, CRN_INPUT, ID_INPUT, EMAIL_INPUT, NEXT_BTN, CLEAR_BTN_NAME, Asset, gotoTab1, fillTab1 } from '../../../helpers/infoStepForm';

// ─────────────────────────────────────────────────────────────────────────────
// 3. National ID / Iqama Field
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – National ID / Iqama Field', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    // Happy
    test('should accept a valid National ID and retain the value', { annotation: [{ type: 'testcase', description: "RI-68: Accept a valid National ID and retain the value" }] }, async ({ page }) => {
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await expect(page.locator(ID_INPUT)).toHaveValue(asset.nationalId);
    });

    test('should be empty on initial page load', { annotation: [{ type: 'testcase', description: "RI-69: Be empty on initial page load" }] }, async ({ page }) => {
        await expect(page.locator(ID_INPUT)).toHaveValue('');
    });

    test('should show the Clear button after a value is entered', { annotation: [{ type: 'testcase', description: "RI-70: Show the Clear button after a value is entered" }] }, async ({ page }) => {
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await expect(
            page.locator('#register-id-group').getByRole('button', { name: CLEAR_BTN_NAME })
        ).toBeVisible();
    });

    test('should clear the National ID field when the Clear button is clicked', { annotation: [{ type: 'testcase', description: "RI-71: Clear the National ID field when the Clear button is clicked" }] }, async ({ page }) => {
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator('#register-id-group').getByRole('button', { name: CLEAR_BTN_NAME }).click();
        await expect(page.locator(ID_INPUT)).toHaveValue('');
    });

    test('should hide the Clear button after the field is emptied via Clear', { annotation: [{ type: 'testcase', description: "RI-72: Hide the Clear button after the field is emptied via Clear" }] }, async ({ page }) => {
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator('#register-id-group').getByRole('button', { name: CLEAR_BTN_NAME }).click();
        await expect(
            page.locator('#register-id-group').getByRole('button', { name: CLEAR_BTN_NAME })
        ).not.toBeVisible();
    });

    test('should keep Next disabled when National ID is cleared after full form fill', { annotation: [{ type: 'testcase', description: "RI-73: Keep Next disabled when National ID is cleared after full form fill" }] }, async ({ page }) => {
        await fillTab1(page, asset);
        await page.locator('#register-id-group').getByRole('button', { name: CLEAR_BTN_NAME }).click();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Negative – character filtering
    test('should not retain alphabetic characters in the National ID field', { annotation: [{ type: 'testcase', description: "RI-74: Not retain alphabetic characters in the National ID field" }] }, async ({ page }) => {
        await page.locator(ID_INPUT).pressSequentially('ABCDEFGHIJ');
        const value = await page.locator(ID_INPUT).inputValue();
        expect(/[a-zA-Z]/.test(value)).toBe(false);
    });

    test('should not retain special characters in the National ID field', { annotation: [{ type: 'testcase', description: "RI-75: Not retain special characters in the National ID field" }] }, async ({ page }) => {
        await page.locator(ID_INPUT).pressSequentially('!@#$%^&*()');
        const value = await page.locator(ID_INPUT).inputValue();
        expect(/[!@#$%^&*()]/.test(value)).toBe(false);
    });

    // Security

    test('should not execute a javascript: URI entered in the National ID field', { annotation: [{ type: 'testcase', description: "RI-77: Not execute a javascript: URI entered in the National ID field" }] }, async ({ page }) => {
        let alertFired = false;
        page.once('dialog', dialog => { alertFired = true; dialog.dismiss(); });
        await page.locator(ID_INPUT).fill('javascript:alert(1)');
        await page.waitForTimeout(500);
        expect(alertFired).toBe(false);
    });

    // Boundary
    test('should handle a 1000-character input without crashing', { annotation: [{ type: 'testcase', description: "RI-78: Handle a 1000-character input without crashing" }] }, async ({ page }) => {
        await page.locator(ID_INPUT).fill('1'.repeat(1000));
        await expect(page.locator(ID_INPUT)).toBeVisible();
    });

    // Documented spec (EMI Validation confluence page): National ID must be exactly
    // 10 digits and start with 1 (Saudi) or 2 (non-Saudi/resident).
    test.skip('should keep Next disabled when National ID starts with a digit other than 1 or 2', { annotation: [{ type: 'testcase', description: "RI-79: Keep Next disabled when National ID starts with a digit other than 1 or 2" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill('9123456789'); // 10 digits, but starts with 9
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should not allow more than 10 digits in the National ID field', { annotation: [{ type: 'testcase', description: "RI-80: Not allow more than 10 digits in the National ID field" }] }, async ({ page }) => {
        const input = page.locator(ID_INPUT);
        await input.pressSequentially('12345678901', { delay: 10 });
        const value = await input.inputValue();
        expect(value.length).toBeLessThanOrEqual(10);
    });
});
