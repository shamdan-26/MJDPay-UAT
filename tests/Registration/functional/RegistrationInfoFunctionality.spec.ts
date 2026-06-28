import { test, expect, Page, BrowserContext } from '@playwright/test';
import { goToInfoStep, RESIDENT_ASSETS, generateEmail } from '../helpers';

// ── Selectors ─────────────────────────────────────────────────────────────────
const PROFILE_MERCHANT   = '#register-profile-card-MERCHANT';
const PROFILE_BILLER     = '#register-profile-card-BILLER';
const PROFILE_CUSTOMER   = '#register-profile-card-CUSTOMER';
const PROFILE_FREELANCER = '#register-profile-card-FREELANCER';
const CRN_INPUT          = '#register-unifiedNumber-group input[type="text"]';
const ID_INPUT           = '#register-id-group input[type="text"]';
const EMAIL_INPUT        = 'input[type="email"][aria-label="Email"]';
const EMAIL_ERROR        = '#error_email.text-danger';
const NEXT_BTN           = '#register-next-button';
const ACTIVE_STEP        = '.mp-step.is-active';
const FORM_TITLE         = '#register-form-title';
const FINANCIAL_FIELD    = 'textbox';

type Asset = typeof RESIDENT_ASSETS[number];

// ── Shared navigation helpers ─────────────────────────────────────────────────

async function gotoTab1(page: Page, context: BrowserContext, asset: Asset): Promise<void> {
    await context.grantPermissions(['geolocation'], { origin: 'https://uat.majdpay.com' });
    await goToInfoStep(page, asset.mobile);
    await page.locator(EMAIL_INPUT).waitFor({ state: 'visible', timeout: 15000 });
}

async function fillTab1(page: Page, asset: Asset, profile = PROFILE_MERCHANT): Promise<void> {
    await page.locator(profile).click();
    await page.locator(CRN_INPUT).fill(asset.crn);
    await page.locator(ID_INPUT).fill(asset.nationalId);
    await page.locator(EMAIL_INPUT).fill(generateEmail());
}

