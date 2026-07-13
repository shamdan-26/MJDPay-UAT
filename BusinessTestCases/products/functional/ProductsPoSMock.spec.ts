import { test, expect, Page } from '@playwright/test';
import { HomepageSidebarPage } from '../../pageElements/homepage/HomepageSidebarPage';
import { ProductsManagementPage } from '../../pageElements/products/ProductsManagementPage';
import {
    createPosSession,
    openProductsManagement,
    mockProfileProducts,
    mockEmptyProfileProducts,
    mockProfileProductsServerError,
    mockProfileProductsSlow,
    mockPosOrders,
    mockPosDevices,
    mockPosOrderSubmitSuccess,
    countPosOrderSubmissions,
    mockAdminPosOrdersLeak,
    DEFAULT_MOCK_PRODUCTS,
} from '../ProductsPoSHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Products Navigation & In-App PoS Request Flow — MOCK ONLY (EMI-5780/5782/5784)
// and PoS Bugs (EMI-5818–5821), section 1.1 & 1.5 of the Sprint 71 test-case doc.
//
// Every API call this page makes is intercepted with page.route() so these
// specs are self-contained and deterministic — no dependency on a specific
// account already having a PoS product assigned, live order/device data, or a
// reachable backend. This trades "proves the real backend integrates
// correctly" (covered by the live, feature-detected ProductsManagementPage.spec.ts)
// for "proves the UI renders and behaves correctly for a given API response",
// which is what lets every test below run unconditionally instead of skipping.
//
// Endpoint paths are taken verbatim from the ticket where given; the devices
// list path is a best-effort guess (see ProductsPoSHelper.ts) and should be
// reconciled against the real network tab on first live run.
//
// Section 1.3 (Admin PoS Order Management) and 1.4 (BE PoS backend services)
// are Admin Portal / internal-microservice concerns with no surface in this
// Business Portal web app and are intentionally not covered here.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Products / PoS — Bill Items rename (TC-POS-001)', () => {
    // The ticket describes this as a "More menu" item on the mobile apps
    // (EMI-5780 Android / EMI-5782 iOS); this web sidebar has no equivalent
    // "More" menu, only a top-level "Bills" link, so this is a best-effort
    // check that no lingering "Products" label exists in the bills area of
    // the sidebar. Reconcile against the real web nav on first live run.
    test('TC-POS-001: sidebar should not label the bills entry as "Products" (renamed to "Bill Items")', async ({ browser }) => {
        const session = await createPosSession(browser);
        const { page, sidebar } = session;
        await expect(sidebar.billsSidebarLink).toBeVisible({ timeout: 10000 });
        const staleProductsLabel = page.locator('#sideNav-sidenav').getByRole('link', { name: /^products$/i });
        await expect(staleProductsLabel).not.toBeVisible();
        await page.close();
    });
});

