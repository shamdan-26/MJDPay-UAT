import { test, expect, Page } from '@playwright/test';
import { goToProductsStep } from '../RegistrationHelper';
import { RegistrationProductsPage } from '../../pageElements/Registration/RegistrationProductsPage';

// ─────────────────────────────────────────────────────────────────────────────
// Products Step UI (step 3 of 4) — element/text presence only, per a live DOM
// extraction against dev.majdpay.com/business/auth/register. The app defaults
// to Arabic, so every text assertion here matches EN|AR rather than assuming
// English.
//
// The PoS device-request onboarding sub-flow (EMI-5783: expanding the PoS
// card, Devices & Delivery, Review, order-ready state) is a separate, deeper
// flow and lives in RegistrationProductsPoSSetup.spec.ts — this file only
// covers what's visible on arrival at the Products step itself.
//
// Reaches the Products step via goToProductsStep() (RegistrationHelper.ts),
// which cycles the shared, reused CITIZEN_ASSETS pool whenever a mobile
// resumes past Products (Contract) instead of landing on Products, and clicks
// through the real NAFATH panel's Verify button (after its ~20s redirect
// countdown expires — EMI-4895/EMI-4937) when that appears instead.
//
// This file and RegistrationProductsPoSSetup.spec.ts each pay the full
// goToProductsStep() climb independently in their own beforeAll rather than
// sharing one session — a deliberate trade-off, not an oversight. Persisting
// storageState from this file for the other to reuse would race against it:
// playwright.config.ts runs with fullyParallel: true across up to 5 workers,
// so there's no guarantee this file's beforeAll finishes (or even runs on the
// same worker) before the other file's beforeAll starts.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration - Products Step UI (Page Elements)', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let products: RegistrationProductsPage;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(600_000);
        const context = await browser.newContext();
        page = await context.newPage();
        products = new RegistrationProductsPage(page);

        const reachedProducts = await goToProductsStep(page);
        if (!reachedProducts) {
            throw new Error(
                'Registration never reached the Products step after cycling the shared ' +
                'CITIZEN_ASSETS pool and completing the real NAFATH Verify step wherever ' +
                'it appeared — every asset resumed past Products (Contract) instead.'
            );
        }
    });

    test.afterAll(async () => { await page.close(); });

    // ── Header / Banner ───────────────────────────────────────────────────

    test('should display the MJD Pay logo', async () => {
        await expect(products.logoImage).toBeVisible();
    });

    test('should link the MJD Pay logo to the landing page', async () => {
        await expect(products.logoLink).toHaveAttribute('href', '/business/landing');
    });

    test('should display the EN language button', async () => {
        await expect(products.enButton).toBeVisible();
    });

    test('should display the Arabic language button', async () => {
        await expect(products.arabicButton).toBeVisible();
    });

    test('should display the theme toggle button', async () => {
        await expect(products.themeToggle).toBeVisible();
    });

    // ── Page headings ─────────────────────────────────────────────────────

    test('should display the "Setup" eyebrow text', async () => {
        await expect(products.formEyebrow).toContainText(/setup|إعداد/i);
    });

    test('should display the "Products" title', async () => {
        await expect(products.formTitle).toContainText(/products|المنتجات/i);
    });

    test('should display the products-selection subtitle', async () => {
        await expect(products.formSubTitle).toContainText(/choose the products|اختر المنتجات/i);
    });

    // ── Outer progress bar ───────────────────────────────────────────────

    test('should display all four outer step labels: Business Info, NAFATH, Products, Contract', async () => {
        await expect(products.outerStepBar.filter({ hasText: /business info|بيانات النشاط/i })).toBeVisible();
        await expect(products.outerStepBar.filter({ hasText: /nafath|نَفاذ|نفاذ/i })).toBeVisible();
        await expect(products.outerStepBar.filter({ hasText: /products|المنتجات/i })).toBeVisible();
        await expect(products.outerStepBar.filter({ hasText: /contract|العقد/i })).toBeVisible();
    });

    test('should show "Products" as the active outer step', async () => {
        await expect(products.activeStep.first()).toContainText(/products|المنتجات/i);
    });

    // ── Product cards ─────────────────────────────────────────────────────

    test('should display at least one product card', async () => {
        await expect(products.productCards.first()).toBeVisible();
    });

    test('should display the required Wallet card', async () => {
        await expect(products.walletCard()).toBeVisible();
    });

    test('should show a "Show more" link on the Wallet card', async () => {
        const wallet = products.walletCard();
        await expect(products.showMoreLink(wallet)).toBeVisible();
    });

    test('should show a price/billing label on every visible product card', async () => {
        const count = await products.productCards.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
            await expect(products.productCards.nth(i))
                .toContainText(/free|مجاني|ريال|sar|per_transaction|monthly|annual/i);
        }
    });

    // ── Footer ────────────────────────────────────────────────────────────

    test('should display the selection counter', async () => {
        await expect(products.selectedCounter).toBeVisible();
    });

    test('should display the Cancel button', async () => {
        await expect(products.cancelButton).toBeVisible();
    });

    test('should display the Continue button', async () => {
        await expect(products.continueButton).toBeVisible();
    });
});