async function fillTab1AndAdvance(page: Page, asset: Asset, profile = PROFILE_MERCHANT): Promise<void> {
    await fillTab1(page, asset, profile);
    await page.locator(NEXT_BTN).click();
    await page.getByRole('button', { name: 'Loading' })
        .waitFor({ state: 'hidden', timeout: 20000 })
        .catch(() => {});
    await page.getByRole(FINANCIAL_FIELD, { name: /monthly expected number/i })
        .waitFor({ state: 'visible', timeout: 30000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Profile Type Selection
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Profile Type Selection', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    // Happy – individual selection
    test('should mark Merchant as aria-checked when selected', async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await expect(page.locator(PROFILE_MERCHANT)).toHaveAttribute('aria-checked', 'true');
    });

    test('should mark Biller as aria-checked when selected', async ({ page }) => {
        await page.locator(PROFILE_BILLER).click();
        await expect(page.locator(PROFILE_BILLER)).toHaveAttribute('aria-checked', 'true');
    });

    test('should mark Customer as aria-checked when selected', async ({ page }) => {
        await page.locator(PROFILE_CUSTOMER).click();
        await expect(page.locator(PROFILE_CUSTOMER)).toHaveAttribute('aria-checked', 'true');
    });

    test('should mark Freelancer as aria-checked when selected', async ({ page }) => {
        await page.locator(PROFILE_FREELANCER).click();
        await expect(page.locator(PROFILE_FREELANCER)).toHaveAttribute('aria-checked', 'true');
    });

    // Initial state
    test('should have no profile type pre-selected on page load', async ({ page }) => {
        await expect(page.locator(PROFILE_MERCHANT)).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator(PROFILE_BILLER)).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator(PROFILE_CUSTOMER)).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator(PROFILE_FREELANCER)).toHaveAttribute('aria-checked', 'false');
    });

    // Mutual exclusivity
    test('should deselect Merchant when Biller is selected', async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(PROFILE_BILLER).click();
        await expect(page.locator(PROFILE_MERCHANT)).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator(PROFILE_BILLER)).toHaveAttribute('aria-checked', 'true');
    });

    test('should deselect Biller when Customer is selected', async ({ page }) => {
        await page.locator(PROFILE_BILLER).click();
        await page.locator(PROFILE_CUSTOMER).click();
        await expect(page.locator(PROFILE_BILLER)).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator(PROFILE_CUSTOMER)).toHaveAttribute('aria-checked', 'true');
    });

    test('should deselect Customer when Freelancer is selected', async ({ page }) => {
        await page.locator(PROFILE_CUSTOMER).click();
        await page.locator(PROFILE_FREELANCER).click();
        await expect(page.locator(PROFILE_CUSTOMER)).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator(PROFILE_FREELANCER)).toHaveAttribute('aria-checked', 'true');
    });

    test('should deselect Freelancer when Merchant is selected', async ({ page }) => {
        await page.locator(PROFILE_FREELANCER).click();
        await page.locator(PROFILE_MERCHANT).click();
        await expect(page.locator(PROFILE_FREELANCER)).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator(PROFILE_MERCHANT)).toHaveAttribute('aria-checked', 'true');
    });

    test('should allow switching across all four profile types in sequence', async ({ page }) => {
        for (const p of [PROFILE_MERCHANT, PROFILE_BILLER, PROFILE_CUSTOMER, PROFILE_FREELANCER]) {
            await page.locator(p).click();
            await expect(page.locator(p)).toHaveAttribute('aria-checked', 'true');
        }
        await expect(page.locator(PROFILE_MERCHANT)).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator(PROFILE_BILLER)).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator(PROFILE_CUSTOMER)).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator(PROFILE_FREELANCER)).toHaveAttribute('aria-checked', 'true');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Unified Number (CRN) Field
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Unified Number (CRN) Field', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    // Happy
    test('should accept a valid CRN and retain the value', async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await expect(page.locator(CRN_INPUT)).toHaveValue(asset.crn);
    });

    test('should be empty on initial page load', async ({ page }) => {
        await expect(page.locator(CRN_INPUT)).toHaveValue('');
    });

    test('should show the Clear button after a value is entered', async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await expect(
            page.locator('#register-unifiedNumber-group').getByRole('button', { name: 'Clear' })
        ).toBeVisible();
    });

    test('should clear the CRN field when the Clear button is clicked', async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator('#register-unifiedNumber-group').getByRole('button', { name: 'Clear' }).click();
        await expect(page.locator(CRN_INPUT)).toHaveValue('');
    });

    test('should hide the Clear button after the field is emptied via Clear', async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator('#register-unifiedNumber-group').getByRole('button', { name: 'Clear' }).click();
        await expect(
            page.locator('#register-unifiedNumber-group').getByRole('button', { name: 'Clear' })
        ).not.toBeVisible();
    });

    // Negative – character filtering
    test('should not retain alphabetic characters in the CRN field', async ({ page }) => {
        await page.locator(CRN_INPUT).fill('ABCDEFGHIJ');
        const value = await page.locator(CRN_INPUT).inputValue();
        expect(/[a-zA-Z]/.test(value)).toBe(false);
    });

    test('should not retain special characters in the CRN field', async ({ page }) => {
        await page.locator(CRN_INPUT).fill('@#$%^&*()!');
        const value = await page.locator(CRN_INPUT).inputValue();
        expect(/[@#$%^&*()!]/.test(value)).toBe(false);
    });

    test('should keep Next disabled when CRN is cleared after full form fill', async ({ page }) => {
        await fillTab1(page, asset);
        await page.locator('#register-unifiedNumber-group').getByRole('button', { name: 'Clear' }).click();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Security
    test('should not execute an XSS payload entered in the CRN field', async ({ page }) => {
        let alertFired = false;
        page.once('dialog', dialog => { alertFired = true; dialog.dismiss(); });
        await page.locator(CRN_INPUT).fill('<script>alert("xss")</script>');
        await page.waitForTimeout(500);
        expect(alertFired).toBe(false);
    });

    test('should handle a 1000-character input without crashing', async ({ page }) => {
        await page.locator(CRN_INPUT).fill('1'.repeat(1000));
        await expect(page.locator(CRN_INPUT)).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. National ID / Iqama Field
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – National ID / Iqama Field', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    // Happy
    test('should accept a valid National ID and retain the value', async ({ page }) => {
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await expect(page.locator(ID_INPUT)).toHaveValue(asset.nationalId);
    });

    test('should be empty on initial page load', async ({ page }) => {
        await expect(page.locator(ID_INPUT)).toHaveValue('');
    });

    test('should show the Clear button after a value is entered', async ({ page }) => {
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await expect(
            page.locator('#register-id-group').getByRole('button', { name: 'Clear' })
        ).toBeVisible();
    });

    test('should clear the National ID field when the Clear button is clicked', async ({ page }) => {
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator('#register-id-group').getByRole('button', { name: 'Clear' }).click();
        await expect(page.locator(ID_INPUT)).toHaveValue('');
    });

    test('should keep Next disabled when National ID is cleared after full form fill', async ({ page }) => {
        await fillTab1(page, asset);
        await page.locator('#register-id-group').getByRole('button', { name: 'Clear' }).click();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Negative – character filtering
    test('should not retain alphabetic characters in the National ID field', async ({ page }) => {
        await page.locator(ID_INPUT).fill('ABCDEFGHIJ');
        const value = await page.locator(ID_INPUT).inputValue();
        expect(/[a-zA-Z]/.test(value)).toBe(false);
    });

    test('should not retain special characters in the National ID field', async ({ page }) => {
        await page.locator(ID_INPUT).fill('!@#$%^&*()');
        const value = await page.locator(ID_INPUT).inputValue();
        expect(/[!@#$%^&*()]/.test(value)).toBe(false);
    });

    // Security
    test('should not execute an XSS payload entered in the National ID field', async ({ page }) => {
        let alertFired = false;
        page.once('dialog', dialog => { alertFired = true; dialog.dismiss(); });
        await page.locator(ID_INPUT).fill('<img src=x onerror=alert(1)>');
        await page.waitForTimeout(500);
        expect(alertFired).toBe(false);
    });

    test('should not execute a javascript: URI entered in the National ID field', async ({ page }) => {
        let alertFired = false;
        page.once('dialog', dialog => { alertFired = true; dialog.dismiss(); });
        await page.locator(ID_INPUT).fill('javascript:alert(1)');
        await page.waitForTimeout(500);
        expect(alertFired).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Email Field – happy, negative, boundary, security
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Email Field', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    // Happy – valid formats
    test('should accept a standard email address', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user@example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).not.toBeVisible();
    });

    test('should accept an email with a plus-sign alias', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('test+alias@example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).not.toBeVisible();
    });

    test('should accept an email with a subdomain', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user@mail.example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).not.toBeVisible();
    });

    test('should accept an email with numeric local part', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('12345@example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).not.toBeVisible();
    });

    // Negative – invalid formats (error shows on blur)
    test('should show error for email missing the @ symbol', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('invalidemail.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for email with no domain after @', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user@');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for a bare @ symbol', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('@');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for email containing a space', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user @example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for email starting with a dot', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('.user@example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for email missing TLD (no dot after domain name)', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user@examplecom');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should clear the email error when a valid email replaces an invalid one', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('bademail');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
        await page.locator(EMAIL_INPUT).fill('good@example.com');
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).not.toBeVisible();
    });

    test('should keep Next disabled while an invalid email is entered', async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill('notanemail');
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should become disabled again after clearing the email from a complete form', async ({ page }) => {
        await fillTab1(page, asset);
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
        await page.locator(EMAIL_INPUT).clear();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Security
    test('should not execute XSS entered in the email field', async ({ page }) => {
        let alertFired = false;
        page.once('dialog', dialog => { alertFired = true; dialog.dismiss(); });
        await page.locator(EMAIL_INPUT).fill('<script>alert("xss")</script>');
        await page.locator(EMAIL_INPUT).blur();
        await page.waitForTimeout(500);
        expect(alertFired).toBe(false);
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should treat SQL injection pattern in email as invalid and show error', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill("' OR '1'='1'; --");
        await page.locator(EMAIL_INPUT).blur();
        await expect(page.locator(EMAIL_ERROR)).toBeVisible({ timeout: 5000 });
    });

    test('should handle a very long email (500 chars) without crashing', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('a'.repeat(490) + '@x.co');
        await expect(page.locator(EMAIL_INPUT)).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Next Button Enable / Disable Logic
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Next Button Enable/Disable Logic', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    // All-empty
    test('should be disabled when all fields are empty', async ({ page }) => {
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Single-field filled
    test('should be disabled when only Profile Type is selected', async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should be disabled when only CRN is filled', async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should be disabled when only National ID is filled', async ({ page }) => {
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should be disabled when only Email is filled', async ({ page }) => {
        await page.locator(EMAIL_INPUT).fill('user@example.com');
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Two fields filled
    test('should be disabled with Profile Type + CRN only', async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should be disabled with Profile Type + National ID only', async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should be disabled with Profile Type + Email only', async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(EMAIL_INPUT).fill('user@example.com');
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Three fields filled
    test('should be disabled with Profile Type + CRN + National ID (no email)', async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should be disabled with CRN + National ID + Email (no profile type)', async ({ page }) => {
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill('user@example.com');
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    // Enabled – all 4 profile types
    test('should be enabled when all fields are filled with Merchant profile', async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
    });

    test('should be enabled when all fields are filled with Biller profile', async ({ page }) => {
        await page.locator(PROFILE_BILLER).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
    });

    test('should be enabled when all fields are filled with Customer profile', async ({ page }) => {
        await page.locator(PROFILE_CUSTOMER).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
    });

    test('should be enabled when all fields are filled with Freelancer profile', async ({ page }) => {
        await page.locator(PROFILE_FREELANCER).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
    });

    // Re-disable after clearing
    test('should become disabled again after clearing the CRN from a complete form', async ({ page }) => {
        await fillTab1(page, asset);
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
        await page.locator('#register-unifiedNumber-group').getByRole('button', { name: 'Clear' }).click();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should become disabled again after clearing the National ID from a complete form', async ({ page }) => {
        await fillTab1(page, asset);
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
        await page.locator('#register-id-group').getByRole('button', { name: 'Clear' }).click();
        await expect(page.locator(NEXT_BTN)).toBeDisabled();
    });

    test('should not advance to Tab 2 when Next is force-clicked while disabled', async ({ page }) => {
        await page.locator(NEXT_BTN).click({ force: true });
        await expect(page.locator(ACTIVE_STEP).first()).toContainText('Business Info', { timeout: 5000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Tab 1 → Tab 2 Transition
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Tab 1 → Tab 2 Transition', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    // Happy – all profile types
    test('should advance to Tab 2 with Merchant profile', async ({ page }) => {
        await fillTab1AndAdvance(page, asset, PROFILE_MERCHANT);
        await expect(page.locator(FORM_TITLE)).toContainText(/financial/i);
    });

    test('should advance to Tab 2 with Biller profile', async ({ page }) => {
        await fillTab1AndAdvance(page, asset, PROFILE_BILLER);
        await expect(page.locator(FORM_TITLE)).toContainText(/financial/i);
    });

    test('should advance to Tab 2 with Customer profile', async ({ page }) => {
        await fillTab1AndAdvance(page, asset, PROFILE_CUSTOMER);
        await expect(page.locator(FORM_TITLE)).toContainText(/financial/i);
    });

    test('should advance to Tab 2 with Freelancer profile', async ({ page }) => {
        await fillTab1AndAdvance(page, asset, PROFILE_FREELANCER);
        await expect(page.locator(FORM_TITLE)).toContainText(/financial/i);
    });

    test('should stay on the /register URL after advancing to Tab 2', async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        expect(page.url()).toContain('/business/auth/register');
    });

    // Tab 2 elements present
    test('should show the Monthly Expected Number of Bills field on Tab 2', async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        await expect(page.getByRole('textbox', { name: /monthly expected number/i })).toBeVisible();
    });

    test('should show the Banks dropdown on Tab 2', async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        await expect(page.locator('#floating-dropdown-banks-9')).toBeVisible();
    });

    test('should show the Industries dropdown on Tab 2', async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        await expect(page.locator('#floating-dropdown-industries-10')).toBeVisible();
    });

    test('should show the Annual Income dropdown on Tab 2', async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        await expect(page.locator('#floating-dropdown-annual-income-11')).toBeVisible();
    });

    test('should show the Next button on Tab 2', async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
    });

    test('should show the Back button on Tab 2', async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
    });

    // Negative – backend rejection
    test('should not reach Tab 2 when an unrecognised CRN / National ID pair is submitted', async ({ page }) => {
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill('9999999999');
        await page.locator(ID_INPUT).fill('9999999999');
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await page.locator(NEXT_BTN).click();
        await page.getByRole('button', { name: 'Loading' })
            .waitFor({ state: 'hidden', timeout: 20000 })
            .catch(() => {});
        await expect(
            page.getByRole('textbox', { name: /monthly expected number/i })
        ).not.toBeVisible({ timeout: 10000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Back Navigation – state preservation
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Back Navigation (Tab 2 → Tab 1)', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;
    let emailUsed: string;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        emailUsed = generateEmail();
        await gotoTab1(page, context, asset);
        // Fill with Merchant so profile type can be checked on return
        await page.locator(PROFILE_MERCHANT).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill(emailUsed);
        await page.locator(NEXT_BTN).click();
        await page.getByRole('button', { name: 'Loading' })
            .waitFor({ state: 'hidden', timeout: 20000 })
            .catch(() => {});
        await page.getByRole('textbox', { name: /monthly expected number/i })
            .waitFor({ state: 'visible', timeout: 30000 });
    });

    test('should return to Tab 1 when Back is clicked from Tab 2', async ({ page }) => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.locator(ACTIVE_STEP).first())
            .toContainText('Business Info', { timeout: 10000 });
    });

    test('should restore the CRN value after going Back', async ({ page }) => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.locator(CRN_INPUT)).toHaveValue(asset.crn, { timeout: 10000 });
    });

    test('should restore the National ID value after going Back', async ({ page }) => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.locator(ID_INPUT)).toHaveValue(asset.nationalId, { timeout: 10000 });
    });

    test('should restore the Email value after going Back', async ({ page }) => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.locator(EMAIL_INPUT)).toHaveValue(emailUsed, { timeout: 10000 });
    });

    test('should restore the Merchant profile selection after going Back', async ({ page }) => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.locator(PROFILE_MERCHANT))
            .toHaveAttribute('aria-checked', 'true', { timeout: 10000 });
    });

    test('should keep Next enabled on Tab 1 after going Back', async ({ page }) => {
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.locator(NEXT_BTN)).toBeEnabled({ timeout: 10000 });
    });

    test('should successfully re-advance to Tab 2 after going Back and clicking Next', async ({ page }) => {
        await page.getByRole('button', { name: /back/i }).click();
        await page.locator(NEXT_BTN).click();
        await page.getByRole('button', { name: 'Loading' })
            .waitFor({ state: 'hidden', timeout: 20000 })
            .catch(() => {});
        await expect(page.locator(FORM_TITLE)).toContainText(/financial/i, { timeout: 15000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Step Indicator Progression
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Step Indicator Progression', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should show "Business Info" as the active inner step on load', async ({ page }) => {
        await expect(page.locator(ACTIVE_STEP).first()).toContainText('Business Info');
    });

    test('should not show NAFATH as active while on Tab 1', async ({ page }) => {
        await expect(page.locator(ACTIVE_STEP).first()).not.toContainText('NAFATH');
    });

    test('should activate the NAFATH step after completing Tab 1', async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        await expect(page.locator(ACTIVE_STEP).first())
            .toContainText('NAFATH', { timeout: 10000 });
    });

    test('should restore "Business Info" as the active step after going Back from Tab 2', async ({ page }) => {
        await fillTab1AndAdvance(page, asset);
        await page.getByRole('button', { name: /back/i }).click();
        await expect(page.locator(ACTIVE_STEP).first())
            .toContainText('Business Info', { timeout: 10000 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Footer Navigation
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Footer Navigation', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should navigate to the Login page when the "Log In" link is clicked', async ({ page }) => {
        await page.locator('#btn_register_login_step1').click();
        await expect(page).toHaveURL(/auth\/login/, { timeout: 10000 });
    });

    test('Terms & Conditions link should be visible and have an href', async ({ page }) => {
        const link = page.locator('#login-form-footer a').filter({ hasText: /terms/i }).first();
        await expect(link).toBeVisible();
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();
    });

    test('Privacy Policy link should be visible and have an href', async ({ page }) => {
        const link = page.locator('#login-form-footer a').filter({ hasText: /privacy/i }).first();
        await expect(link).toBeVisible();
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();
    });

    test('Terms & Conditions link should be clickable without a JS error', async ({ page }) => {
        const link = page.locator('#login-form-footer a').filter({ hasText: /terms/i }).first();
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));
        await link.click();
        expect(errors).toHaveLength(0);
    });

    test('Privacy Policy link should be clickable without a JS error', async ({ page }) => {
        const link = page.locator('#login-form-footer a').filter({ hasText: /privacy/i }).first();
        const errors: string[] = [];
        page.on('pageerror', err => errors.push(err.message));
        await link.click();
        expect(errors).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Language Toggle
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Language Toggle', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should switch to Arabic when العربية is clicked', async ({ page }) => {
        const langGroup = page.getByRole('group', { name: /change language/i });
        await langGroup.getByRole('button', { name: 'العربية' }).click();
        await expect(langGroup.getByRole('button', { name: 'العربية' }))
            .toHaveAttribute('aria-pressed', 'true');
    });

    test('should switch back to English when EN is clicked after Arabic', async ({ page }) => {
        const langGroup = page.getByRole('group', { name: /change language/i });
        await langGroup.getByRole('button', { name: 'العربية' }).click();
        await langGroup.getByRole('button', { name: 'EN' }).click();
        await expect(langGroup.getByRole('button', { name: 'EN' }))
            .toHaveAttribute('aria-pressed', 'true');
    });

    test('should mark EN as not active after switching to Arabic', async ({ page }) => {
        const langGroup = page.getByRole('group', { name: /change language/i });
        await langGroup.getByRole('button', { name: 'العربية' }).click();
        await expect(langGroup.getByRole('button', { name: 'EN' }))
            .not.toHaveAttribute('aria-pressed', 'true');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Theme Toggle
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Theme Toggle', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should change the body class when Switch theme is clicked', async ({ page }) => {
        const themeBtn = page.locator('button.mode-btn.header-icon-btn');
        const before = await page.locator('body').getAttribute('class');
        await themeBtn.click();
        const after = await page.locator('body').getAttribute('class');
        expect(after).not.toEqual(before);
    });

    test('should return to the original theme class when toggled twice', async ({ page }) => {
        const themeBtn = page.locator('button.mode-btn.header-icon-btn');
        const original = await page.locator('body').getAttribute('class');
        await themeBtn.click();
        await themeBtn.click();
        const restored = await page.locator('body').getAttribute('class');
        expect(restored ?? '').toEqual(original ?? '');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Tooltip Interactions
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Tooltip Interactions', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should reveal a tooltip when the Unified Number info button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: /Unified Number/i }).click();
        await expect(
            page.locator('[role="tooltip"], [class*="tooltip"], [class*="popover"]').first()
        ).toBeVisible({ timeout: 5000 });
    });

    test('should reveal a tooltip when the National ID info button is clicked', async ({ page }) => {
        await page.getByRole('button', { name: /National ID.*Iqama|Iqama/i }).click();
        await expect(
            page.locator('[role="tooltip"], [class*="tooltip"], [class*="popover"]').first()
        ).toBeVisible({ timeout: 5000 });
    });
});
