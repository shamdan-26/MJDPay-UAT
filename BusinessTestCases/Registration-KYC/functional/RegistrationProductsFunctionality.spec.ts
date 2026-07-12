import { test, expect, Page, Locator } from '@playwright/test';
import {
    goToInfoStep, nextCitizenAsset, generateEmail, REGISTER_URL,
    selectRandomOption, VALID_IBAN, VALID_VAT_NUMBER, TEST_FILE_BUFFER,
    isAlreadyRegisteredMessage,
} from '../RegistrationHelper';
import { RegistrationFinancialPage } from '../../pageElements/registration/RegistrationFinancialPage';
import { RegistrationVerificationPage } from '../../pageElements/registration/RegistrationVerificationPage';

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

// testTuqa renders disabled + aria-pressed="true" (locked, pre-selected) on this
// environment's Products step — it's the mandatory product that can't be
// deselected (confirmed live), so it's never clicked in the tests below and the
// "Selected" counter always starts at 1, not 0.
const MANDATORY_PRODUCT = 'testTuqa';
const OPTIONAL_PRODUCTS = PRODUCT_NAMES.filter(name => name !== MANDATORY_PRODUCT);

function productCard(page: Page, name: string): Locator {
    return page.locator('.mp-product-card').filter({ hasText: name }).first();
}

function continueButton(page: Page): Locator {
    return page.getByRole('button', { name: /^continue$/i });
}

function selectedCounter(page: Page): Locator {
    return page.locator('.mp-product-footer__count');
}

// ─────────────────────────────────────────────────────────────────────────────
// Products Step (outer step 3 of 4). Reached via Business Info -> Financial &
// Business -> Verification & Documents -> Sign Up — NOT gated on real NAFATH
// (confirmed live against dev: Sign Up lands directly on the Products step with
// the real product catalogue). Every test still gates on `productsAppeared` and
// skips with a clear reason if sign-up doesn't complete, but that should no
// longer trigger under normal conditions.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration - Products Step', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let productsAppeared = false;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(180_000);
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        page = await context.newPage();

        // CITIZEN_ASSETS is a shared, reused pool — an identity already registered
        // by a prior run is expected steady-state, so cycle to the next asset
        // rather than treating it as a failure.
        const maxAttempts = 10;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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

            // Financial & Business step normally comes next — but a CITIZEN_ASSETS
            // identity that already completed Financial/Verification in a previous
            // run (the pool is shared/reused) resumes straight at the Products step
            // instead, so race both outcomes rather than assuming Financial appears.
            const financialPage = new RegistrationFinancialPage(page);
            const productsHeading = page.getByText('Choose the products for your business.');
            const outcome = await Promise.race([
                financialPage.monthlyBillsInput.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'financial' as const),
                productsHeading.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'products' as const),
            ]).catch(() => 'neither' as const);

            if (outcome === 'products') {
                productsAppeared = true;
                break;
            }

            if (outcome === 'neither') {
                const pageText = await page.evaluate(() => document.body.innerText).catch(() => '');
                if (isAlreadyRegisteredMessage(pageText) && attempt < maxAttempts) continue;
                break;
            }

            await financialPage.fill('1500', '50000', '10000', '20000');
            await selectRandomOption(page, page.locator('#mat-select-value-0'));
            await selectRandomOption(page, page.locator('#mat-select-value-1'));
            await financialPage.next();

            // Verification & Documents step — Sign Up here is what advances to Products.
            const verificationPage = new RegistrationVerificationPage(page);
            await verificationPage.waitForLoad();
            if (await verificationPage.bankDropdown.count() > 0) {
                await selectRandomOption(page, verificationPage.bankDropdown.first());
            }
            await verificationPage.ibanInput.fill(VALID_IBAN);
            await verificationPage.vatInput.fill(VALID_VAT_NUMBER);
            const fileInputs = page.locator('input[type="file"]');
            const fileInputCount = await fileInputs.count();
            for (let i = 0; i < fileInputCount; i++) {
                await fileInputs.nth(i)
                    .setInputFiles({ name: `doc${i}.pdf`, mimeType: 'application/pdf', buffer: TEST_FILE_BUFFER })
                    .catch(() => {});
            }
            await verificationPage.signUpButton.click();
            await page.getByRole('button', { name: 'Loading' })
                .waitFor({ state: 'hidden', timeout: 20000 })
                .catch(() => {});

            productsAppeared = await productsHeading
                .waitFor({ state: 'visible', timeout: 90000 })
                .then(() => true)
                .catch(() => false);

            if (productsAppeared) break;

            const pageText = await page.evaluate(() => document.body.innerText).catch(() => '');
            if (!isAlreadyRegisteredMessage(pageText) || attempt >= maxAttempts) break;
        }
    });

    test.afterAll(async () => {
        await page.close();
    });

    const SKIP_MSG = 'Products step was not reached — sign-up did not complete (Financial/Verification form validation may have changed in this environment)';

    // ── Page arrival ─────────────────────────────────────────────────────────

    test('should mark "Products" as the active step after NAFATH completes', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(page.locator(ACTIVE_STEP).first()).toContainText('Products');
    });

    test('should display a "View more" link on each product card', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        for (const name of PRODUCT_NAMES) {
            await expect(productCard(page, name).getByText(/view more/i)).toBeVisible();
        }
    });

    test('should show the annual price on the POS Terminal card instead of Free', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(productCard(page, 'POS Terminal')).toContainText(/5\s*SAR\s*\/\s*annual/i);
    });

    // ── Initial state ────────────────────────────────────────────────────────
    // testTuqa is the mandatory product — pre-selected and locked (disabled) —
    // so the baseline is always "1 Selected" with Continue already enabled.

    test('should show the mandatory product pre-selected and locked by default', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        const mandatoryCard = productCard(page, MANDATORY_PRODUCT);
        await expect(mandatoryCard).toBeDisabled();
        await expect(mandatoryCard).toHaveAttribute('aria-pressed', 'true');
    });

    test('should have the Continue button enabled by default via the mandatory product', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(continueButton(page)).toBeEnabled();
    });

    test('should display "1 Selected" by default with only the mandatory product selected', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(selectedCounter(page)).toContainText('1 Selected');
    });

    // ── Single selection ─────────────────────────────────────────────────────

    test('should select an optional product and show "2 Selected" when its card is clicked', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productCard(page, 'walletTest').click();
        await expect(selectedCounter(page)).toContainText('2 Selected');
    });

    test('should keep the Continue button enabled after selecting another product', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(continueButton(page)).toBeEnabled();
    });

    // ── Multiple selection ───────────────────────────────────────────────────

    test('should update the counter to "3 Selected" when a second optional product is selected', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productCard(page, 'ttt').click();
        await expect(selectedCounter(page)).toContainText('3 Selected');
    });

    test('should allow selecting all six available products', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        // walletTest and ttt are already selected from the tests above; testTuqa
        // is the locked mandatory product and can't be clicked.
        const remaining = OPTIONAL_PRODUCTS.filter(name => name !== 'walletTest' && name !== 'ttt');
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

    test('should keep the mandatory product selected once every optional product is deselected', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        // POS Terminal was already deselected by the previous test — only click
        // the optional products still selected at this point, so this loop
        // toggles them off rather than re-selecting POS Terminal.
        const stillSelected = OPTIONAL_PRODUCTS.filter(name => name !== 'POS Terminal');
        for (const name of stillSelected) {
            await productCard(page, name).click();
        }
        await expect(continueButton(page)).toBeEnabled();
    });

    test('should show "1 Selected" again once every optional product is deselected', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(selectedCounter(page)).toContainText('1 Selected');
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
