import { test, expect } from '@playwright/test';
import { loginToTopup, HOME_URL, BASE_URL, TOPUP_UI_ACCOUNT, type TopupSession } from '../helpers/TopupHelper.ts';
import { removeTopupPrivilege, TOPUP_PRIVILEGE } from '../helpers/TopupPrivilegeHelper.ts';
import { ADMIN_ROLE } from '../../pageElements/UserManagement/AdminGroupsManagementPage';
import { HomepageSidebarPage } from '../../pageElements/Shared/HomepageSidebarPage';

// Business rule: a user without the Topup privilege cannot start a top-up. TUB-04 and TUB-122 (Merchant row), through the browser.
// The test removes the privilege itself: the admin removes "Top-Up Wallet" from the Merchant Admin ROLE (admin portal ->
// Settings -> Groups, Roles And Privileges -> roles list -> assign privilege to role), then K9491 (Merchant, TOPUP_UI_ACCOUNT)
// logs in and Topup must not be offered or opened (the assert follows the click on the Home "Add money via card" quick action when it is
// shown). The role match is user-confirmed: K9491's user holds Merchant Admin. A control then restores the privilege and shows Topup is back, so a missing
// entry for any other reason cannot pass. The privilege is restored again in afterAll if the control did not get that far.
// RISK: the privilege is on the ROLE, so every Merchant Admin on dev loses Topup while this file runs. Run it when nobody else
// is testing Top-up. Manual recovery steps are at the top of TopupPrivilegeHelper.ts.
// Not covered: a Biller account (TUB-123 stays manual: the order "permission before limit" cannot be seen in the UI).
// Legacy API version: api/TopupBizEligibility.spec.ts (TUB-04) and api/TopupBizCombinations.spec.ts (TUB-122).
// One account, one session: run with --workers=1.

const TOPUP_URL = `${BASE_URL}/business/main/transfer/top-up`;

test.describe('Topup business – UI – eligibility', { tag: ['@topup', '@ui', '@business'], annotation: [{ type: 'feature', description: 'Topup' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(240000);

    let session: TopupSession | undefined;
    let removed: Awaited<ReturnType<typeof removeTopupPrivilege>> | undefined;
    let restored = false;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(300000);
        removed = await removeTopupPrivilege(browser, ADMIN_ROLE.MERCHANT_ADMIN); // admin first, never overlapping the app login
    });

    test.afterAll(async () => {
        try {
            await session?.page.close().catch(() => { /* already closed */ });
        } finally {
            if (removed && !restored) await removed.restore();
        }
    });

    test('TUB-04/TUB-122: a user without the Topup privilege is not offered Topup', { annotation: [{ type: 'testcase', description: 'TUB-04/TUB-122: Merchant without the Topup privilege -> no quick action, no sidebar link, top-up screen cannot be opened' }] }, async ({ browser }) => {
        test.skip(!removed?.hadPrivilege, `The Merchant Admin role did not have "${TOPUP_PRIVILEGE}" before the test, so there is nothing to remove`);
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
        const { page, quickActions, topup } = session;
        const sidebar = new HomepageSidebarPage(page);
        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForLoadState('networkidle').catch(() => { /* the app keeps polling: Home is loaded enough */ });
        expect(page.url(), 'the login must have succeeded and left the login page').not.toMatch(/login/i);
        test.info().annotations.push({ type: 'role-removed-from', description: 'Merchant Admin (user-confirmed role of K9491, testAccounts.merchant)' });
        await expect(quickActions.quickActionsHeading, 'Home did not render, so "no quick action" would prove nothing').toBeVisible({ timeout: 30000 });
        // isVisible() never waits: Home is rendered (heading above), so the answer is final.
        const offered = await quickActions.quickActionTopupCard.isVisible().catch(() => false);
        if (offered) {
            // Still offered: click it, the top-up form must not open. A failure here also means K9491's user is not in the role we edited.
            await quickActions.quickActionTopupCard.click();
            await expect(topup.inputAmount, 'Topup is still offered and opens after the privilege was removed: check that K9491\'s user really holds the Merchant Admin role').toBeHidden({ timeout: 15000 });
            await page.goto(HOME_URL);
            await page.waitForLoadState('domcontentloaded');
        }
        test.info().annotations.push({ type: 'finding', description: offered ? 'The quick action was still shown, but the top-up form did not open after the click' : 'The quick action was not shown' });

        // Same rule for the sidebar link: if it is still shown (seen on dev after the removal), click it; the form must not open.
        const sidebarOffered = await sidebar.topupSidebarLink.isVisible().catch(() => false);
        if (sidebarOffered) {
            await sidebar.topupSidebarLink.click();
            await expect(topup.inputAmount, 'Topup opens from the sidebar after the privilege was removed: check that K9491\'s user really holds the Merchant Admin role').toBeHidden({ timeout: 15000 });
        }
        test.info().annotations.push({ type: 'finding', description: sidebarOffered ? 'The sidebar Topup link was still shown after the privilege was removed (the form did not open after the click)' : 'The sidebar Topup link was not shown' });

        await page.goto(TOPUP_URL);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForLoadState('networkidle').catch(() => { /* keeps polling */ });
        await expect(topup.inputAmount, 'the top-up amount form must not open without the privilege').toBeHidden({ timeout: 15000 });
        test.info().annotations.push({ type: 'finding', description: `Direct visit to the top-up URL ended on: ${page.url()}` });
    });

    test('control: after the privilege is restored Topup is offered again', { annotation: [{ type: 'testcase', description: 'TUB-04/TUB-122 control: privilege restored -> quick action and top-up form are back' }] }, async ({ browser }) => {
        test.skip(!removed?.hadPrivilege, 'Nothing was removed, so there is nothing to restore');
        await session?.page.close().catch(() => { /* already closed */ });
        await removed!.restore();
        restored = true;
        session = await loginToTopup(browser, TOPUP_UI_ACCOUNT);
        await session.page.goto(HOME_URL);
        await session.page.waitForLoadState('domcontentloaded');
        await expect(session.quickActions.quickActionTopupCard, 'Topup is offered again once the privilege is back').toBeVisible({ timeout: 30000 });
    });
});
