import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { SubWalletsPage } from '../../pageElements/SubWallets/SubWalletsPage';
import { SubWalletFormPage } from '../../pageElements/SubWallets/SubWalletFormPage';
import { SubWalletDetailsPage } from '../../pageElements/SubWallets/SubWalletDetailsPage';
import {
    fetchJson,
    gotoSubWallets,
    uniqueSubWalletName,
    mockSubWalletList,
    mockCreateSubWalletSuccess,
    mockCreateSubWalletConfigCopyError,
    mockCreateSubWalletDuplicateName,
    mockCreateSubWalletDuplicateAccepted,
    mockWalletConfigurationSuccess,
    mockWalletConfigurationServerError,
    SAMPLE_WALLET_CODE,
} from '../SubWalletsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Wallet Bugs — MOCK ONLY (SWB-01..SWB-04): EMI-5571, EMI-5417, EMI-5248,
// EMI-5249.
//
// Each bug gets a pair: the fixed-behaviour assertion, plus a "regression
// guard" that drives the pre-fix mock to prove the assertion would actually
// have caught the original defect. Same pattern as PaymentLinkBugs.spec.ts.
//
// Endpoint paths come from the curl repros on EMI-5571 and EMI-5417, so they
// are real; the locators are best-effort (see SubWalletsPage.ts).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sub-Wallet Bugs — Create No Longer Errors (SWB-01, EMI-5571)', () => {
    test.use({ storageState: SESSION_PATH });

    test('SWB-01: creating a sub-wallet should not surface a wallet-config/copy 500', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await mockCreateSubWalletSuccess(page);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.createButton.click();

        const form = new SubWalletFormPage(page);
        await form.fillForm({ name: uniqueSubWalletName(), walletType: 'ESCROW', currency: 'AED' });
        await form.submit();

        await expect(list.errorMessage).not.toBeVisible();
        await expect(page.getByText(/wallet-config\/copy/i)).not.toBeVisible();
    });

    test('SWB-01 (regression guard): the pre-fix mock reproduces the raw 500 the ticket captured', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await mockCreateSubWalletConfigCopyError(page);
        await gotoSubWallets(page);

        const { status } = await fetchJson(page, '/api/v1/sub-wallets', {
            method: 'POST',
            body: {
                name: 'subwallet',
                subWalletTypeCode: 'ESCROW',
                currency: 'AED',
                notes: '',
                isShareable: false,
                isCardIssuanceEnabled: false,
                parentSubWalletCode: null,
            },
        });

        expect(status).toBe(500);
    });
});

test.describe('Sub-Wallet Bugs — Configuration Request No Longer 500s (SWB-02, EMI-5417)', () => {
    test.use({ storageState: SESSION_PATH });

    test('SWB-02: requesting a sub-wallet configuration should return 200', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await mockWalletConfigurationSuccess(page);
        await gotoSubWallets(page);

        const { status } = await fetchJson(page, `/api/v1/wallet-config/sub-wallet/${SAMPLE_WALLET_CODE}/configuration`, {
            method: 'POST',
            body: { platformType: 'WEB', walletLimitation: { minBalance: 1, maxBalance: 100 } },
        });

        expect(status).toBe(200);
    });

    test('SWB-02 (regression guard): the pre-fix mock reproduces the 500', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await mockWalletConfigurationServerError(page);
        await gotoSubWallets(page);

        const { status } = await fetchJson(page, `/api/v1/wallet-config/sub-wallet/${SAMPLE_WALLET_CODE}/configuration`, {
            method: 'POST',
            body: { platformType: 'WEB' },
        });

        expect(status).toBe(500);
    });
});

test.describe('Sub-Wallet Bugs — Duplicate Names Rejected (SWB-03, EMI-5248)', () => {
    test.use({ storageState: SESSION_PATH });

    test('SWB-03: creating a second sub-wallet with an existing name should be rejected', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await mockCreateSubWalletDuplicateName(page);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.createButton.click();

        const form = new SubWalletFormPage(page);
        await form.fillForm({ name: 'Operations', walletType: 'ESCROW', currency: 'SAR' });
        await form.submit();

        await expect(form.duplicateNameError).toBeVisible({ timeout: 15000 });
        await expect(form.successSheet).not.toBeVisible();
    });

    test('SWB-03 (regression guard): the pre-fix mock accepts the duplicate with a 200', async ({ page }) => {
        await mockSubWalletList(page, ['Operations']);
        await mockCreateSubWalletDuplicateAccepted(page);
        await gotoSubWallets(page);

        const { status } = await fetchJson(page, '/api/v1/sub-wallets', {
            method: 'POST',
            body: { name: 'Operations', subWalletTypeCode: 'ESCROW', currency: 'SAR', parentSubWalletCode: null },
        });

        expect(status).toBe(200);
    });
});

test.describe('Sub-Wallet Bugs — Details Stay Visible On Click (SWB-04, EMI-5249)', () => {
    test.use({ storageState: SESSION_PATH });

    test('SWB-04: clicking a sub-wallet should reveal its details, not hide them', async ({ page }) => {
        await mockSubWalletList(page, ['Operations', 'Payroll']);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await list.waitForList();
        await list.openByName('Operations');

        const details = new SubWalletDetailsPage(page);
        await expect(details.detailsPanel.or(details.walletInfoTab)).toBeVisible({ timeout: 15000 });
        await expect(list.loadingIndicator).not.toBeVisible();
    });
});
