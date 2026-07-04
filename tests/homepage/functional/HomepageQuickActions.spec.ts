import { test, expect, Page } from '@playwright/test';
import { HOME_URL, BASE_ORIGIN, ACCOUNT_1_STORAGE_STATE } from '../../pageObjectsHelpers/HomePageHelper';
import { DashboardPage } from '../../pageElements/DashboardPage';
import { waitForToastClear } from '../../shared';

test.describe('Homepage – Quick actions navigation', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let dashboard: DashboardPage;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext({ storageState: ACCOUNT_1_STORAGE_STATE });
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        page = await context.newPage();
        dashboard = new DashboardPage(page);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2500);
        await waitForToastClear(page, 800, 5000);
    });

    test('should navigate to Topup page when the Topup quick action card is clicked', async () => {
        await dashboard.quickActionTopupCard.click();
        await expect(page).toHaveURL(/top-up/i, { timeout: 10000 });
    });

    test('should navigate or open a dialog when the Wallet Transfer quick action is clicked', async () => {
        await expect(dashboard.quickActionWalletTransferCard).toBeVisible();
        await dashboard.quickActionWalletTransferCard.click();

        const dialog = page.locator('[role="dialog"], mat-dialog-container').first();
        const result = await Promise.race([
            dialog.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'dialog' as const),
            page.waitForURL(/transfer/i, { timeout: 8000 }).then(() => 'url' as const),
        ]).catch(() => 'none' as const);

        expect(result, 'Wallet Transfer quick action should navigate or open dialog').not.toBe('none');
    });

    test('should navigate or open a dialog when the Cashout quick action is clicked', async () => {
        await expect(dashboard.quickActionCashoutCard).toBeVisible();
        await dashboard.quickActionCashoutCard.click();

        const dialog = page.locator('[role="dialog"], mat-dialog-container').first();
        const result = await Promise.race([
            dialog.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'dialog' as const),
            page.waitForURL(/cashout|transfer/i, { timeout: 8000 }).then(() => 'url' as const),
        ]).catch(() => 'none' as const);

        expect(result, 'Cashout quick action should navigate or open dialog').not.toBe('none');
    });

    test('should navigate or open a dialog when the Receive Payment quick action is clicked', async () => {
        await expect(dashboard.quickActionReceivePaymentCard).toBeVisible();
        await dashboard.quickActionReceivePaymentCard.click();

        const dialog = page.locator('[role="dialog"], mat-dialog-container, [class*="qr"]').first();
        const result = await Promise.race([
            dialog.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'dialog' as const),
            page.waitForURL(url => !url.toString().includes('/home'), { timeout: 8000 }).then(() => 'url' as const),
        ]).catch(() => 'none' as const);

        expect(result, 'Receive payment quick action should navigate or open dialog').not.toBe('none');
    });
});
