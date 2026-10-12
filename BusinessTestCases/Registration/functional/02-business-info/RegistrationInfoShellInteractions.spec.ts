import { test, expect } from '@playwright/test';
import { RESIDENT_ASSETS, nextResidentAsset } from '../../RegistrationHelper';
import { CRN_TOOLTIP_INFO_BTN, ID_TOOLTIP_INFO_BTN, FIELD_HINT_TOOLTIP_POPUP, TERMS_TEXT, PRIVACY_TEXT, Asset, gotoTab1 } from '../../helpers/infoStepForm';

// ─────────────────────────────────────────────────────────────────────────────
// 9. Footer Navigation
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Footer Navigation', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }) => {
        test.setTimeout(120_000);
        // Round-robin via nextResidentAsset() rather than the fixed
        // RESIDENT_ASSETS[workerIndex % length] lookup — same worker-index drift as the
        // other describe blocks in this file (see project_resident_assets_worker_index_races
        // memory): a mobile another test/spec file has already pushed to a fully-registered
        // state can make the mobile+OTP step itself behave differently, hanging gotoTab1's
        // wait for the "Tell us about your business" text/profile cards in a bulk run even
        // though this block never advances past Tab 1. nextResidentAsset() always gets an
        // account that hasn't registered before.
        asset = nextResidentAsset();
        await gotoTab1(page, context, asset);
    });

    test('should navigate to the Login page when the "Log In" link is clicked', { annotation: [{ type: 'testcase', description: "RI-122: Navigate to the Login page when the \"Log In\" link is clicked" }] }, async ({ page }) => {
        await page.locator('#btn_register_login_step1').click();
        await expect(page).toHaveURL(/auth\/login/, { timeout: 10000 });
    });

    test('Terms & Conditions link should be visible', { annotation: [{ type: 'testcase', description: "RI-123: Terms & Conditions link be visible" }] }, async ({ page }) => {
        const link = page.locator('.text-primary.link').filter({ hasText: TERMS_TEXT }).first();
        await expect(link).toBeVisible();
    });

    test('Privacy Policy link should be visible', { annotation: [{ type: 'testcase', description: "RI-124: Privacy Policy link be visible" }] }, async ({ page }) => {
        const link = page.locator('.text-primary.link').filter({ hasText: PRIVACY_TEXT }).first();
        await expect(link).toBeVisible();
    });

    test('Terms & Conditions link should be clickable without a JS error', { annotation: [{ type: 'testcase', description: "RI-125: Terms & Conditions link be clickable without a JS error" }] }, async ({ page }) => {
        const link = page.locator('.text-primary.link').filter({ hasText: TERMS_TEXT }).first();
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));
        await link.click();
        expect(errors).toHaveLength(0);
    });

    test('Privacy Policy link should be clickable without a JS error', { annotation: [{ type: 'testcase', description: "RI-126: Privacy Policy link be clickable without a JS error" }] }, async ({ page }) => {
        const link = page.locator('.text-primary.link').filter({ hasText: PRIVACY_TEXT }).first();
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));
        await link.click();
        expect(errors).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Language Toggle
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Language Toggle', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should switch to Arabic when العربية is clicked', { annotation: [{ type: 'testcase', description: "RI-127: Switch to Arabic when العربية is clicked" }] }, async ({ page }) => {
        const langGroup = page.getByRole('group', { name: /change language/i });
        await langGroup.getByRole('button', { name: 'العربية' }).click();
        await expect(langGroup.getByRole('button', { name: 'العربية' }))
            .toHaveAttribute('aria-pressed', 'true');
    });

    test('should switch back to English when EN is clicked after Arabic', { annotation: [{ type: 'testcase', description: "RI-128: Switch back to English when EN is clicked after Arabic" }] }, async ({ page }) => {
        const langGroup = page.getByRole('group', { name: /change language/i });
        await langGroup.getByRole('button', { name: 'العربية' }).click();
        await expect(langGroup.getByRole('button', { name: 'العربية' }))
            .toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
        await langGroup.getByRole('button', { name: 'EN' }).click();
        await expect(langGroup.getByRole('button', { name: 'EN' }))
            .toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
    });

    test('should mark EN as not active after switching to Arabic', { annotation: [{ type: 'testcase', description: "RI-129: Mark EN as not active after switching to Arabic" }] }, async ({ page }) => {
        const langGroup = page.getByRole('group', { name: /change language/i });
        await langGroup.getByRole('button', { name: 'العربية' }).click();
        await expect(langGroup.getByRole('button', { name: 'EN' }))
            .not.toHaveAttribute('aria-pressed', 'true');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Theme Toggle
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Theme Toggle', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should change the body class when Switch theme is clicked', { annotation: [{ type: 'testcase', description: "RI-130: Change the body class when Switch theme is clicked" }] }, async ({ page }) => {
        const themeBtn = page.locator('button.mode-btn.header-icon-btn');
        const before = await page.locator('body').getAttribute('class');
        await themeBtn.click();
        await expect(page.locator('body')).not.toHaveAttribute('class', before ?? '', { timeout: 5000 });
    });

    test('should return to the original theme class when toggled twice', { annotation: [{ type: 'testcase', description: "RI-131: Return to the original theme class when toggled twice" }] }, async ({ page }) => {
        const themeBtn = page.locator('button.mode-btn.header-icon-btn');
        const original = await page.locator('body').getAttribute('class');
        await themeBtn.click();
        await expect(page.locator('body')).not.toHaveAttribute('class', original ?? '', { timeout: 5000 });
        await themeBtn.click();
        await expect(page.locator('body')).toHaveAttribute('class', original ?? '', { timeout: 5000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Tooltip Interactions
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Tooltip Interactions', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should reveal a tooltip when the Unified Number info button is clicked', { annotation: [{ type: 'testcase', description: "RI-132: Reveal a tooltip when the Unified Number info button is clicked" }] }, async ({ page }) => {
        const btn = page.locator(CRN_TOOLTIP_INFO_BTN);
        await btn.waitFor({ state: 'visible', timeout: 10000 });
        await btn.click();
        await expect(page.locator(FIELD_HINT_TOOLTIP_POPUP)).toBeVisible({ timeout: 8000 });
    });

    test('should reveal a tooltip when the National ID info button is clicked', { annotation: [{ type: 'testcase', description: "RI-133: Reveal a tooltip when the National ID info button is clicked" }] }, async ({ page }) => {
        const btn = page.locator(ID_TOOLTIP_INFO_BTN);
        await btn.waitFor({ state: 'visible', timeout: 10000 });
        await btn.click();
        await expect(page.locator(FIELD_HINT_TOOLTIP_POPUP)).toBeVisible({ timeout: 8000 });
    });

    test('should close the Unified Number tooltip when clicking away', { annotation: [{ type: 'testcase', description: "RI-134: Close the Unified Number tooltip when clicking away" }] }, async ({ page }) => {
        const btn = page.locator(CRN_TOOLTIP_INFO_BTN);
        await btn.waitFor({ state: 'visible', timeout: 10000 });
        const tooltip = page.locator('[role="tooltip"], [class*="tooltip"], [class*="popover"]').first();
        await btn.click();
        await expect(tooltip).toBeVisible({ timeout: 8000 });
        await page.locator('body').click({ position: { x: 0, y: 0 } });
        await expect(tooltip).not.toBeVisible({ timeout: 5000 });
    });

    test('should display non-empty descriptive text inside the Unified Number tooltip', { annotation: [{ type: 'testcase', description: "RI-135: Display non-empty descriptive text inside the Unified Number tooltip" }] }, async ({ page }) => {
        const btn = page.locator(CRN_TOOLTIP_INFO_BTN);
        await btn.waitFor({ state: 'visible', timeout: 10000 });
        await btn.click();
        const tooltip = page.locator('[role="tooltip"], [class*="tooltip"], [class*="popover"]').first();
        await expect(tooltip).toBeVisible({ timeout: 8000 });
        const text = await tooltip.textContent();
        expect(text?.trim().length ?? 0).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Continue / Resume Registration (EMI-5666, EMI-122 T03/T21)
//
// Per EMI-5666: after submitting Business Info, the backend decides whether
// this is a NEW registration or a CONTINUING one. Confirmed live for an identity
// already flagged 'products'/'contract' — i.e. one that previously completed
// BOTH Business Info and Financial & Business and reached Products/Contract:
// Registration Info is NOT bypassed (the user must re-enter it), but Financial
// & Business, Verification & Uploads, and NAFATH all ARE bypassed — resubmitting
// Business Info alone resumes the pending registration straight onto Products
// or Contract, whatever step it was last left at.
// ─────────────────────────────────────────────────────────────────────────────
