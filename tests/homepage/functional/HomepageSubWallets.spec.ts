import { test, expect, Page } from '@playwright/test';
import { createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { HomepageSubWalletsPage } from '../../pageElements/homepage/HomepageSubWalletsPage';

test.describe('Homepage – Sub-wallets panel', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let subWallets: HomepageSubWalletsPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, subWallets } = await createHomepageSession(browser, 'ACCOUNT_1'));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should navigate to Sub-wallets management when the Manage link is clicked', async () => {
        await subWallets.subWalletsManageLink.click();
        await expect(page).toHaveURL(/sub-wallets?/i, { timeout: 10000 });
    });
});
