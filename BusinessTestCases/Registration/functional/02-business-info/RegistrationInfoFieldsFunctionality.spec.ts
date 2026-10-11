import { test, expect } from '@playwright/test';
import { RESIDENT_ASSETS, generateEmail } from '../../RegistrationHelper';
import { PROFILE_MERCHANT, PROFILE_FREELANCER, CRN_INPUT, ID_INPUT, EMAIL_INPUT, EMAIL_ERROR, NEXT_BTN, ACTIVE_STEP, CLEAR_BTN_NAME, BUSINESS_INFO_TEXT, Asset, gotoTab1, fillTab1 } from '../../helpers/infoStepForm';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Profile Type Selection
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Profile Type Selection', { tag: ['@registration', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    // Happy – individual selection
    test('should mark Merchant as aria-checked when selected', { annotation: [{ type: 'testcase', description: "RI-52: Mark Merchant as aria-checked when selected" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await expect(page.locator(PROFILE_MERCHANT)).toHaveAttribute('aria-checked', 'true');
    });

    // Freelancer is disabled ("Coming Soon") — Merchant is the only live profile type.
    // The card is genuinely disabled, so plain click() would hang on Playwright's
    // actionability check; force it through and confirm the click was a no-op.
    test('should not mark Freelancer as aria-checked when clicked (disabled)', { annotation: [{ type: 'testcase', description: "RI-53: Not mark Freelancer as aria-checked when clicked (disabled)" }] }, async ({ page }) => {
        await page.locator(PROFILE_FREELANCER).click({ force: true });
        await expect(page.locator(PROFILE_FREELANCER)).not.toHaveAttribute('aria-checked', 'true');
    });

    test('should keep Merchant selected when the disabled Freelancer card is clicked', { annotation: [{ type: 'testcase', description: "RI-54: Keep Merchant selected when the disabled Freelancer card is clicked" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(PROFILE_FREELANCER).click({ force: true });
        await expect(page.locator(PROFILE_MERCHANT)).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator(PROFILE_FREELANCER)).not.toHaveAttribute('aria-checked', 'true');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Unified Number (CRN) Field
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Unified Number (CRN) Field', { tag: ['@registration', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
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

    test('should be empty on initial page load', async ({ page }) => {
        await expect(page.locator(CRN_INPUT)).toHaveValue('');
    });

    test('should show the Clear button after a value is entered', async ({ page }) => {
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

    test('should hide the Clear button after the field is emptied via Clear', async ({ page }) => {
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

    test('should handle a 1000-character input without crashing', async ({ page }) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. National ID / Iqama Field
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – National ID / Iqama Field', { tag: ['@registration', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
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

    test('should be empty on initial page load', async ({ page }) => {
        await expect(page.locator(ID_INPUT)).toHaveValue('');
    });

    test('should show the Clear button after a value is entered', async ({ page }) => {
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

    test('should hide the Clear button after the field is emptied via Clear', async ({ page }) => {
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
    test('should handle a 1000-character input without crashing', async ({ page }) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// 4. Email Field – happy, negative, boundary, security
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Email Field', { tag: ['@registration', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    // Happy – valid formats
    test('should accept a standard email address', { annotation: [{ type: 'testcase', description: "RI-81: Accept a standard email address" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user@example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).not.toBeVisible();
    });

    test('should accept an email with a plus-sign alias', { annotation: [{ type: 'testcase', description: "RI-82: Accept an email with a plus-sign alias" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('test+alias@example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).not.toBeVisible();
    });

    test('should accept an email with a subdomain', { annotation: [{ type: 'testcase', description: "RI-83: Accept an email with a subdomain" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user@mail.example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).not.toBeVisible();
    });

    test('should accept an email with numeric local part', { annotation: [{ type: 'testcase', description: "RI-84: Accept an email with numeric local part" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('12345@example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).not.toBeVisible();
    });

    // Negative – invalid formats (error shows on blur)
    test('should show error for email missing the @ symbol', { annotation: [{ type: 'testcase', description: "RI-85: Show error for email missing the @ symbol" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('invalidemail.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for email with no domain after @', { annotation: [{ type: 'testcase', description: "RI-86: Show error for email with no domain after @" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user@');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for a bare @ symbol', { annotation: [{ type: 'testcase', description: "RI-87: Show error for a bare @ symbol" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('@');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for email containing a space', { annotation: [{ type: 'testcase', description: "RI-88: Show error for email containing a space" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user @example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test.skip('should show error for email starting with a dot', { annotation: [{ type: 'testcase', description: "RI-89: Show error for email starting with a dot" }] }, async ({ page }) => {
        await page.pause();
        await page.locator(EMAIL_INPUT).fill('.user@example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for email missing TLD (no dot after domain name)', { annotation: [{ type: 'testcase', description: "RI-90: Show error for email missing TLD (no dot after domain name)" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user@examplecom');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should clear the email error when a valid email replaces an invalid one', { annotation: [{ type: 'testcase', description: "RI-91: Clear the email error when a valid email replaces an invalid one" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('bademail');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
        await page.locator(EMAIL_INPUT).fill('good@example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).not.toBeVisible();
    });

    test('should keep Next disabled while an invalid email is entered', { annotation: [{ type: 'testcase', description: "RI-92: Keep Next disabled while an invalid email is entered" }] }, async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill('notanemail');
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should become disabled again after clearing the email from a complete form', { annotation: [{ type: 'testcase', description: "RI-93: Become disabled again after clearing the email from a complete form" }] }, async ({ page }) => {
        await fillTab1(page, asset);
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
        await page.locator(EMAIL_INPUT).clear();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Security

    test('should handle a very long email (500 chars) without crashing', { annotation: [{ type: 'testcase', description: "RI-96: Handle a very long email (500 chars) without crashing" }] }, async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('a'.repeat(490) + '@x.co');
        await expect(page.locator(EMAIL_INPUT)).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Next Button Enable / Disable Logic
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Next Button Enable/Disable Logic', { tag: ['@registration', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
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

// ─────────────────────────────────────────────────────────────────────────────
// 6. Tab 1 → Tab 2 Transition
// ─────────────────────────────────────────────────────────────────────────────