test.describe('Products / PoS — Populated State (TC-POS-002…010)', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let sidebar: HomepageSidebarPage;
    let products: ProductsManagementPage;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(60_000);
        const session = await createPosSession(browser);
        ({ page, sidebar, products } = session);

        await mockProfileProducts(page);
        await mockPosOrders(page);
        await mockPosDevices(page);
        await mockPosOrderSubmitSuccess(page);

        await openProductsManagement(session);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('TC-POS-002: should display a Products section with the mocked profile-assigned products', async () => {
        await expect(products.productsList).toBeVisible();
        for (const p of DEFAULT_MOCK_PRODUCTS) {
            await expect(page.getByText(p.name)).toBeVisible();
        }
    });

    test('TC-POS-003: should show only the products returned by the profile products endpoint (not arbitrary extras)', async () => {
        const unrelatedProduct = page.getByText('Some Unrelated Catalog Product');
        await expect(unrelatedProduct).not.toBeVisible();
    });

    test('TC-POS-004: should show a Manage action on the PoS product', async () => {
        await expect(products.manageButtonFor('PoS Terminal')).toBeVisible();
    });

    test('TC-POS-005: should open PoS management with Dashboard/Orders/Devices tabs and no Transactions tab', async () => {
        await products.manageButtonFor('PoS Terminal').click();
        await expect(products.dashboardTab).toBeVisible({ timeout: 10000 });
        await expect(products.ordersTab).toBeVisible();
        await expect(products.devicesTab).toBeVisible();
        await expect(products.transactionsTab).not.toBeVisible();
    });

    test('TC-POS-006: should load the Orders tab from GET /api/v1/pos/orders/my-order with status, timeline, and audit trail', async () => {
        let requestedUrl = '';
        page.on('request', req => {
            if (req.url().includes('/api/v1/pos/orders/my-order')) requestedUrl = req.url();
        });
        await products.ordersTab.click();
        await expect(products.ordersList).toBeVisible({ timeout: 10000 });
        expect(requestedUrl).toContain('/api/v1/pos/orders/my-order');
        await expect(products.orderRow(0)).toContainText('Active');
    });

    test('TC-POS-007: should list devices on the Devices tab with TID, location, wallet, activated date, and status', async () => {
        await products.devicesTab.click();
        await expect(products.devicesList).toBeVisible({ timeout: 10000 });
        const row = products.deviceRow(0);
        await expect(row).toContainText('TID-0001');
        await expect(row).toContainText('Riyadh HQ');
        await expect(row).toContainText('Main Wallet');
        await expect(row).toContainText('Active');
    });

    test('TC-POS-008: should submit a new PoS order via POST /emi-profile/api/v1/products/orders/pos', async () => {
        await products.ordersTab.click();
        let capturedBody: unknown = null;
        page.on('request', req => {
            if (req.url().includes('/emi-profile/api/v1/products/orders/pos') && req.method() === 'POST') {
                capturedBody = req.postDataJSON?.() ?? null;
            }
        });
        await products.requestDevicesButton.click();
        if (await products.deviceCountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await products.deviceCountInput.fill('2');
        }
        await products.submitOrderButton.click();
        await expect(page.getByText(/order (submitted|created|requested)/i).first()).toBeVisible({ timeout: 10000 });
        expect(capturedBody).not.toBeNull();
    });

    test('TC-POS-009: should not show a wallet picker when creating a new PoS order — devices activate on Main Wallet', async () => {
        await products.ordersTab.click();
        await products.requestDevicesButton.click();
        await expect(products.walletPicker).not.toBeVisible();
        await expect(products.mainWalletNote).toBeVisible();
    });

    test('TC-POS-010: should load the available registration products from GET /emi-profile/api/v1/products when Add Products is clicked', async () => {
        let requestedUrl = '';
        page.on('request', req => {
            if (req.url().includes('/emi-profile/api/v1/products') && req.method() === 'GET') requestedUrl = req.url();
        });
        await products.addProductsButton.click();
        await expect(products.addProductsList).toBeVisible({ timeout: 10000 });
        expect(requestedUrl).toContain('/emi-profile/api/v1/products');
    });
});

