import { test, expect, Page, BrowserContext } from '@playwright/test';
import { goToInfoStep, REGISTER_URL, RESIDENT_ASSETS, generateEmail } from '../RegistrationHelper';

// ── Selectors ─────────────────────────────────────────────────────────────────
const PROFILE_MERCHANT   = '#register-profile-card-MERCHANT';
const PROFILE_BILLER     = '#register-profile-card-BILLER';
const PROFILE_CUSTOMER   = '#register-profile-card-CUSTOMER';
const CRN_INPUT          = '#register-unifiedNumber-group input[type="text"]';
const ID_INPUT           = '#register-id-group input[type="text"]';
const EMAIL_INPUT        = 'input[type="email"][aria-label="Email"]';
const NEXT_BTN           = '#register-next-button';
const FORM_TITLE         = '#register-form-title';
const FINANCIAL_FIELD    = 'textbox';

type Asset = typeof RESIDENT_ASSETS[number];

async function gotoTab1(page: Page, context: BrowserContext, asset: Asset): Promise<void> {
    const origin = new URL(REGISTER_URL).origin;
    await context.grantPermissions(['geolocation'], { origin });
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
// Archived – Biller profile test cases from RegistrationInfoFunctionality
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration – Profile Type Selection (Biller)', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should mark Biller as aria-checked when selected', async ({ page }) => {
        await page.locator(PROFILE_BILLER).click();
        await expect(page.locator(PROFILE_BILLER)).toHaveAttribute('aria-checked', 'true');
    });

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
});

test.describe('Registration – Next Button Enable/Disable Logic (Biller)', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should be enabled when all fields are filled with Biller profile', async ({ page }) => {
        await page.locator(PROFILE_BILLER).click();
        await page.locator(CRN_INPUT).fill(asset.crn);
        await page.locator(ID_INPUT).fill(asset.nationalId);
        await page.locator(EMAIL_INPUT).fill(generateEmail());
        await expect(page.locator(NEXT_BTN)).toBeEnabled();
    });
});

test.describe('Registration – Tab 1 → Tab 2 Transition (Biller)', () => {
    test.describe.configure({ mode: 'serial' });

    let asset: Asset;

    test.beforeEach(async ({ page, context }, testInfo) => {
        test.setTimeout(120_000);
        asset = RESIDENT_ASSETS[testInfo.workerIndex % RESIDENT_ASSETS.length];
        await gotoTab1(page, context, asset);
    });

    test('should advance to Tab 2 with Biller profile', async ({ page }) => {
        await fillTab1AndAdvance(page, asset, PROFILE_BILLER);
        await expect(page.locator(FORM_TITLE)).toContainText(/financial/i);
    });
});
