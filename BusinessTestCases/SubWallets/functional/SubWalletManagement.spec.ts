import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { SubWalletsPage } from '../../pageElements/SubWallets/SubWalletsPage';
import { SubWalletFormPage } from '../../pageElements/SubWallets/SubWalletFormPage';
import { SubWalletDetailsPage } from '../../pageElements/SubWallets/SubWalletDetailsPage';
import {
    gotoSubWallets,
    uniqueSubWalletName,
    mockSubWalletList,
    mockCloseSubWalletSuccess,
    mockCloseSubWalletBlockedByChild,
} from '../SubWalletsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Wallets Management (SW-01..SW-09) — EMI-5185 (FE-Web), EMI-5186 (BE),
// EMI-5215 (CRUD APIs), EMI-5275 (close-cascade validation).
//
// Creation and nesting are exercised live; the two close-cascade cases are
// mocked because EMI-5275 needs a child wallet holding pending transactions,
// which no fixture account provides.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sub-Wallets — Create Flow (SW-01, SW-02, SW-03)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('SW-01: should create a sub-wallet with only the required fields', async ({ page }) => {
        await gotoSubWallets(page);
        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.createButton.click();

        const form = new SubWalletFormPage(page);
        await form.fillForm({ name: uniqueSubWalletName(), walletType: 'ESCROW', currency: 'SAR' });
        await form.submitAndExpectSuccess();
    });

    test('SW-02: the success sheet should offer a Configure deep-link', async ({ page }) => {
        await gotoSubWallets(page);
        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.createButton.click();

        const form = new SubWalletFormPage(page);
        await form.fillForm({ name: uniqueSubWalletName(), walletType: 'ESCROW', currency: 'SAR' });
        await form.submitAndExpectSuccess();

        await expect(form.configureButton).toBeVisible();
    });

    test('SW-03: submitting without a name should be blocked', async ({ page }) => {
        await gotoSubWallets(page);
        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.createButton.click();

        const form = new SubWalletFormPage(page);
        await form.submit();

        await expect(form.validationError).toBeVisible({ timeout: 10000 });
        await expect(form.successSheet).not.toBeVisible();
    });
});

test.describe('Sub-Wallets — Edit Constraints (SW-04)', () => {
    test.use({ storageState: SESSION_PATH });

    test('SW-04: currency should not be editable in edit mode', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.openByName('Operations');

        const details = new SubWalletDetailsPage(page);
        await details.editButton.click();

        const form = new SubWalletFormPage(page);
        await expect(form.nameInput).toBeEditable({ timeout: 10000 });
        await expect(form.currencySelect).toBeDisabled();
    });
});

test.describe('Sub-Wallets — Detail View and N-Level Nesting (SW-05, SW-06, SW-07)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('SW-05: the Wallet Info tab should be read-only with Edit and Close actions', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.openByName('Operations');

        const details = new SubWalletDetailsPage(page);
        await expect(details.editButton).toBeVisible({ timeout: 15000 });
        await expect(details.closeButton).toBeVisible();
    });

    test('SW-06: header actions should swap to Create when the Sub-Wallets tab is active', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.openByName('Operations');

        const details = new SubWalletDetailsPage(page);
        await details.openSubWalletsTab();

        await expect(details.createNestedButton).toBeVisible({ timeout: 10000 });
        await expect(details.editButton).not.toBeVisible();
        await expect(details.closeButton).not.toBeVisible();
    });

    test('SW-07: "Back to Main Sub-Wallet" should appear past depth 1 and reset to the root', async ({ page }) => {
        await mockSubWalletList(page, ['Operations', 'Payroll']);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.openByName('Operations');

        const details = new SubWalletDetailsPage(page);
        await details.openSubWalletsTab();
        await details.openNestedByName('Payroll');

        await expect(details.backToMainButton).toBeVisible({ timeout: 15000 });
        await details.backToMainButton.click();

        await expect(list.heading).toBeVisible({ timeout: 10000 });
        await expect(details.backToMainButton).not.toBeVisible();
    });
});

test.describe('Sub-Wallets — Close Cascade Validation (SW-08, SW-09, EMI-5275)', () => {
    test.use({ storageState: SESSION_PATH });

    test('SW-08: closing a wallet whose children all pass validation should succeed', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await mockCloseSubWalletSuccess(page);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.openByName('Operations');

        const details = new SubWalletDetailsPage(page);
        await details.confirmClose();

        await expect(details.closeBlockedError).not.toBeVisible();
    });

    test('SW-09: a child with pending transactions should block closing the parent', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await mockCloseSubWalletBlockedByChild(page);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.openByName('Operations');

        const details = new SubWalletDetailsPage(page);
        await details.confirmClose();

        await expect(details.closeBlockedError).toBeVisible({ timeout: 15000 });
    });
});