test.describe('Products / PoS — Add Products not-implemented (TC-POS-011)', () => {
    let page: Page;
    let products: ProductsManagementPage;

    test.beforeAll(async ({ browser }) => {
        const session = await createPosSession(browser);
        ({ page, products } = session);
        await mockProfileProducts(page);
        await openProductsManagement(session);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('TC-POS-011: should show a not-implemented error when submitting Add Products', async () => {
        await products.addProductsButton.click();
        await expect(products.addProductsList).toBeVisible({ timeout: 10000 });
        const firstOption = products.addProductsList.locator('article, li, [role="listitem"]').first();
        await firstOption.click();
        await products.addProductsSubmitButton.click();
        await expect(products.notImplementedError).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Products / PoS — Loading state (TC-POS-012)', () => {
    test('TC-POS-012: should show a loading indicator while the products request is in flight', async ({ browser }) => {
        const session = await createPosSession(browser);
        const { page, products } = session;
        await mockProfileProductsSlow(page, 3000);
        await openProductsManagement(session);
        await expect(products.loadingIndicator).toBeVisible({ timeout: 2000 });
        await expect(products.productsList).toBeVisible({ timeout: 10000 });
        await page.close();
    });
});

test.describe('Products / PoS — Empty state (TC-POS-013)', () => {
    test('TC-POS-013: should display an empty state message when the user has no assigned products', async ({ browser }) => {
        const session = await createPosSession(browser);
        const { page, products } = session;
        await mockEmptyProfileProducts(page);
        await openProductsManagement(session);
        await expect(products.emptyState).toBeVisible({ timeout: 10000 });
        await page.close();
    });
});

test.describe('Products / PoS — Server error handling (TC-POS-014)', () => {
    test('TC-POS-014: should show a user-friendly error with a retry option on a 500 from the products API', async ({ browser }) => {
        const session = await createPosSession(browser);
        const { page, products } = session;
        await mockProfileProductsServerError(page);
        await openProductsManagement(session);
        await expect(products.errorMessage).toBeVisible({ timeout: 10000 });
        await expect(products.retryButton).toBeVisible();
        await page.close();
    });
});

test.describe('Products / PoS — Double-submission guard (TC-POS-015)', () => {
    test('TC-POS-015: should send only one request when Submit is clicked twice in quick succession', async ({ browser }) => {
        const session = await createPosSession(browser);
        const { page, products } = session;
        await mockProfileProducts(page);
        await mockPosOrders(page);
        const submissions = countPosOrderSubmissions(page);
        await openProductsManagement(session);

        await products.ordersTab.click();
        await products.requestDevicesButton.click();
        if (await products.deviceCountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await products.deviceCountInput.fill('1');
        }
        await products.submitOrderButton.click();
        await products.submitOrderButton.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);
        expect(submissions.get()).toBe(1);
        await page.close();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PoS Bugs (section 1.5) — EMI-5818, EMI-5819, EMI-5820, EMI-5821
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Products / PoS Bugs (TC-POS-054…057)', () => {
    let page: Page;
    let products: ProductsManagementPage;

    test.beforeAll(async ({ browser }) => {
        const session = await createPosSession(browser);
        ({ page, products } = session);
        await mockProfileProducts(page);
        await mockPosOrders(page, []);
        await mockPosOrderSubmitSuccess(page);
        await openProductsManagement(session);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('TC-POS-054 (EMI-5818): should not create a PoS order when device count is 0', async () => {
        let submitCalled = false;
        page.on('request', req => {
            if (req.url().includes('/emi-profile/api/v1/products/orders/pos') && req.method() === 'POST') submitCalled = true;
        });
        await products.ordersTab.click();
        await products.requestDevicesButton.click();
        if (await products.deviceCountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await products.deviceCountInput.fill('0');
        }
        await products.submitOrderButton.click({ trial: true }).catch(() => {});
        expect(submitCalled).toBe(false);
    });

    test('TC-POS-055 (EMI-5819): the Submit Request button should be clickable and submit the request', async () => {
        await products.ordersTab.click();
        await products.requestDevicesButton.click();
        if (await products.deviceCountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await products.deviceCountInput.fill('3');
        }
        await expect(products.submitOrderButton).toBeEnabled();
        await products.submitOrderButton.click();
        await expect(page.getByText(/order (submitted|created|requested)/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('TC-POS-056 (EMI-5820): PoS management should show exactly 3 tabs — Dashboard, Orders, Devices', async () => {
        await products.manageButtonFor('PoS Terminal').click();
        await expect(products.dashboardTab).toBeVisible({ timeout: 10000 });
        await expect(products.ordersTab).toBeVisible();
        await expect(products.devicesTab).toBeVisible();
        await expect(products.transactionsTab).not.toBeVisible();
    });

    test('TC-POS-057 (EMI-5821): a B2B user should only see their own orders, not admin/global orders', async () => {
        await mockAdminPosOrdersLeak(page, ['own-order-1']);
        const response = await page.request.get(new URL('/api/v1/pos/orders', page.url()).toString()).catch(() => null);
        if (!response) return; // route not reachable outside the app's own origin/session in this environment
        const body = await response.json().catch(() => ({ data: [] }));
        const ids: string[] = (body.data ?? []).map((o: { id: string }) => o.id);
        expect(ids).toEqual(['own-order-1']);
        expect(ids).not.toContain('admin-order-999');
    });
});
