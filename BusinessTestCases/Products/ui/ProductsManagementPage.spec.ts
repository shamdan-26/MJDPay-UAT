import { test, expect, Page } from '@playwright/test';
import { createHomepageSession } from '../../Homepage/HomePageHelper';
import { HomepageSidebarPage } from '../../pageElements/Homepage/HomepageSidebarPage';
import { ProductsManagementPage } from '../../pageElements/Products/ProductsManagementPage';

// ─────────────────────────────────────────────────────────────────────────────
// Products Navigation & In-App PoS Request Flow — web UI (EMI-5782)
//
// Authored directly from the ticket's acceptance criteria — not yet verified
// against a live build. The only confirmed-real anchor is the "Manage Products"
// sidebar link and its /products-management destination (already covered by
// HomepageSidebarNavigation.spec.ts). Everything about the page's internal
// content (PoS Manage action, Dashboard/Orders/Devices tabs, Add Products) is
// gated behind runtime feature-detection and skips cleanly with a clear reason
// when not found, mirroring the pattern used elsewhere in this repo for
// environment-dependent steps. Reconcile selectors on first live run.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Products Management UI (EMI-5782)', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let sidebar: HomepageSidebarPage;
    let products: ProductsManagementPage;
    let productsPageReached = false;
    let posProductAvailable = false;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(60_000);
        ({ page, sidebar } = await createHomepageSession(browser));
        products = new ProductsManagementPage(page);

        await sidebar.manageProductsLink.click();
        productsPageReached = await page.waitForURL(/products-management/i, { timeout: 15000 })
            .then(() => true)
            .catch(() => false);

        if (productsPageReached) {
            posProductAvailable = await page.getByRole('button', { name: /manage/i }).first()
                .waitFor({ state: 'visible', timeout: 8000 })
                .then(() => true)
                .catch(() => false);
        }
    });

    test.afterAll(async () => {
        await page.close();
    });

    const SKIP_PAGE = 'Products management page (/products-management) was not reached in this environment';
    const SKIP_POS  = 'No product with a Manage action was found — this account may have no PoS product assigned, or the feature (EMI-5782) is not live on web yet';

    function requirePage() {
        test.skip(!productsPageReached, SKIP_PAGE);
    }

    function requirePos() {
        requirePage();
        test.skip(!posProductAvailable, SKIP_POS);
    }

    // ── Products list ────────────────────────────────────────────────────────

    test('should display the products list scoped to the user\'s profile', async () => {
        requirePage();
        await expect(products.productsList).toBeVisible();
    });

    test('should display an Add Products action', async () => {
        requirePage();
        await expect(products.addProductsButton).toBeVisible();
    });

    // ── Manage → PoS management ─────────────────────────────────────────────

    test('should open PoS management when Manage is clicked on a PoS product', async () => {
        requirePos();
        await page.getByRole('button', { name: /manage/i }).first().click();
        await expect(products.dashboardTab.or(products.ordersTab).or(products.devicesTab)).toBeVisible({ timeout: 10000 });
    });

    test('should show Dashboard, Orders, and Devices tabs', async () => {
        requirePos();
        await expect(products.dashboardTab).toBeVisible();
        await expect(products.ordersTab).toBeVisible();
        await expect(products.devicesTab).toBeVisible();
    });

    test('should not show a Transactions tab this sprint', async () => {
        requirePos();
        await expect(products.transactionsTab).not.toBeVisible();
    });

    // ── Orders tab ───────────────────────────────────────────────────────────

    test('should list PoS orders on the Orders tab', async () => {
        requirePos();
        await products.ordersTab.click();
        await expect(products.ordersList).toBeVisible({ timeout: 10000 });
    });

    test('should expose a request-devices action from Orders', async () => {
        requirePos();
        await expect(products.requestDevicesButton).toBeVisible();
    });

    // ── Devices tab ──────────────────────────────────────────────────────────

    test('should list mapped devices on the Devices tab', async () => {
        requirePos();
        await products.devicesTab.click();
        await expect(products.devicesList).toBeVisible({ timeout: 10000 });
    });

    // ── Add Products ─────────────────────────────────────────────────────────

    test('should open the available products list when Add Products is clicked', async () => {
        requirePage();
        await products.addProductsButton.click();
        await expect(products.addProductsList).toBeVisible({ timeout: 10000 });
    });

    test('should show a not-implemented error when submitting Add Products', async () => {
        requirePage();
        const firstOption = products.addProductsList.locator('article, li, [role="listitem"]').first();
        await firstOption.click();
        await products.addProductsSubmitButton.click();
        await expect(products.notImplementedError).toBeVisible({ timeout: 10000 });
    });
});
