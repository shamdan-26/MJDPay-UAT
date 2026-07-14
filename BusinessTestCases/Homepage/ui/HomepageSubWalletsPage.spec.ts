import { test, expect, Page } from '../HomepageFixtures';
import { ASSERTION_TIMEOUT_MS, refreshHomepage } from '../HomePageHelper';
import { HomepageSubWalletsPage } from '../../pageElements/HomepageSubWalletsPage';

test.describe('Homepage – Page Elements – Sub-wallets panel', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let subWallets: HomepageSubWalletsPage;

    test.beforeEach(async ({ homepagePage, subWallets: sw }) => {
        page = homepagePage;
        subWallets = sw;
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
