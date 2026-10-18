import { test, expect } from '@playwright/test';
import { RESIDENT_ASSETS } from '../../../helpers/RegistrationHelper';
import { PROFILE_MERCHANT, CRN_INPUT, ID_INPUT, EMAIL_INPUT, EMAIL_ERROR, NEXT_BTN, Asset, gotoTab1, fillTab1 } from '../../../helpers/infoStepForm';

// ─────────────────────────────────────────────────────────────────────────────
// 4. Email Field – happy, negative, boundary, security
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Email Field', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
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
