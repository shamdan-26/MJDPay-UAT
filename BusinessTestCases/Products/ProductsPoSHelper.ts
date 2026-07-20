import type { Browser, Page } from '@playwright/test';
import { createHomepageSession } from '../Homepage/HomePageHelper';
import { HomepageSidebarPage } from '../pageElements/Homepage/HomepageSidebarPage';
import { ProductsManagementPage } from '../pageElements/Products/ProductsManagementPage';
import productsPosMocks from '../../data/productsPosMocks.json';

/**
 * Route-mocking helpers for the Products / PoS request flow (EMI-5780/5782/5784,
 * EMI-5818–5821). Endpoint paths below are taken verbatim from the Sprint 71
 * ticket text where given (products list, my-order, order submission, admin
 * orders list); paths with no documented value (devices list) use a best-effort
 * guess and are flagged inline — reconcile against the real network tab on
 * first live run, same caveat as ProductsManagementPage.ts.
 */

export interface MockProduct {
    id: string;
    name: string;
    typeCode: 'POS' | 'WALLET' | 'BILL_PAYMENT' | 'PAYOUTS';
}

export const DEFAULT_MOCK_PRODUCTS: MockProduct[] = productsPosMocks.defaultMockProducts as MockProduct[];

export async function mockProfileProducts(page: Page, products: MockProduct[] = DEFAULT_MOCK_PRODUCTS): Promise<void> {
    await page.route('**/emi-profile/api/v1/products', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: products }) })
    );
}

export async function mockEmptyProfileProducts(page: Page): Promise<void> {
    await mockProfileProducts(page, []);
}

export async function mockProfileProductsServerError(page: Page): Promise<void> {
    await page.route('**/emi-profile/api/v1/products', route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error' }) })
    );
}

export async function mockProfileProductsSlow(page: Page, delayMs = 3000, products: MockProduct[] = DEFAULT_MOCK_PRODUCTS): Promise<void> {
    await page.route('**/emi-profile/api/v1/products', async route => {
        await new Promise(r => setTimeout(r, delayMs));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: products }) });
    });
}

export interface MockPosOrder {
    id: string;
    status: string;
    timeline: { status: string; at: string }[];
    auditTrail: { actor: string; action: string; at: string }[];
}

export const DEFAULT_MOCK_ORDERS: MockPosOrder[] = productsPosMocks.defaultMockOrders as MockPosOrder[];

export async function mockPosOrders(page: Page, orders: MockPosOrder[] = DEFAULT_MOCK_ORDERS): Promise<void> {
    await page.route('**/api/v1/pos/orders/my-order', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: orders }) })
    );
}

export interface MockDevice {
    tid: string;
    sourceOrder: string;
    location: string;
    wallet: string;
    activatedDate: string;
    status: string;
}

export const DEFAULT_MOCK_DEVICES: MockDevice[] = productsPosMocks.defaultMockDevices as MockDevice[];

/** Devices-list endpoint path is not given verbatim in the ticket; this guesses
 *  the sibling-resource pattern of the documented `.../pos/orders/my-order` path. */
export async function mockPosDevices(page: Page, devices: MockDevice[] = DEFAULT_MOCK_DEVICES): Promise<void> {
    await page.route('**/api/v1/pos/devices/**', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: devices }) })
    );
}

export async function mockPosOrderSubmitSuccess(page: Page): Promise<void> {
    await page.route('**/emi-profile/api/v1/products/orders/pos', route =>
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'order-new', status: 'Requesting' }) })
    );
}

/** Counts how many times the PoS order submission endpoint was actually hit —
 *  used to assert double-click / double-submit protection (TC-POS-015). */
export function countPosOrderSubmissions(page: Page): { get: () => number } {
    let count = 0;
    page.route('**/emi-profile/api/v1/products/orders/pos', async route => {
        count++;
        await new Promise(r => setTimeout(r, 500));
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'order-new', status: 'Requesting' }) });
    });
    return { get: () => count };
}

/** Add Products submission has no live endpoint yet per the ticket (TC-POS-011)
 *  — deliberately left unmocked/unrouted so the app's own not-implemented
 *  handling (client-side, since there is no server contract to call) is what
 *  the assertion exercises. */

export async function mockAdminPosOrdersLeak(page: Page, ownOrderIds: string[]): Promise<void> {
    await page.route('**/api/v1/pos/orders', route => {
        const url = route.request().url();
        if (url.endsWith('/pos/orders') || url.includes('/pos/orders?')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: ownOrderIds.map(id => ({ id, status: 'Active' })) }),
            });
        }
        return route.continue();
    });
}

export interface PosSession {
    page: Page;
    sidebar: HomepageSidebarPage;
    products: ProductsManagementPage;
}

/** Restores an authenticated homepage session (see HomePageHelper.createHomepageSession)
 *  without navigating to Products yet, so callers can register route mocks on
 *  the returned `page` first. Call `openProductsManagement` afterwards. */
export async function createPosSession(browser: Browser): Promise<PosSession> {
    const { page, sidebar } = await createHomepageSession(browser);
    const products = new ProductsManagementPage(page);
    return { page, sidebar, products };
}

/** Clicks the "Manage Products" sidebar link and waits for the Products
 *  Management page to load — the same confirmed-real anchor used by
 *  ProductsManagementPage.spec.ts. Call after registering route mocks on
 *  `session.page` so they're in place before the page's initial data-load
 *  requests fire. */
export async function openProductsManagement(session: PosSession): Promise<void> {
    await session.sidebar.manageProductsLink.click();
    await session.page.waitForURL(/products-management/i, { timeout: 15000 });
}
