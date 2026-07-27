import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { SubWalletsPage } from '../../pageElements/SubWallets/SubWalletsPage';
import { SubWalletFormPage } from '../../pageElements/SubWallets/SubWalletFormPage';
import { gotoSubWallets, mockSubWalletList, mockEmptySubWalletList } from '../SubWalletsHelper';

// Sub-Wallets root screen — element/text presence only (SW-UI-01..SW-UI-04),
// EMI-5185. Business outcomes live in functional/SubWalletManagement.spec.ts.

test.describe('Sub-Wallets Page — UI', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('SW-UI-01: should display the "Sub Wallets" title and a Create action', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await expect(list.heading).toBeVisible({ timeout: 15000 });
        await expect(list.createButton).toBeVisible();
    });

    test('SW-UI-02: the root screen should list sub-wallets directly, with no tabs', async ({ page }) => {
        await mockSubWalletList(page, ['Operations', 'Payroll']);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await list.waitForList();
        await expect(page.getByRole('tab')).toHaveCount(0);
    });

    test('SW-UI-03: an account with no sub-wallets should show the empty state', async ({ page }) => {
        await mockEmptySubWalletList(page);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await expect(list.emptyMessage).toBeVisible({ timeout: 15000 });
    });

    test('SW-UI-04: the create form should expose every field the ticket lists', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.createButton.click();

        const form = new SubWalletFormPage(page);
        await expect(form.nameInput).toBeVisible({ timeout: 15000 });
        await expect(form.walletTypeSelect).toBeVisible();
        await expect(form.currencySelect).toBeVisible();
        await expect(form.notesInput).toBeVisible();
        await expect(form.shareableToggle).toBeVisible();
        await expect(form.cardIssuanceToggle).toBeVisible();
    });
});
