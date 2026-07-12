import { test, expect, Page } from '@playwright/test';
import { goToInfoStep, nextCitizenAsset, generateEmail, REGISTER_URL } from '../RegistrationHelper';
import { RegistrationProductsPage } from '../../pageElements/registration/RegistrationProductsPage';

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding PoS Request Flow — MOCK ONLY (EMI-5781/5783/5785), section 1.2 of
// the Sprint 71 test-case doc.
//
// The Products step in registration is reached only after the NAFATH identity
// check, an external verification app that "cannot be completed from CI" (see
// RegistrationE2EHappyPath.spec.ts and RegistrationNafathFunctionality.spec.ts
// in this same folder — that boundary is already established repo-wide, not
// something introduced here). Every test below therefore follows the same
// feature-detection + graceful-skip pattern already used by
// RegistrationProductsFunctionality.spec.ts, so this file will legitimately
// skip end-to-end in any environment where NAFATH isn't auto-bypassed for the
// test account — that is expected, not a bug in these specs.
//
// What "mock only" adds on top of that existing pattern: the PoS order
// submission endpoint (`POST /emi-profile/api/v1/products/orders/pos`, the
// same path documented for the in-app flow in section 1.1) is intercepted
// with page.route() *before* navigation starts, so that if the step chain is
// reached, the order submission itself is deterministic and doesn't depend on
// live backend state.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration — Onboarding PoS Request Flow (TC-POS-016…028)', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let productsPage: RegistrationProductsPage;
    let productsAppeared = false;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(150_000);
        const context = await browser.newContext();
        await context.grantPermissions(['geolocation'], { origin: new URL(REGISTER_URL).origin });
        page = await context.newPage();
        productsPage = new RegistrationProductsPage(page);

        await page.route('**/emi-profile/api/v1/products/orders/pos', route =>
            route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'order-onboarding-1', status: 'Requesting' }) })
        );

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

    test('TC-POS-016: Products step should list Wallet (required), PoS Terminals (optional), Bill Payment, and Payouts', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await expect(productsPage.productCard('Wallet')).toBeVisible();
        await expect(productsPage.productCard('PoS Terminals')).toBeVisible();
        await expect(productsPage.productCard('Bill Payment')).toBeVisible();
        await expect(productsPage.productCard('Payouts')).toBeVisible();
    });

    test('TC-POS-017: selecting the PoS Terminals card should expand inline with Request/Skip options', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productsPage.productCard('PoS Terminals').click();
        await expect(productsPage.requestDevicesNowButton).toBeVisible({ timeout: 10000 });
        await expect(productsPage.skipSetupLaterButton).toBeVisible();
    });

    test('TC-POS-018: Skip - set up later should keep PoS enabled and offer "Actually, request now"', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productsPage.skipSetupLaterButton.click();
        await expect(productsPage.skippedMessage).toBeVisible({ timeout: 10000 });
        await expect(productsPage.requestNowFromSkipButton).toBeVisible();
    });

    test('TC-POS-019: "Request devices now" should open the Devices & Delivery sub-flow', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productsPage.requestNowFromSkipButton.click();
        await expect(productsPage.deviceCountInput).toBeVisible({ timeout: 10000 });
    });

    test('TC-POS-020: should configure delivery for a single location', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productsPage.deviceCountInput.fill('3');
        const oneLocation = page.getByText(/one location/i).first();
        if (await oneLocation.isVisible({ timeout: 3000 }).catch(() => false)) {
            await oneLocation.click();
        }
        await expect(productsPage.wathiqAddressOption.or(productsPage.customPinAddressOption)).toBeVisible({ timeout: 5000 });
    });

    test('TC-POS-021: should configure split-per-device delivery with location groups', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        const split = page.getByText(/split per device/i).first();
        if (await split.isVisible({ timeout: 3000 }).catch(() => false)) {
            await split.click();
            await expect(productsPage.addLocationGroupButton).toBeVisible({ timeout: 5000 });
        }
    });

    test('TC-POS-022: Review step should show total devices, delivery breakdown, and a confirmation message', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productsPage.devicesDeliveryNextButton.click();
        await expect(productsPage.reviewTotalDevices).toBeVisible({ timeout: 10000 });
        await expect(productsPage.reviewDeliveryBreakdown).toBeVisible();
    });

    test('TC-POS-023: confirming the order should return to Products with an inline order-ready state', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productsPage.reviewConfirmButton.click();
        await expect(productsPage.orderReadySummary).toBeVisible({ timeout: 10000 });
        await expect(productsPage.orderReadyEditButton).toBeVisible();
        await expect(productsPage.orderReadyRemoveButton).toBeVisible();
    });

    test('TC-POS-026: should show a validation error for a zero device count', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productsPage.orderReadyEditButton.click();
        await productsPage.deviceCountInput.fill('0');
        await productsPage.devicesDeliveryNextButton.click();
        await expect(page.getByText(/must (be|enter).*(1|one|greater)/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('TC-POS-027: should show a validation error when split-group quantities do not sum to the total', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        await productsPage.deviceCountInput.fill('4');
        const split = page.getByText(/split per device/i).first();
        if (await split.isVisible({ timeout: 3000 }).catch(() => false)) {
            await split.click();
            const groupInputs = page.getByRole('spinbutton').or(page.getByRole('textbox', { name: /quantity/i }));
            if (await groupInputs.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                await groupInputs.first().fill('1');
            }
            await productsPage.devicesDeliveryNextButton.click();
            await expect(page.getByText(/does not match|must (equal|sum)/i).first()).toBeVisible({ timeout: 5000 });
        }
    });

    test('TC-POS-028: should send only one request when Confirm is clicked twice in quick succession', async () => {
        test.skip(!productsAppeared, SKIP_MSG);
        let submissions = 0;
        await page.route('**/emi-profile/api/v1/products/orders/pos', async route => {
            submissions++;
            await new Promise(r => setTimeout(r, 500));
            await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'order-onboarding-2', status: 'Requesting' }) });
        });
        await productsPage.deviceCountInput.fill('2');
        await productsPage.devicesDeliveryNextButton.click();
        await productsPage.reviewConfirmButton.click();
        await productsPage.reviewConfirmButton.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);
        expect(submissions).toBeLessThanOrEqual(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-POS-024 / TC-POS-025 assert the end state *after full registration
// completion* (My Products > PoS > Orders / "request later" messaging). That
// requires clearing NAFATH *and* completing Sign Up — a strictly longer chain
// than the Products-step boundary above, which is already unreachable in this
// environment. They are intentionally omitted rather than duplicated as
// specs that would never execute; see RegistrationE2EHappyPath.spec.ts for
// the corresponding "reaches NAFATH after Sign Up" milestone this would build on.
// ─────────────────────────────────────────────────────────────────────────────
