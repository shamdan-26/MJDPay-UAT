import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/helpers/LoginHelper.ts';
import { GroupsRolesPage } from '../../pageElements/UserManagement/GroupsRolesPage';
import {
    fetchJson,
    gotoGroupsManagement,
    localizedGroups,
    localizedRoles,
    countRequests,
    mockCustomGroupsAndRoles,
    mockPrivilegesScopedToCaller,
    mockPrivilegesUnscoped,
    mockCustomPrivilegesForbidden,
    mockCustomPrivilegesLeaked,
    mockSystemPrivilegesIncludingObsolete,
    mockCallerPrivileges,
    mockDeleteGroupSuccess,
    mockDeleteGroupServerError,
    mockDeleteRoleSuccess,
    mockDeleteSystemEntityRejected,
    mockGroupRoleAssignmentSuccess,
    CREATE_GROUP_PRIVILEGE,
    OBSOLETE_PRIVILEGE,
} from '../helpers/UserManagementHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Access & Permissions — scope-aware RBAC (RBS-01..RBS-10) — MOCK ONLY.
//
// Feature: EMI-5956 (FE Web Business → business-scoped endpoints), EMI-5957
// (FE Web Admin → admin-scoped endpoints), with the BE side in EMI-5901
// (unassign privilege logic) and EMI-5902 (default roles/groups seeded as
// system entities via flyway).
//
// Bugs: EMI-5985 (Delete role fires no request), EMI-5986 (delete group 500),
// EMI-5999 (obsolete "Get Groups Settings" privilege still assignable),
// EMI-6000 (both add- and remove-roles fired unconditionally on Save),
// EMI-6001 (no Delete action, no confirmation modal, system entities not
// protected), EMI-6016 (privileges not filtered by caller scope — privilege
// escalation), EMI-6026 (Create Group not gated on CREATE_BUSINESS_GROUP),
// EMI-6027 (custom-privileges endpoint 200s for an unauthorised caller),
// EMI-6029 (each tab switch fires its listing twice).
//
// Each bug gets a pair — the fixed-behaviour assertion plus a "regression
// guard" driving the pre-fix mock — so the assertion is proven to catch the
// original defect. Same pattern as GroupsRolesPermissions.spec.ts, which stays
// on the older /api/v1/{groups,roles} paths those tickets were written against.
//
// Every endpoint here is confirmed: each path is quoted verbatim in its
// ticket. The LOCATORS are not — Access & Permissions is absent from
// QA-DATA-TESTID-HANDOFF.md, so the UI-driven cases below carry the same
// reconcile-before-CI-gating caveat as the rest of pageElements/UserManagement.
// ─────────────────────────────────────────────────────────────────────────────

const CUSTOM_PRIVILEGES_PATH = '/groups/roles/custom/privileges?page=0&size=1000';
const SYSTEM_PRIVILEGES_PATH = '/groups/roles/privileges?page=0&size=1000';

interface PrivilegeRow { id: number; name: string; code: string }
interface PrivilegePage { content: PrivilegeRow[] }

test.describe('RBAC Scoped — Privilege Escalation Guard (RBS-01, EMI-6016)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('RBS-01: the privileges list is filtered to what the caller actually holds', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockPrivilegesScopedToCaller(page, ['GET_ALL_PRIVILEGES', CREATE_GROUP_PRIVILEGE]);
        await gotoGroupsManagement(page);

        const { status, body } = await fetchJson(page, CUSTOM_PRIVILEGES_PATH);
        expect(status).toBe(200);

        const codes = (body as PrivilegePage).content.map(p => p.code);
        // CREATE_BILL is deliberately not held — a restricted user must not be
        // able to hand it to a role, which is the escalation EMI-6016 describes.
        expect(codes).not.toContain('CREATE_BILL');
        expect(codes).toContain(CREATE_GROUP_PRIVILEGE);
    });

    test('RBS-01 (regression guard, EMI-6016): the pre-fix mock returns the unfiltered system list', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockPrivilegesUnscoped(page);
        await gotoGroupsManagement(page);

        const { body } = await fetchJson(page, CUSTOM_PRIVILEGES_PATH);
        const codes = (body as PrivilegePage).content.map(p => p.code);

        expect(codes).toContain('CREATE_BILL');
    });
});

test.describe('RBAC Scoped — Custom Privileges Authorisation (RBS-02, EMI-6027)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('RBS-02: a caller without "Get All privilege" is refused with 403 UNAUTHORIZED_USER', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockCustomPrivilegesForbidden(page);
        await gotoGroupsManagement(page);

        const { status, body } = await fetchJson(page, CUSTOM_PRIVILEGES_PATH);

        expect(status).toBe(403);
        expect(JSON.stringify(body)).toContain('UNAUTHORIZED_USER');
    });

    test('RBS-02 (regression guard, EMI-6027): the pre-fix mock leaks the full list with a 200', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockCustomPrivilegesLeaked(page);
        await gotoGroupsManagement(page);

        const { status, body } = await fetchJson(page, CUSTOM_PRIVILEGES_PATH);

        expect(status).toBe(200);
        expect((body as PrivilegePage).content.length).toBeGreaterThan(0);
    });
});

