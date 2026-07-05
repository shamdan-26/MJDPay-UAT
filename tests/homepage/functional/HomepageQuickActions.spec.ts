import { test, expect, Page } from '@playwright/test';
import { createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { HomepageQuickActionsPage } from '../../pageElements/homepage/HomepageQuickActionsPage';

test.describe('Homepage – Quick actions navigation', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let quickActions: HomepageQuickActionsPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, quickActions } = await createHomepageSession(browser));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should navigate to Topup page when the Topup quick action card is clicked', async () => {
        await quickActions.quickActionTopupCard.click();
        await expect(page).toHaveURL(/top-up/i, { timeout: 10000 });
    });

    test('should navigate or open a dialog when the Wallet Transfer quick action is clicked', async () => {
        await expect(quickActions.quickActionWalletTransferCard).toBeVisible();
        await quickActions.quickActionWalletTransferCard.click();

        const result = await Promise.race([
            quickActions.actionDialog.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'dialog' as const),
            page.waitForURL(/transfer/i, { timeout: 8000 }).then(() => 'url' as const),
        ]).catch(() => 'none' as const);

        expect(result, 'Wallet Transfer quick action should navigate or open dialog').not.toBe('none');
    });

    test('should navigate or open a dialog when the Cashout quick action is clicked', async () => {
        await expect(quickActions.quickActionCashoutCard).toBeVisible();
        await quickActions.quickActionCashoutCard.click();

        const result = await Promise.race([
            quickActions.actionDialog.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'dialog' as const),
            page.waitForURL(/cashout|transfer/i, { timeout: 8000 }).then(() => 'url' as const),
        ]).catch(() => 'none' as const);

        expect(result, 'Cashout quick action should navigate or open dialog').not.toBe('none');
    });

    test('should navigate or open a dialog when the Receive Payment quick action is clicked', async () => {
        await expect(quickActions.quickActionReceivePaymentCard).toBeVisible();
        await quickActions.quickActionReceivePaymentCard.click();

        const result = await Promise.race([
            quickActions.actionDialog.waitFor({ state: 'visible', timeout: 8000 }).then(() => 'dialog' as const),
            page.waitForURL(url => !url.toString().includes('/home'), { timeout: 8000 }).then(() => 'url' as const),
        ]).catch(() => 'none' as const);

        expect(result, 'Receive payment quick action should navigate or open dialog').not.toBe('none');
    });
});
