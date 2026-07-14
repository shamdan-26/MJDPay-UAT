import { type Page, type Locator } from '@playwright/test';

/** Authored from EMI-5782's acceptance criteria (Products navigation & in-app
 *  PoS management). Not yet verified against a live build — the only confirmed
 *  real element here is the "Manage Products" sidebar link and its
 *  /products-management destination URL (see HomepageSidebarPage /
 *  HomepageSidebarNavigation.spec.ts). Everything below that point is a
 *  best-effort locator from the ticket's wording; reconcile on first live run. */
export class ProductsManagementPage {
    readonly page: Page;

    readonly pageHeading: Locator;
    readonly productsList: Locator;
    readonly emptyState: Locator;
    readonly loadingIndicator: Locator;
    readonly addProductsButton: Locator;

    // Manage → PoS management
    readonly dashboardTab: Locator;
    readonly ordersTab: Locator;
    readonly devicesTab: Locator;
    readonly transactionsTab: Locator;

    // Orders
    readonly ordersList: Locator;
    readonly requestDevicesButton: Locator;

    // Devices
    readonly devicesList: Locator;

    // Add Products
    readonly addProductsList: Locator;
    readonly addProductsSubmitButton: Locator;
    readonly notImplementedError: Locator;

    // New PoS order request (from Orders tab)
    readonly newPosOrderDialog: Locator;
    readonly deviceCountInput: Locator;
    readonly walletPicker: Locator;
    readonly mainWalletNote: Locator;
    readonly deliveryAddressField: Locator;
    readonly submitOrderButton: Locator;

    // Error / retry state
    readonly errorMessage: Locator;
    readonly retryButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.pageHeading      = page.getByRole('heading', { name: /^products$/i });
        this.productsList     = page.locator('[class*="product-list"], [class*="products-list"], main').first();
        this.emptyState       = page.getByText(/no products|nothing (here|to show)|empty/i).first();
        this.loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], [role="progressbar"]').first();
        this.addProductsButton = page.getByRole('button', { name: /add products?/i });

        this.dashboardTab    = page.getByRole('tab', { name: /dashboard/i });
        this.ordersTab       = page.getByRole('tab', { name: /orders/i });
        this.devicesTab      = page.getByRole('tab', { name: /devices/i });
        this.transactionsTab = page.getByRole('tab', { name: /transactions/i });

        this.ordersList           = page.locator('[class*="order-list"], [class*="orders-list"]').first();
        this.requestDevicesButton = page.getByRole('button', { name: /request (additional )?devices?|new (pos )?order/i });

        this.devicesList = page.locator('[class*="device-list"], [class*="devices-list"]').first();

        this.addProductsList         = page.locator('[class*="product-list"], [class*="products-list"], [role="list"]').first();
        this.addProductsSubmitButton = page.getByRole('button', { name: /^(submit|add|confirm)$/i });
        this.notImplementedError     = page.getByText(/not implemented|not yet available|coming soon/i).first();

        this.newPosOrderDialog = page.getByRole('dialog').filter({ hasText: /device/i })
            .or(page.locator('[class*="new-order"], [class*="order-dialog"]')).first();
        this.deviceCountInput  = page.getByRole('spinbutton', { name: /number of devices|device count/i })
            .or(page.getByRole('textbox', { name: /number of devices|device count/i }));
        this.walletPicker = page.getByRole('combobox', { name: /wallet/i })
            .or(page.getByRole('listbox', { name: /wallet/i }));
        this.mainWalletNote = page.getByText(/main wallet/i).first();
        this.deliveryAddressField = page.getByRole('textbox', { name: /address/i })
            .or(page.getByText(/national address|custom (map )?pin/i)).first();
        this.submitOrderButton = page.getByRole('button', { name: /^submit( request)?$/i });

        this.errorMessage = page.getByText(/something went wrong|failed to load|error occurred/i).first();
        this.retryButton  = page.getByRole('button', { name: /retry|try again/i });
    }

    productItem(name: string): Locator {
        return this.page
            .locator('article, li, [class*="product-item"], [class*="product-card"]')
            .filter({ hasText: name })
            .first();
    }

    manageButtonFor(productName: string): Locator {
        return this.productItem(productName).getByRole('button', { name: /manage/i });
    }

    orderRow(index = 0): Locator {
        return this.ordersList.locator('article, li, [role="listitem"], tr').nth(index);
    }

    deviceRow(index = 0): Locator {
        return this.devicesList.locator('article, li, [role="listitem"], tr').nth(index);
    }
}
