import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { SubWalletsPage } from '../../pageElements/SubWallets/SubWalletsPage';
import { HomepageSidebarPage } from '../../pageElements/Shared/HomepageSidebarPage';
import {
    fetchJson,
    gotoSubWallets,
    mockSubWalletList,
    mockSubWalletPrivileges,
    mockCreateSubWalletForbidden,
} from '../SubWalletsHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Wallet Permissions — MOCK ONLY (SWP-01..SWP-04): EMI-5274 (Biller/
// Merchant Admin could view and create without the privilege) and EMI-5276
// (revoking then restoring the privilege left the module hidden for everyone).
//
// Privileges are mocked because granting and revoking them needs Admin Portal
// access, which this suite does not have — the same blocker already documented
// in Reconciliation/ and TransactionOperations/. The privilege endpoint pattern
// is a best-effort guess; reconcile on the first live run.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sub-Wallet Permissions — Privilege Gates The Module (SWP-01, SWP-02, EMI-5274)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('SWP-01: a user without the sub-wallet privilege should not see the module', async ({ page }) => {
        await mockSubWalletPrivileges(page, false);
        await mockSubWalletList(page, []);
        await gotoSubWallets(page);

        const sidebar = new HomepageSidebarPage(page);
        await expect(sidebar.subWalletsSidebarLink).not.toBeVisible({ timeout: 15000 });

        const list = new SubWalletsPage(page);
        await expect(list.createButton).not.toBeVisible();
    });

    test('SWP-02: the create endpoint should refuse an unprivileged user, not just hide the button', async ({ page }) => {
        await mockSubWalletPrivileges(page, false);
        await mockCreateSubWalletForbidden(page);
        await gotoSubWallets(page);

        const { status } = await fetchJson(page, '/api/v1/sub-wallets', {
            method: 'POST',
            body: { name: 'Unauthorized', subWalletTypeCode: 'ESCROW', currency: 'SAR', parentSubWalletCode: null },
        });

        expect(status).toBe(403);
    });
});

test.describe('Sub-Wallet Permissions — Restoring A Revoked Privilege (SWP-03, SWP-04, EMI-5276)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('SWP-03: a granted privilege should render the module', async ({ page }) => {
        await mockSubWalletPrivileges(page, true);
        await mockSubWalletList(page, ['Operations']);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await expect(list.heading).toBeVisible({ timeout: 15000 });
        await list.waitForList();
    });

    test('SWP-04: re-granting after a revoke should restore access rather than leave it hidden', async ({ page }) => {
        await mockSubWalletPrivileges(page, false);
        await mockSubWalletList(page, ['Operations']);
        await gotoSubWallets(page);

        const list = new SubWalletsPage(page);
        await expect(list.createButton).not.toBeVisible({ timeout: 15000 });

        // Re-grant, then reload — the bug was that the module stayed hidden here.
        await page.unrouteAll({ behavior: 'ignoreErrors' });
        await mockSubWalletPrivileges(page, true);
        await mockSubWalletList(page, ['Operations']);
        await gotoSubWallets(page);

        await expect(list.heading).toBeVisible({ timeout: 15000 });
        await list.waitForList();
    });
});
