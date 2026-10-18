import { test, expect } from '@playwright/test';
import { RESIDENT_ASSETS } from '../../../helpers/RegistrationHelper';
import { PROFILE_MERCHANT, PROFILE_FREELANCER, Asset, gotoTab1 } from '../../../helpers/infoStepForm';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Profile Type Selection
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Profile Type Selection', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
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
