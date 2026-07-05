import { test, expect, Page } from '@playwright/test';
import { HOME_URL_PATTERN, createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { HomepageBalanceCardPage } from '../../pageElements/homepage/HomepageBalanceCardPage';

test.describe('Homepage – Balance card interactions', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let balanceCard: HomepageBalanceCardPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, balanceCard } = await createHomepageSession(browser));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should change the balance display when the visibility toggle is clicked', async () => {
        const before = await balanceCard.balanceAmountText.textContent();
        await balanceCard.balanceVisibilityToggle.click();
        await page.waitForTimeout(400);
        const after = await balanceCard.balanceAmountText.textContent();
        expect(after).not.toEqual(before);
    });

    test('should restore the balance display when the visibility toggle is clicked a second time', async () => {
        const before = await balanceCard.balanceAmountText.textContent() ?? '';

        await balanceCard.balanceVisibilityToggle.click();
        await expect(balanceCard.balanceAmountText, 'Balance display should change after the first toggle')
            .not.toHaveText(before, { timeout: 5000 });

        await balanceCard.balanceVisibilityToggle.click();
        await expect(balanceCard.balanceAmountText, 'Balance display should be restored to its original value after two toggles')
            .toHaveText(before, { timeout: 5000 });
    });

    test('should open a QR dialog or navigate when the Wallet QR button is clicked', async () => {
        await balanceCard.walletQrButton.click();
        await expect(page).toHaveURL(/\/business\/main\/home\/wallet-links/, { timeout: 10000 });
    });

    test('should navigate away from the homepage when Wallet Settings is clicked', async () => {
        await balanceCard.walletSettingsButton.click();
        await expect(page).not.toHaveURL(HOME_URL_PATTERN, { timeout: 10000 });
    });
});
