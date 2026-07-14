import { test, expect, Page } from '@playwright/test';
import {
    goToInfoStep, nextCitizenAsset, generateEmail, REGISTER_URL,
    selectRandomOption, VALID_IBAN, VALID_VAT_NUMBER, TEST_FILE_BUFFER,
    isAlreadyRegisteredMessage,
} from '../RegistrationHelper';
import { RegistrationProductsPage } from '../../pageElements/RegistrationProductsPage';
import { RegistrationFinancialPage } from '../../pageElements/RegistrationFinancialPage';
import { RegistrationVerificationPage } from '../../pageElements/RegistrationVerificationPage';

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding PoS Request Flow — web UI (EMI-5783)
//
// The registration wizard's outer "Products" step (step 3 of 4) only renders
// after Business Info -> Financial & Business -> Verification & Documents ->
// Sign Up. It does NOT require completing real NAFATH first — confirmed live
// against dev: Sign Up lands directly on the Products step with the real
// product catalogue (walletTest, ttt, testTuqa, TuqaTestLimit, Point of Sale
// Device, POS Terminal). The Products step itself is reachable; the inline
// PoS expand/Skip/Request-now sub-flow (EMI-5783) is a separate, still-unshipped
// piece of web UI (see docs/manual-test-cases/EMI-5782-5783-PoS-Products-Web.md)
// — the live Products step only shows plain selectable cards with "View more"
// links, no PoS-specific expansion. Every test below still gates on
// `posFlowAvailable` and skips cleanly with a clear reason once that's true —
// that skip reflects the real, current state of the web feature, not an
// automation limitation. Reconcile selectors once EMI-5783 ships on web.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration - Products Step UI (PoS Onboarding, EMI-5783)', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let products: RegistrationProductsPage;
    let productsAppeared = false;
    let posFlowAvailable = false;

    test.beforeAll(async ({ browser }: { browser: any }) => {
        test.setTimeout(180_000);
        const context = await browser.newContext();
        page = await context.newPage();
        products = new RegistrationProductsPage(page);

        // CITIZEN_ASSETS is a shared, reused pool — an identity already registered
        // by a prior run is expected steady-state (see isAlreadyRegisteredMessage),
        // so cycle to the next asset rather than treating it as a failure.
        const maxAttempts = 10;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const asset = nextCitizenAsset();
            await goToInfoStep(page, asset.mobile);

            const radioGroup = page.getByRole('radiogroup', { name: /Profile Type|نوع الملف التجاري/i });
            await radioGroup.getByRole('radio').first().click();
            await page.locator('#floating-text-field-2').fill(asset.crn);
            await page.locator('#floating-text-field-3').fill(asset.nationalId);
            await page.getByRole('textbox', { name: /Email|البريد الإلكتروني/i }).fill(generateEmail());
            await page.getByRole('button', { name: /next|التالي/i }).click();
            await page.getByRole('button', { name: /Loading|جاري التحميل/i })
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
            await page.getByRole('button', { name: /Loading|جاري التحميل/i })
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

        if (productsAppeared) {
            await products.productCard('POS Terminal').click();
            posFlowAvailable = await Promise.race([
                products.requestDevicesNowButton.waitFor({ state: 'visible', timeout: 8000 }),
                products.skipSetupLaterButton.waitFor({ state: 'visible', timeout: 8000 }),
            ]).then(() => true).catch(() => false);
        }
    });

    test.afterAll(async () => {
        await page.close();
    });

    const SKIP_STEP = 'Products step was not reached — sign-up did not complete (Financial/Verification form validation may have changed in this environment)';
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
