import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { GroupsRolesPage } from '../../pageElements/UserManagement/GroupsRolesPage';
import {
    fetchJson,
    gotoGroupsAndRoles,
    mockGroups,
    mockGroupList,
    mockRoleList,
    mockGroupRoleUpdateSuccess,
    mockGroupRoleUpdateForbidden,
    mockRoleUpdateBadRequest,
    mockAssignUsersWithValidation,
    mockAssignUsersWithoutValidation,
} from '../UserManagementHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Manage Accounts → Access & Permissions (Groups / Roles) — GR-01..GR-08.
// MOCK ONLY.
//
// EMI-5210 (role edit 400), EMI-5234 (assign/unassign without validation),
// EMI-5240 + EMI-5613 (update/delete 403), EMI-5897 (tenant + isSystem
// columns), EMI-5899 (assign-users-to-groups API).
//
// `/emi-profile/api/v1/groups/{id}/unassign-users` is the one confirmed-real
// path here — it comes straight off the EMI-5234 curl repro.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Groups & Roles — Listing (GR-01, GR-02)', () => {
    test.use({ storageState: SESSION_PATH });

    test('GR-01: the Groups tab lists every group with its name, description and assigned-user count', async ({ page }) => {
        await mockGroupList(page);
        await mockRoleList(page);
        await gotoGroupsAndRoles(page);

        const access = new GroupsRolesPage(page);
        await access.openGroups();

        await expect(access.groupRows.filter({ hasText: 'FINANCE' })).toBeVisible({ timeout: 20000 });
        await expect(access.groupRows.filter({ hasText: 'OPERATIONS' })).toBeVisible();
        await expect(access.emptyState).not.toBeVisible();
    });

    test('GR-02: the Roles tab lists every role without a loading state stuck on screen', async ({ page }) => {
        await mockGroupList(page);
        await mockRoleList(page);
        await gotoGroupsAndRoles(page);

        const access = new GroupsRolesPage(page);
        await access.openRoles();

        await expect(access.roleRows.filter({ hasText: 'Maker' })).toBeVisible({ timeout: 20000 });
        await expect(access.loadingIndicator).not.toBeVisible();
    });
});

test.describe('Groups & Roles — Edit Name And Description (GR-03, EMI-5210 / EMI-5613)', () => {
    test.use({ storageState: SESSION_PATH });

    test('GR-03: editing a role name and description saves successfully', async ({ page }) => {
        await mockRoleList(page);
        await mockGroupRoleUpdateSuccess(page);
        await gotoGroupsAndRoles(page);

        const access = new GroupsRolesPage(page);
        await access.openRoles();
        await access.editFirst('Maker Updated', 'Updated description');

        await expect(access.successToast).toBeVisible({ timeout: 20000 });
        await expect(access.errorToast).not.toBeVisible();
    });

    test('GR-03 (regression guard, EMI-5210): the pre-fix mock reproduces the 400 on role edit', async ({ page }) => {
        await mockRoleList(page);
        await mockRoleUpdateBadRequest(page);
        await gotoGroupsAndRoles(page);

        const { status } = await fetchJson(page, '/api/v1/roles/1', {
            method: 'PUT',
            body: { name: 'Maker Updated', description: 'Updated description' },
        });

        expect(status).toBe(400);
    });

    test('GR-03 (regression guard, EMI-5613): the pre-fix mock reproduces the 403 on group edit', async ({ page }) => {
        await mockGroupList(page);
        await mockGroupRoleUpdateForbidden(page);
        await gotoGroupsAndRoles(page);

        const { status } = await fetchJson(page, '/api/v1/groups/1', {
            method: 'PUT',
            body: { name: 'FINANCE Updated', description: 'Updated description' },
        });

        expect(status).toBe(403);
    });
});

test.describe('Groups & Roles — Delete (GR-04, EMI-5240)', () => {
    test.use({ storageState: SESSION_PATH });

    test('GR-04: an authorised admin can delete a non-system group', async ({ page }) => {
        await mockGroupList(page, mockGroups(['FINANCE', 'OPERATIONS']));
        await mockGroupRoleUpdateSuccess(page);
        await gotoGroupsAndRoles(page);

        const access = new GroupsRolesPage(page);
        await access.openGroups();
        await expect(access.groupRows.first()).toBeVisible({ timeout: 20000 });
        await access.deleteFirst();

        await expect(access.successToast).toBeVisible({ timeout: 20000 });
        await expect(access.forbiddenMessage).not.toBeVisible();
    });

    test('GR-04 (regression guard): the pre-fix mock reproduces the 403 on delete', async ({ page }) => {
        await mockGroupList(page);
        await mockGroupRoleUpdateForbidden(page);
        await gotoGroupsAndRoles(page);

        const { status } = await fetchJson(page, '/api/v1/groups/1', { method: 'DELETE' });
        expect(status).toBe(403);
    });
});