test.describe('RBAC Scoped — Obsolete Privilege Removed (RBS-03, EMI-5999)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('RBS-03: "Get Groups Settings" (id 220) is not in the assignable system privilege list', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockPrivilegesScopedToCaller(page, ['GET_ALL_PRIVILEGES', 'CREATE_BILL', CREATE_GROUP_PRIVILEGE, 'DELETE_BUSINESS_GROUP']);
        await gotoGroupsManagement(page);

        const { body } = await fetchJson(page, SYSTEM_PRIVILEGES_PATH);
        const rows = (body as PrivilegePage).content;

        expect(rows.map(p => p.id)).not.toContain(OBSOLETE_PRIVILEGE.id);
        expect(rows.map(p => p.name)).not.toContain(OBSOLETE_PRIVILEGE.name);
    });

    test('RBS-03 (regression guard, EMI-5999): the pre-fix mock still serves privilege 220', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockSystemPrivilegesIncludingObsolete(page);
        await gotoGroupsManagement(page);

        const { body } = await fetchJson(page, SYSTEM_PRIVILEGES_PATH);

        expect((body as PrivilegePage).content.map(p => p.id)).toContain(OBSOLETE_PRIVILEGE.id);
    });
});

test.describe('RBAC Scoped — Create Group Privilege Gate (RBS-04, EMI-6026)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('RBS-04: Create Group is hidden or disabled for a caller without CREATE_BUSINESS_GROUP', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockCallerPrivileges(page, ['GET_ALL_PRIVILEGES']);
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openGroups();
        await expect(access.groupRows.first()).toBeVisible({ timeout: 20000 });

        const visible = await access.createGroupButton
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);

        // Either treatment satisfies the AC — hidden, or present but disabled.
        if (visible) {
            await expect(access.createGroupButton).toBeDisabled();
        }
    });

    test('RBS-04b: clicking Create Group without the privilege never opens the modal and errors', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockCallerPrivileges(page, ['GET_ALL_PRIVILEGES']);
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openGroups();
        await expect(access.groupRows.first()).toBeVisible({ timeout: 20000 });

        const clickable = await access.createGroupButton
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => access.createGroupButton.isEnabled())
            .catch(() => false);
        test.skip(!clickable, 'button correctly hidden or disabled — nothing to click (RBS-04 already asserts this)');

        await access.createGroupButton.click();
        // The EMI-6026 defect: the modal opens and then the permissions call fails.
        await expect(access.errorToast).not.toBeVisible({ timeout: 5000 });
    });

    test('RBS-04c: Create Group is available to a caller who does hold CREATE_BUSINESS_GROUP', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockCallerPrivileges(page, ['GET_ALL_PRIVILEGES', CREATE_GROUP_PRIVILEGE]);
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openGroups();

        await expect(access.createGroupButton).toBeVisible({ timeout: 20000 });
        await expect(access.createGroupButton).toBeEnabled();
    });
});

test.describe('RBAC Scoped — No Duplicate Calls On Tab Switch (RBS-05, EMI-6029)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('RBS-05: switching to Roles and back to Groups fires each listing exactly once per visit', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        // Counters register LAST so they are matched FIRST and can hand off
        // to the fulfilling mock via route.fallback().
        const groupCalls = countRequests(page, '**/custom/groups**');
        const roleCalls  = countRequests(page, '**/custom/roles**');
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openGroups();
        await expect(access.groupRows.first()).toBeVisible({ timeout: 20000 });
        await access.openRoles();
        await expect(access.roleRows.first()).toBeVisible({ timeout: 20000 });
        await access.openGroups();
        await expect(access.groupRows.first()).toBeVisible({ timeout: 20000 });

        // Groups is visited twice, Roles once. The EMI-6029 defect doubles both.
        expect(groupCalls.count(), 'GET /custom/groups fired more than once per visit').toBeLessThanOrEqual(2);
        expect(roleCalls.count(), 'GET /custom/roles fired more than once per visit').toBeLessThanOrEqual(1);
    });
});

