import { test, expect, Page } from '@playwright/test';
import { ASSERTION_TIMEOUT_MS, createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { HomepageSubWalletsPage } from '../../pageElements/homepage/HomepageSubWalletsPage';

test.describe('Homepage – Page Elements – Sub-wallets panel', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let subWallets: HomepageSubWalletsPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, subWallets } = await createHomepageSession(browser));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should display the Sub-wallets panel heading', async () => {
        await expect(subWallets.subWalletsHeading).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Sub-wallets Manage link', async () => {
        await expect(subWallets.subWalletsManageLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the empty state message when there are no sub-wallets', async () => {
        await expect(subWallets.subWalletsEmptyMessage).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });
});
