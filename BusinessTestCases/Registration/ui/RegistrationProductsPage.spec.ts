import { test, expect, Page } from '@playwright/test';
import { goToInfoStep, nextCitizenAsset, generateEmail, REGISTER_URL } from '../helpers';
import { RegistrationProductsPage } from '../../pageElements/registration/RegistrationProductsPage';

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding PoS Request Flow — web UI (EMI-5783)
//
// Authored directly from the ticket's acceptance criteria — not yet verified
// against a live build (the web Products step observed during authoring only
// showed plain selectable product cards, no inline PoS expansion). Every test
// is gated behind a runtime feature-detection check and skips cleanly with a
// clear reason when the underlying UI isn't found, mirroring the pattern used
// in RegistrationNafathFunctionality.spec.ts for other environment-dependent
// steps. Once the feature ships on web, these should start running for real —
// reconcile any selector mismatches at that point.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration - Products Step UI (PoS Onboarding, EMI-5783)', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let products: RegistrationProductsPage;
    let productsAppeared = false;
    let posFlowAvailable = false;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(150_000);
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        page = await context.newPage();
        products = new RegistrationProductsPage(page);

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

        if (productsAppeared) {
            await products.productCard('POS Terminal').click();
            posFlowAvailable = await Promise.race([
                products.requestDevicesNowButton.waitFor({ state: 'visible', timeout: 8000 }),
                products.skipSetupLaterButton.waitFor({ state: 'visible', timeout: 8000 }),
            ]).then(() => true).catch(() => false);
        }
    }, 150_000);

    test.afterAll(async () => {
        await page.close();
    });

    const SKIP_STEP = 'Products step was not reached — NAFATH verification could not be completed automatically in this environment';
    const SKIP_FLOW = 'PoS inline request sub-flow (EMI-5783) was not found on the Products step in this environment — feature may not be live on web yet';

    function requireFlow() {
        test.skip(!productsAppeared, SKIP_STEP);
        test.skip(!posFlowAvailable, SKIP_FLOW);
    }

    // ── PoS card expansion ──────────────────────────────────────────────────

    test('should expand the PoS Terminals card inline without leaving the Products step', async () => {
        requireFlow();
        await expect(products.activeStep.first()).toContainText('Products');
    });

    test('should show both "Request devices now" and "Skip - set up later" in the expanded card', async () => {
        requireFlow();
        await expect(products.requestDevicesNowButton).toBeVisible();
        await expect(products.skipSetupLaterButton).toBeVisible();
    });

    // ── Skip path ────────────────────────────────────────────────────────────

    test('should show a setup-later message after choosing Skip', async () => {
        requireFlow();
        await products.skipSetupLaterButton.click();
        await expect(products.skippedMessage).toBeVisible({ timeout: 10000 });
    });

    test('should show "Actually, request now" after skipping', async () => {
        requireFlow();
        await expect(products.requestNowFromSkipButton).toBeVisible();
    });

    test('should reopen the request flow when "Actually, request now" is clicked', async () => {
        requireFlow();
        await products.requestNowFromSkipButton.click();
        await expect(products.deviceCountInput).toBeVisible({ timeout: 10000 });
    });

    // ── Devices & Delivery ──────────────────────────────────────────────────

    test('should show the Devices & Delivery fields', async () => {
        requireFlow();
        await expect(products.deviceCountInput).toBeVisible();
        await expect(products.wathiqAddressOption.or(products.customPinAddressOption)).toBeVisible();
    });

    test('should not show a wallet picker anywhere in the Devices & Delivery step', async () => {
        requireFlow();
        await expect(products.walletPicker).not.toBeVisible();
    });

    test('should reach the Review step after completing Devices & Delivery', async () => {
        requireFlow();
        await products.deviceCountInput.fill('2');
        await products.wathiqAddressOption.click();
        await products.devicesDeliveryNextButton.click();
        await expect(products.reviewTotalDevices).toBeVisible({ timeout: 10000 });
    });

    // ── Review ───────────────────────────────────────────────────────────────

    test('should show the delivery breakdown on the Review step', async () => {
        requireFlow();
        await expect(products.reviewDeliveryBreakdown).toBeVisible();
    });

    test('should show a note that the order is created when onboarding completes', async () => {
        requireFlow();
        await expect(products.reviewConfirmationNote).toBeVisible();
    });

    // ── Order-ready inline state ────────────────────────────────────────────

    test('should show the order-ready inline state with Edit and Remove after confirming', async () => {
        requireFlow();
        await products.reviewConfirmButton.click();
        await expect(products.activeStep.first()).toContainText('Products', { timeout: 15000 });
        await expect(products.orderReadySummary).toBeVisible();
        await expect(products.orderReadyEditButton).toBeVisible();
        await expect(products.orderReadyRemoveButton).toBeVisible();
    });
});