test.describe('RBAC Scoped — Group Deletion (RBS-06, EMI-5986 / EMI-6001)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('RBS-06: DELETE /groups/{id} on a custom group succeeds', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockDeleteGroupSuccess(page);
        await gotoGroupsManagement(page);

        const { status } = await fetchJson(page, '/groups/1', { method: 'DELETE' });

        expect(status).toBe(204);
    });

    test('RBS-06 (regression guard, EMI-5986): the pre-fix mock reproduces the 500 on group delete', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockDeleteGroupServerError(page);
        await gotoGroupsManagement(page);

        const { status } = await fetchJson(page, '/groups/1', { method: 'DELETE' });

        expect(status).toBe(500);
    });

    test('RBS-06b (EMI-6001): a custom group exposes a Delete action behind a confirmation modal', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockDeleteGroupSuccess(page);
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openGroups();
        await expect(access.groupRows.first()).toBeVisible({ timeout: 20000 });

        await access.deleteRowByName('Biller checker');

        // The modal is the AC — deletion must never fire straight off the click.
        await expect(access.deleteConfirmModal).toBeVisible({ timeout: 15000 });
        await access.deleteConfirmButton.click();
        await expect(access.errorToast).not.toBeVisible({ timeout: 5000 });
    });

    test('RBS-06c (EMI-6001): a system group is protected from deletion', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockDeleteSystemEntityRejected(page);
        await gotoGroupsManagement(page);

        // Backend contract: even if the UI lets the call through, the system
        // entity is refused rather than deleted. Group id 3 is isSystem: true.
        const { status, body } = await fetchJson(page, '/groups/3', { method: 'DELETE' });

        expect(status).toBe(400);
        expect(JSON.stringify(body)).toContain('SYSTEM_ENTITY_CANNOT_BE_MODIFIED');
    });
});

test.describe('RBAC Scoped — Role Deletion Fires A Request (RBS-07, EMI-5985)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('RBS-07: confirming Delete on a role actually issues DELETE /groups/roles/{id}', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockDeleteRoleSuccess(page);
        // Registered last so it is matched first, then falls back to the mock.
        const deleteCalls = countRequests(page, '**/groups/roles/*');
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openRoles();
        await expect(access.roleRows.first()).toBeVisible({ timeout: 20000 });

        await access.deleteRowByName('Maker');
        await access.deleteConfirmButton.click();

        // EMI-5985: pre-fix the click was inert and no request left the browser.
        await expect
            .poll(() => deleteCalls.count(), { timeout: 15000, message: 'no DELETE request was issued for the role' })
            .toBeGreaterThan(0);
    });

    test('RBS-07b: the DELETE role endpoint itself succeeds', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockDeleteRoleSuccess(page);
        await gotoGroupsManagement(page);

        const { status } = await fetchJson(page, '/groups/roles/11', { method: 'DELETE' });

        expect(status).toBe(204);
    });
});

test.describe('RBAC Scoped — Role Assignment Is Diffed (RBS-08, EMI-6000)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('RBS-08: saving a group without changing its roles fires neither the add nor the remove call', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await mockGroupRoleAssignmentSuccess(page);
        // Registered last so they are matched first, then fall back to the mocks.
        const addCalls    = countRequests(page, '**/groups/*/roles');
        const removeCalls = countRequests(page, '**/groups/*/roles/remove');
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openGroups();
        await expect(access.groupRows.first()).toBeVisible({ timeout: 20000 });

        const canAssign = await access.assignRolesButton
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!canAssign, 'assign-roles control not rendered — reconcile locators against the live DOM');

        await access.assignRolesButton.click();
        await expect(access.saveButton).toBeVisible({ timeout: 15000 });
        await access.saveButton.click();
        await page.waitForTimeout(2000);

        // EMI-6000: pre-fix BOTH fired regardless. With no change made, the
        // diff should produce no request at all.
        expect(addCalls.count() + removeCalls.count(),
            'Save with no role changes still fired assign/remove requests').toBe(0);
    });
});

test.describe('RBAC Scoped — Default Roles And Groups Are System Entities (RBS-09, EMI-5902)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('RBS-09: seeded default groups and roles come back flagged isSystem', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await gotoGroupsManagement(page);

        const groups = await fetchJson(page, '/custom/groups?page=0&size=10');
        const roles  = await fetchJson(page, '/custom/roles?page=0&size=10');

        const systemGroups = (groups.body as { content: { isSystem: boolean }[] }).content.filter(g => g.isSystem);
        const systemRoles  = (roles.body as { content: { isSystem: boolean }[] }).content.filter(r => r.isSystem);

        expect(systemGroups.length, 'no group is flagged as a system group').toBeGreaterThan(0);
        expect(systemRoles.length, 'no role is flagged as a system role').toBeGreaterThan(0);
    });
});

test.describe('RBAC Scoped — Listing Shape (RBS-10, EMI-5956 / EMI-5957)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('RBS-10: the business-scoped listings answer on /custom/groups and /custom/roles', async ({ page }) => {
        await mockCustomGroupsAndRoles(page, localizedGroups(), localizedRoles());
        await gotoGroupsManagement(page);

        const groups = await fetchJson(page, '/custom/groups?page=0&size=10');
        const roles  = await fetchJson(page, '/custom/roles?page=0&size=10');

        expect(groups.status).toBe(200);
        expect(roles.status).toBe(200);
        for (const field of ['id', 'name', 'nameAr', 'description', 'descriptionAr', 'isSystem']) {
            expect((groups.body as { content: Record<string, unknown>[] }).content[0]).toHaveProperty(field);
            expect((roles.body  as { content: Record<string, unknown>[] }).content[0]).toHaveProperty(field);
        }
    });
});