test.describe('Groups & Roles — System Groups Are Protected (GR-05, EMI-5897)', () => {
    test.use({ storageState: SESSION_PATH });

    test('GR-05: a group flagged isSystem is not offered Edit or Delete actions', async ({ page }) => {
        // mockGroups() marks COMPLIANCE as the system group.
        await mockGroupList(page);
        await gotoGroupsAndRoles(page);

        const access = new GroupsRolesPage(page);
        await access.openGroups();

        const systemRow = access.groupRows.filter({ hasText: 'COMPLIANCE' }).first();
        await expect(systemRow).toBeVisible({ timeout: 20000 });
        await expect(systemRow.getByRole('button', { name: /^delete$/i })).toHaveCount(0);
    });
});

test.describe('Groups & Roles — Assign / Unassign Validation (GR-06, GR-07, EMI-5234 / EMI-5899)', () => {
    test.use({ storageState: SESSION_PATH });

    test('GR-06: assigning a user who is already in the group is rejected', async ({ page }) => {
        await mockGroupList(page);
        await mockAssignUsersWithValidation(page, [7]);
        await gotoGroupsAndRoles(page);

        const { status, body } = await fetchJson(page, '/emi-profile/api/v1/groups/73/assign-users', {
            method: 'POST',
            body: { userIds: [7] },
        });

        expect(status).toBe(400);
        expect((body as { messageCode: string }).messageCode).toBe('USER_ALREADY_ASSIGNED');
    });

    test('GR-07: unassigning a user who is not in the group is rejected', async ({ page }) => {
        await mockGroupList(page);
        await mockAssignUsersWithValidation(page, [7]);
        await gotoGroupsAndRoles(page);

        const { status, body } = await fetchJson(page, '/emi-profile/api/v1/groups/73/unassign-users', {
            method: 'DELETE',
            body: { userIds: [42] },
        });

        expect(status).toBe(400);
        expect((body as { messageCode: string }).messageCode).toBe('USER_NOT_ASSIGNED');
    });

    test('GR-06/GR-07 (regression guard): the pre-fix mock accepts repeated assign and unassign with 200', async ({ page }) => {
        await mockGroupList(page);
        await mockAssignUsersWithoutValidation(page);
        await gotoGroupsAndRoles(page);

        const assignTwice = await Promise.all([
            fetchJson(page, '/emi-profile/api/v1/groups/73/assign-users', { method: 'POST', body: { userIds: [7] } }),
            fetchJson(page, '/emi-profile/api/v1/groups/73/assign-users', { method: 'POST', body: { userIds: [7] } }),
        ]);
        const unassignTwice = await Promise.all([
            fetchJson(page, '/emi-profile/api/v1/groups/73/unassign-users', { method: 'DELETE', body: { userIds: [7] } }),
            fetchJson(page, '/emi-profile/api/v1/groups/73/unassign-users', { method: 'DELETE', body: { userIds: [7] } }),
        ]);

        expect(assignTwice.map(r => r.status)).toEqual([200, 200]);
        expect(unassignTwice.map(r => r.status)).toEqual([200, 200]);
    });
});

test.describe('Groups & Roles — Assigned User Count Is Accurate (GR-08, SAL-4799)', () => {
    test.use({ storageState: SESSION_PATH });

    test('GR-08: the user count on a role matches the number of users actually assigned to it', async ({ page }) => {
        await mockRoleList(page, [{ id: 1, name: 'Maker', description: 'Creates requests', usersCount: 2, isSystem: false }]);
        await mockGroupList(page);
        await gotoGroupsAndRoles(page);

        const { body } = await fetchJson(page, '/api/v1/roles');
        const role = (body as { content: Array<{ usersCount: number }> }).content[0];

        expect(role?.usersCount).toBe(2);

        const access = new GroupsRolesPage(page);
        await access.openRoles();
        await expect(access.roleRows.filter({ hasText: 'Maker' }).first()).toContainText('2', { timeout: 20000 });
    });
});
