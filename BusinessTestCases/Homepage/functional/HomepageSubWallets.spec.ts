import { test, expect, Page } from '../helpers/HomepageFixtures.ts';
import { refreshHomepage } from '../helpers/HomePageHelper.ts';
import { HomepageSubWalletsPage } from '../../pageElements/Homepage/HomepageSubWalletsPage';

test.describe('Homepage – Sub-wallets panel', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let subWallets: HomepageSubWalletsPage;

    test.beforeEach(async ({ homepagePage, subWallets: sw }) => {
        page = homepagePage;
        subWallets = sw;
        await refreshHomepage(page);
    });

    test('should navigate to Sub-wallets management when the Manage link is clicked', async () => {
        await subWallets.subWalletsManageLink.click();
        await expect(page).toHaveURL(/sub-wallets?/i, { timeout: 10000 });
    });
});
