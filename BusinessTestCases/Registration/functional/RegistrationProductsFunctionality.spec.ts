import { test, expect, Page, Locator } from '@playwright/test';
import { goToInfoStep, nextCitizenAsset, generateEmail, REGISTER_URL } from '../helpers';

// ── Selectors ─────────────────────────────────────────────────────────────────
const ACTIVE_STEP = '.mp-step.is-active';
const CANCEL_BTN  = (p: Page) => p.getByRole('button', { name: /cancel/i });

const PRODUCT_NAMES = [
    'walletTest',
    'ttt',
    'testTuqa',
    'TuqaTestLimit',
    'Point of Sale Device',
    'POS Terminal',
];

function productCard(page: Page, name: string): Locator {
    return page
        .locator('article, li, [class*="product-card"], [class*="mp-product"], [class*="product"]')
        .filter({ hasText: name })
        .first();
}

function continueButton(page: Page): Locator {
    return page.getByRole('button', { name: /^continue$/i });
}

function selectedCounter(page: Page): Locator {
    return page.getByText(/^\d+\s+Selected$/i).first();
}

// ─────────────────────────────────────────────────────────────────────────────
// Products Step (outer step 3 of 4 — reached only after real NAFATH verification
// completes). NAFATH cannot be completed by automation against a live external
// verification app, so — mirroring RegistrationNafathFunctionality.spec.ts — every
// test here skips gracefully with a clear reason when the step is unreachable in
// this environment, rather than hanging or failing hard.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration - Products Step', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let productsAppeared = false;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(150_000);
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        page = await context.newPage();

        const asset = nextCitizenAsset();
        await goToInfoStep(page, asset.mobile);

        const radioGroup = page.getByRole('radiogroup', { name: 'Profile Type' });
        await radioGroup.getByRole('radio').first().click();
        await page.locator('#floating-text-field-2').fill(asset.crn);
        await page.locator('#floating-text-field-3').fill(asset.nationalId);
        await page.getByRole('textbox', { name: /Email/i }).fill(generateEmail());
        await page.getByRole('button', { name: 'next' }).click();
        await page.getByRole('button', { name: 'Loading' })
            .waitFor({ state: 'hidden', timeout: 20000 })
            .catch(() => {});

        productsAppeared = await page.getByText('Choose the products for your business.')
            .waitFor({ state: 'visible', timeout: 90000 })
            .then(() => true)
            .catch(() => false);
    }, 150_000);

    test.afterAll(async () => {
        await page.close();
    });

    const SKIP_MSG = 'Products step was not reached — NAFATH verification could not be completed automatically in this environment';

    // ── Page arrival ─────────────────────────────────────────────────────────

    test('should mark "Products" as the active step after NAFATH completes', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(page.locator(ACTIVE_STEP).first()).toContainText('Products');
    });

    test('should display a "View more" link on each product card', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        for (const name of PRODUCT_NAMES) {
            await expect(productCard(page, name).getByRole('link', { name: /view more/i })).toBeVisible();
        }
    });

    test('should show the annual price on the POS Terminal card instead of Free', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(productCard(page, 'POS Terminal')).toContainText(/5\s*SAR\s*\/\s*annual/i);
    });

    // ── Initial state ────────────────────────────────────────────────────────

    test('should have the Continue button disabled when no product is selected', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(continueButton(page)).toBeDisabled();
    });

    test('should not display a "Selected" counter when no product is selected', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(selectedCounter(page)).not.toBeVisible();
    });

    // ── Single selection ─────────────────────────────────────────────────────

    test('should select a product and show "1 Selected" when its card is clicked', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productCard(page, 'walletTest').click();
        await expect(selectedCounter(page)).toContainText('1 Selected');
    });

    test('should enable the Continue button after selecting a product', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(continueButton(page)).toBeEnabled();
    });

    // ── Multiple selection ───────────────────────────────────────────────────

    test('should update the counter to "2 Selected" when a second product is selected', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productCard(page, 'ttt').click();
        await expect(selectedCounter(page)).toContainText('2 Selected');
    });

    test('should allow selecting all six available products', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        const remaining = ['testTuqa', 'TuqaTestLimit', 'Point of Sale Device', 'POS Terminal'];
        for (const name of remaining) {
            await productCard(page, name).click();
        }
        await expect(selectedCounter(page)).toContainText(`${PRODUCT_NAMES.length} Selected`);
    });

    // ── Deselection ──────────────────────────────────────────────────────────

    test('should deselect a product and decrement the counter when its card is clicked again', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productCard(page, 'POS Terminal').click();
        await expect(selectedCounter(page)).toContainText('5 Selected');
    });

    test('should disable the Continue button again once every product is deselected', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        for (const name of ['walletTest', 'ttt', 'testTuqa', 'TuqaTestLimit', 'Point of Sale Device']) {
            await productCard(page, name).click();
        }
        await expect(continueButton(page)).toBeDisabled();
    });

    test('should hide the "Selected" counter again once every product is deselected', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(selectedCounter(page)).not.toBeVisible();
    });

    // ── Cancel / Continue actions ────────────────────────────────────────────

    test('should keep the Cancel button enabled regardless of selection state', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(CANCEL_BTN(page)).toBeEnabled();
    });

    test('should advance past the Products step when Continue is clicked with a product selected', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productCard(page, 'walletTest').click();
        await expect(continueButton(page)).toBeEnabled();
        await continueButton(page).click();
        await expect(page.locator(ACTIVE_STEP).first()).not.toContainText('Products', { timeout: 15000 });
    });
});
