import type { Browser } from '@playwright/test';
import { AdminOtpConfigPage, createAdminContext } from '../../pageElements/Shared/AdminOtpConfigPage.ts';
import { AdminGroupsManagementPage, ADMIN_ROLE } from '../../pageElements/UserManagement/AdminGroupsManagementPage.ts';
import { boxStep } from '../../shared/boxStep.ts';

/**
 * Removes the Top-up privilege from an admin ROLE and puts it back (TUB-04 / TUB-122).
 *
 * The privilege lives on the role, so every user with that role (all Merchant Admins, or all Biller Admins) loses Top-up while
 * it is removed - run only when nobody else uses dev for Top-up, and always call restore() in afterAll. Manual recovery if a run
 * dies in between: admin portal -> Settings -> Groups, Roles And Privileges -> roles list -> the role -> assign privilege to
 * role -> in the AVAILABLE list search "top", tick "Top-Up Wallet", "assign privilege to role", Save Changes.
 *
 * Only "Top-Up Wallet" is removed. The other "top" match, "User Card Topup", is a card privilege and is left alone (decided by
 * the user 2026-10-17). Each admin step uses its own short admin login because the dev admin session expires quickly.
 */

export const TOPUP_PRIVILEGE = 'Top-Up Wallet';

export type TopupRole = (typeof ADMIN_ROLE)[keyof typeof ADMIN_ROLE];

async function withAdminRole<T>(browser: Browser, role: TopupRole, work: (groups: AdminGroupsManagementPage) => Promise<T>): Promise<T> {
    const context = await createAdminContext(browser);
    try {
        const page = await context.newPage();
        await new AdminOtpConfigPage(page).login();
        const groups = new AdminGroupsManagementPage(page);
        await groups.openRolePrivileges(role);
        return await work(groups);
    } finally {
        await context.close();
    }
}

/** True when the privilege is in the role's ASSIGNED list (fresh admin login, nothing is changed). */
export async function roleHasTopupPrivilege(browser: Browser, role: TopupRole): Promise<boolean> {
    return boxStep('roleHasTopupPrivilege', async () => {
        return withAdminRole(browser, role, async groups => (await groups.assignedMatching(TOPUP_PRIVILEGE)).some(n => n.toLowerCase() === TOPUP_PRIVILEGE.toLowerCase()));
    });
}

/**
 * Removes the Top-up privilege from the role, saves and verifies by re-reading. Returns restore(), which adds it back, saves and
 * verifies. If the role did not have the privilege to begin with, nothing is changed and restore() does nothing.
 */
export async function removeTopupPrivilege(browser: Browser, role: TopupRole): Promise<{ hadPrivilege: boolean; restore: () => Promise<void> }> {
    return boxStep('removeTopupPrivilege', async () => {
    const hadPrivilege = await withAdminRole(browser, role, async groups => {
        const has = (await groups.assignedMatching(TOPUP_PRIVILEGE)).some(n => n.toLowerCase() === TOPUP_PRIVILEGE.toLowerCase());
        if (!has) return false;
        await groups.removeAssigned(TOPUP_PRIVILEGE);
        await groups.save();
        return true;
    });
    if (hadPrivilege && await roleHasTopupPrivilege(browser, role)) {
        throw new Error(`"${TOPUP_PRIVILEGE}" is still assigned to ${role} after Remove + Save. Nothing was proven; check the role by hand.`);
    }
    const restore = async (): Promise<void> => {
        if (!hadPrivilege) return;
        await withAdminRole(browser, role, async groups => {
            const stillAssigned = (await groups.assignedMatching(TOPUP_PRIVILEGE)).some(n => n.toLowerCase() === TOPUP_PRIVILEGE.toLowerCase());
            if (stillAssigned) return;
            await groups.addBack(TOPUP_PRIVILEGE);
            await groups.save();
        });
        if (!(await roleHasTopupPrivilege(browser, role))) {
            throw new Error(`"${TOPUP_PRIVILEGE}" was NOT restored on ${role}. Re-add it by hand: see the recovery steps at the top of TopupPrivilegeHelper.ts.`);
        }
    };
    return { hadPrivilege, restore };
    });
}
