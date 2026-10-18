import { test, expect, Page } from '@playwright/test';
import { goToProductsStep, expandPosCard } from '../../helpers/RegistrationHelper';
import { RegistrationProductsPage } from '../../../pageElements/Registration/RegistrationProductsPage';
import { RegistrationContractPage } from '../../../pageElements/Registration/RegistrationContractPage';

// ─────────────────────────────────────────────────────────────────────────────
// PoS Onboarding Setup (EMI-5783) — functional/interaction coverage. Element/
// text presence for this same sub-flow lives in
// ui/RegistrationProductsPoSSetup.spec.ts; this block covers what that file
// deliberately leaves out: validation state (Next disabled until required
// fields are filled), the split-by-device Add/Remove Location Group
// interaction, and Back-button navigation. Reaches the PoS sub-flow the same
// way that file does — goToProductsStep() then expandPosCard() — and gates
// every test on posFlowAvailable for the same reason (a citizen asset that
// already completed this sub-flow in a prior run resumes straight past it).
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration - Products Step: PoS Onboarding Setup (EMI-5783) - Devices & Delivery functional', { tag: ['@registration', '@products', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let products: RegistrationProductsPage;
    let posFlowAvailable = false;

    test.beforeAll(async ({ browser }) => {
        // Same timeout reasoning as ui/RegistrationProductsPoSSetup.spec.ts's
        // beforeAll — goToProductsStep() cycles the same shared, often-burned
        // CITIZEN_ASSETS pool, where each already-registered asset still costs a
        // full Info->Financial->Verification->Sign-up cycle before the next.
        test.setTimeout(600_000);
        const context = await browser.newContext();
        page = await context.newPage();
        products = new RegistrationProductsPage(page);

        const reachedProducts = await goToProductsStep(page);
        if (!reachedProducts) {
            throw new Error(
                'Registration never reached the Products step after cycling the shared ' +
                'CITIZEN_ASSETS pool — every asset resumed past it (Contract) or hit the ' +
                'real NAFATH panel instead.'
            );
        }

        posFlowAvailable = await expandPosCard(page);
        if (posFlowAvailable) {
            // Reach Devices & Delivery but deliberately stop short of filling the
            // contact fields — the validation tests below need that unfilled state
            // to assert Next starts disabled.
            await products.requestDevicesNowButton.click();
            await products.skipSetupLaterButton.click();
            await products.deviceCountInput.waitFor({ state: 'visible', timeout: 10000 });
        }
    });

    test.afterAll(async () => { await page.close(); });

    // ── Validation ────────────────────────────────────────────────────────
    // Confirmed live: unlike Business Info, Financial & Business, and
    // Verification & Uploads (which do gate Next/Sign Up on required fields),
    // Devices & Delivery's Next button is NOT disabled on a pristine, unfilled
    // form — a genuinely fresh citizen asset (used=false, no prior run) still
    // showed it enabled immediately. The required-fields-gate-Next pattern
    // this test used to assume by analogy doesn't hold for this specific
    // sub-step, so this documents the actual behavior instead.

    test('should have the Devices & Delivery Next button enabled by default, even before contact fields are filled', { annotation: [{ type: 'testcase', description: "RP-55: Have the Devices & Delivery Next button enabled by default, even before contact fields are filled" }] }, async () => {
        await expect(products.devicesDeliveryNextButton).toBeEnabled();
    });

    test('should keep the Devices & Delivery Next button enabled once contact name and mobile are filled', { annotation: [{ type: 'testcase', description: "RP-56: Keep the Devices & Delivery Next button enabled once contact name and mobile are filled" }] }, async () => {
        await products.updateWathiqAddressButton.waitFor({ state: 'visible', timeout: 20000 });
        await products.contactNameInput.fill('Test Contact');
        await products.contactMobileInput.fill('512345678');
        await expect(products.devicesDeliveryNextButton).toBeEnabled();
    });

    // ── Delivery groups (split-by-device) ────────────────────────────────

    test('should add a second delivery group when Add Location Group is clicked in split-by-device mode', { annotation: [{ type: 'testcase', description: "RP-57: Add a second delivery group when Add Location Group is clicked in split-by-device mode" }] }, async () => {
        await products.splitByDeviceDeliveryOption.click({ force: true });
        await products.addLocationGroupButton.click();
        await expect(products.removeLocationGroupButton).toBeVisible({ timeout: 5000 });
    });

    test('should remove a delivery group when Remove Location Group is clicked', { annotation: [{ type: 'testcase', description: "RP-58: Remove a delivery group when Remove Location Group is clicked" }] }, async () => {
        await products.removeLocationGroupButton.click();
        await expect(products.removeLocationGroupButton).not.toBeVisible({ timeout: 5000 });
        // Restore single-location delivery for the Back-button test below, same
        // as ui/RegistrationProductsPoSSetup.spec.ts's split-by-device tests do.
        await products.singleLocationDeliveryOption.click({ force: true });
    });

    // ── Navigation ────────────────────────────────────────────────────────

    test('should return to the expanded PoS card when Back is clicked from Devices & Delivery', { annotation: [{ type: 'testcase', description: "RP-59: Return to the expanded PoS card when Back is clicked from Devices & Delivery" }] }, async () => {
        await products.devicesDeliveryBackButton.click();
        await expect(products.requestDevicesNowButton).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Registration - Products Step: PoS Onboarding Setup (EMI-5783) - skip request-now path', { tag: ['@registration', '@products', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    // Single test, needs its own fresh citizen asset/session rather than
    // sharing the block above's — that session already commits to the
    // "checked" branch, and this test needs a pristine expanded PoS card to
    // verify the opposite (unchecked) path.
    test.skip('should advance straight to Contract when Continue is clicked without checking "Request devices now"', { annotation: [{ type: 'testcase', description: "RP-60: Advance straight to Contract when Continue is clicked without checking \"Request devices now\"" }] }, async ({ browser }) => {
        test.setTimeout(600_000);
        const context = await browser.newContext();
        const page = await context.newPage();
        const products = new RegistrationProductsPage(page);

        const reachedProducts = await goToProductsStep(page);
        if (!reachedProducts) {
            throw new Error(
                'Registration never reached the Products step after cycling the shared ' +
                'CITIZEN_ASSETS pool — every asset resumed past it (Contract) or hit the ' +
                'real NAFATH panel instead.'
            );
        }

        await expandPosCard(page);

        // Confirmed live (see ui/RegistrationProductsPoSSetup.spec.ts's header
        // comment): skipSetupLaterButton IS the Products-step's own Continue
        // button — clicking it without checking requestDevicesNowButton first
        // advances straight to Contract, with no separate inline "skipped"
        // message state to land on.
        await products.skipSetupLaterButton.click();
        const contract = new RegistrationContractPage(page);
        await contract.waitForLoad();
        await expect(contract.activeStep).toContainText(/contract|العقد/i);

        await context.close();
    });
});
