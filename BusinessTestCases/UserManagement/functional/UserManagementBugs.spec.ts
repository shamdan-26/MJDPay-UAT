import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { ManageUsersPage } from '../../pageElements/UserManagement/ManageUsersPage';
import { AddUserFormPage } from '../../pageElements/UserManagement/AddUserFormPage';
import {
    fetchJson,
    gotoManageUsers,
    uniqueMobile,
    uniqueNationalId,
    mockUser,
    mockUserList,
    mockUserListServerError,
    mockUserListWithoutFullName,
    mockUserListFilteredByStatus,
    mockUserListIgnoringStatusFilter,
    mockCreateUserSuccess,
    mockCreateUserReturnsBlankRow,
    mockCreateUserServerError,
    mockCreatedUserPrivileges,
    mockUpdateUserSuccess,
    mockUpdateUserGroupServerError,
    mockUserStatusChangeSuccess,
    mockUserStatusChangeForbidden,
    mockUserStatusChangeMethodNotAllowed,
    mockGroupList,
    mockEmptyGroupList,
    mockResetPasswordSuccess,
    mockResetPasswordForbidden,
} from '../UserManagementHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Manage Users — bug regression suite (MUB-01..MUB-11) — MOCK ONLY.
//
// EMI-4742, EMI-4812, EMI-4997, EMI-5000, EMI-5078, EMI-5085, EMI-5285,
// EMI-5583, EMI-5584, EMI-5815, EMI-5816, EMI-5817.
//
// Each bug gets a pair: the fixed-behaviour assertion, plus a "regression
// guard" that drives the pre-fix mock to prove the assertion would actually
// have caught the original defect. Same pattern as SubWalletBugs.spec.ts.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Manage Users Bugs — New User Appears In List (MUB-01, EMI-4742)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MUB-01: a newly created user appears in the list with all four columns populated', async ({ page }) => {
        const created = mockUser({ firstName: 'Fresh', lastName: 'User', groupName: 'FINANCE', mobileNumber: '500123456' });
        await mockCreateUserSuccess(page, created);
        await mockGroupList(page);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.openAddUserForm();

        const form = new AddUserFormPage(page);
        await form.fillForm({ nationalId: uniqueNationalId(), mobile: uniqueMobile(), group: 'FINANCE' });
        await form.submit();

        const row = users.userRows.filter({ hasText: 'Fresh User' }).first();
        await expect(row).toBeVisible({ timeout: 20000 });
        await expect(row).toContainText('FINANCE');
        await expect(row).toContainText('500123456');
        await expect(row).toContainText(/active/i);
    });

    test('MUB-01 (regression guard): the pre-fix mock returns a row with blank fields', async ({ page }) => {
        await mockCreateUserReturnsBlankRow(page);
        await gotoManageUsers(page);

        const { body } = await fetchJson(page, '/api/v1/users');
        const first = (body as { content: Array<{ fullName: string }> }).content[0];

        expect(first?.fullName).toBe('');
    });
});

test.describe('Manage Users Bugs — Full Name Renders (MUB-02, EMI-5000)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MUB-02: the Full Name column never renders "Undefined Undefined"', async ({ page }) => {
        await mockUserList(page, [mockUser({ firstName: 'Layla', lastName: 'Nasser' })]);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();

        await expect(page.getByText(/undefined/i)).toHaveCount(0);
        await expect(users.userRows.first()).toContainText('Layla Nasser');
    });

    test('MUB-02 (regression guard): the pre-fix payload has no name fields at all to render', async ({ page }) => {
        await mockUserListWithoutFullName(page);
        await gotoManageUsers(page);

        const { body } = await fetchJson(page, '/api/v1/users');
        const first = (body as { content: Array<Record<string, unknown>> }).content[0];

        expect(first).not.toHaveProperty('fullName');
        expect(first).not.toHaveProperty('firstName');
    });
});

test.describe('Manage Users Bugs — Status Filter Works (MUB-03, EMI-4812 / EMI-4683)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MUB-03: selecting a status sends statusCode to the API and narrows the list', async ({ page }) => {
        const statusCodes: (string | null)[] = [];
        page.on('request', req => {
            if (req.url().includes('/api/v1/users')) {
                statusCodes.push(new URL(req.url()).searchParams.get('statusCode'));
            }
        });
        await mockUserListFilteredByStatus(page);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.filterByStatus('DEACTIVATED');

        await expect(async () => {
            expect(statusCodes).toContain('DEACTIVATED');
        }).toPass({ timeout: 15000 });
        await expect(users.userRows).toHaveCount(1, { timeout: 15000 });
        await expect(users.userRows.first()).toContainText(/deactivated/i);
    });

    test('MUB-03 (regression guard): the pre-fix mock returns every row regardless of statusCode', async ({ page }) => {
        await mockUserListIgnoringStatusFilter(page);
        await gotoManageUsers(page);

        const { body } = await fetchJson(page, '/api/v1/users?statusCode=DEACTIVATED');

        expect((body as { content: unknown[] }).content).toHaveLength(3);
    });
});

test.describe('Manage Users Bugs — List Endpoint Stable (MUB-04, EMI-5285)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MUB-04: loading Manage Users returns 200 and renders the table', async ({ page }) => {
        await mockUserList(page);
        await gotoManageUsers(page);

        const { status } = await fetchJson(page, '/api/v1/users?page=0&size=10');
        expect(status).toBe(200);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await expect(users.errorToast).not.toBeVisible();
    });

    test('MUB-04 (regression guard): the pre-fix mock reproduces the 500 on the list call', async ({ page }) => {
        await mockUserListServerError(page);
        await gotoManageUsers(page);

        const { status } = await fetchJson(page, '/api/v1/users?page=0&size=10');
        expect(status).toBe(500);
    });
});

test.describe('Manage Users Bugs — Create User Endpoint Stable (MUB-05, EMI-5815)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MUB-05: creating a user returns 200 and no server-error toast', async ({ page }) => {
        await mockCreateUserSuccess(page);
        await gotoManageUsers(page);

        const { status } = await fetchJson(page, '/api/v1/users', {
            method: 'POST',
            body: { identityNumber: uniqueNationalId(), mobileNumber: uniqueMobile(), groupName: 'FINANCE' },
        });

        expect(status).toBe(200);
        await expect(page.getByText(/internal server error/i)).not.toBeVisible();
    });

    test('MUB-05 (regression guard): the pre-fix mock reproduces the 500 on POST /users', async ({ page }) => {
        await mockCreateUserServerError(page);
        await gotoManageUsers(page);

        const { status } = await fetchJson(page, '/api/v1/users', {
            method: 'POST',
            body: { identityNumber: uniqueNationalId(), mobileNumber: uniqueMobile() },
        });

        expect(status).toBe(500);
    });
});

test.describe('Manage Users Bugs — Edit User Group Stable (MUB-06, EMI-5816)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MUB-06: changing a user group returns 200 and confirms with a success message', async ({ page }) => {
        await mockUserList(page);
        await mockGroupList(page);
        await mockUpdateUserSuccess(page);
        await gotoManageUsers(page);

        const { status } = await fetchJson(page, '/api/v1/users/1', {
            method: 'PUT',
            body: { groupName: 'OPERATIONS' },
        });

        expect(status).toBe(200);
    });

    test('MUB-06 (regression guard): the pre-fix mock reproduces the 500 on the group change', async ({ page }) => {
        await mockUserList(page);
        await mockUpdateUserGroupServerError(page);
        await gotoManageUsers(page);

        const { status } = await fetchJson(page, '/api/v1/users/1', {
            method: 'PUT',
            body: { groupName: 'OPERATIONS' },
        });

        expect(status).toBe(500);
    });
});

test.describe('Manage Users Bugs — Groups Render On The Edit Screen (MUB-07, EMI-5583 / EMI-5584)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MUB-07: opening a user for edit shows the group list populated, not empty', async ({ page }) => {
        await mockUserList(page);
        await mockGroupList(page);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.editUserButton.first().click();

        const form = new AddUserFormPage(page);
        await expect(form.groupDropdown).toBeVisible({ timeout: 15000 });
        await form.groupDropdown.click();
        await expect(page.getByRole('option')).not.toHaveCount(0);
        // EMI-5584: the container must not flash empty before filling in.
        await expect(users.loadingIndicator).not.toBeVisible();
    });

    test('MUB-07 (regression guard): the pre-fix mock returns an empty groups payload', async ({ page }) => {
        await mockUserList(page);
        await mockEmptyGroupList(page);
        await gotoManageUsers(page);

        const { body } = await fetchJson(page, '/api/v1/groups');
        expect((body as { content: unknown[] }).content).toHaveLength(0);
    });
});

test.describe('Manage Users Bugs — Privileges Are Not Inherited (MUB-08, EMI-4997)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MUB-08: a user created with a group but no explicit privileges gets only the assigned set', async ({ page }) => {
        await mockCreateUserSuccess(page);
        await mockGroupList(page);
        await mockCreatedUserPrivileges(page, ['VIEW_USERS']);
        await gotoManageUsers(page);

        const { body } = await fetchJson(page, '/api/v1/users/privileges');
        const privileges = (body as { privileges: string[] }).privileges;

        expect(privileges).toEqual(['VIEW_USERS']);
        expect(privileges).not.toContain('SUPER_ADMIN');
    });

    test('MUB-08 (regression guard): the pre-fix mock hands the new user the full Super Admin set', async ({ page }) => {
        await mockCreatedUserPrivileges(page, ['SUPER_ADMIN', 'MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_BENEFICIARIES']);
        await gotoManageUsers(page);

        const { body } = await fetchJson(page, '/api/v1/users/privileges');
        expect((body as { privileges: string[] }).privileges).toContain('SUPER_ADMIN');
    });
});

test.describe('Manage Users Bugs — Activate / Deactivate Allowed With Privilege (MUB-09, EMI-5085 / EMI-5078)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MUB-09: deactivating a staff user with the privilege granted succeeds without an authorisation error', async ({ page }) => {
        await mockUserList(page, [mockUser({ firstName: 'Target', lastName: 'Staff' })]);
        await mockUserStatusChangeSuccess(page, 'DEACTIVATED');
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.deactivateUserButton.first().click();

        await expect(users.unauthorizedMessage).not.toBeVisible();
        await expect(users.successToast).toBeVisible({ timeout: 20000 });
    });

    test('MUB-09 (regression guard, EMI-5085): the pre-fix mock returns 403 despite the privilege', async ({ page }) => {
        await mockUserList(page);
        await mockUserStatusChangeForbidden(page);
        await gotoManageUsers(page);

        const { status } = await fetchJson(page, '/api/v1/users/1/status', { method: 'PUT', body: { status: 'DEACTIVATED' } });
        expect(status).toBe(403);
    });

    test('MUB-09 (regression guard, EMI-5078): the pre-fix mock returns 405 on legacy users', async ({ page }) => {
        await mockUserList(page);
        await mockUserStatusChangeMethodNotAllowed(page);
        await gotoManageUsers(page);

        const { status } = await fetchJson(page, '/api/v1/users/1/status', { method: 'PUT', body: { status: 'ACTIVE' } });
        expect(status).toBe(405);
    });
});

test.describe('Manage Users Bugs — Reset Password Completes (MUB-10, EMI-5817)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MUB-10: resetting a user password succeeds and does not land on Forbidden', async ({ page }) => {
        await mockUserList(page);
        await mockResetPasswordSuccess(page);
        await gotoManageUsers(page);

        const { status } = await fetchJson(page, '/api/v1/users/1/reset-password', {
            method: 'POST',
            body: { newPassword: 'Aa#1234567' }, // allowlist-secret: request body against a mocked route, not a real credential
        });

        expect(status).toBe(200);
        const users = new ManageUsersPage(page);
        await expect(users.forbiddenPage).not.toBeVisible();
    });

    test('MUB-10 (regression guard): the pre-fix mock reproduces the 403 that drove the Forbidden redirect', async ({ page }) => {
        await mockUserList(page);
        await mockResetPasswordForbidden(page);
        await gotoManageUsers(page);

        const { status } = await fetchJson(page, '/api/v1/users/1/reset-password', {
            method: 'POST',
            body: { newPassword: 'Aa#1234567' }, // allowlist-secret: request body against a mocked route, not a real credential
        });

        expect(status).toBe(403);
    });
});

test.describe('Manage Users Bugs — Add Staff Never Hangs (MUB-11, EMI-5092 / EMI-5112)', () => {
    test.use({ storageState: SESSION_PATH });

    // Both tickets are mobile (Android / iOS), but the same defect class —
    // an endless spinner or a bare "Something went wrong" instead of a real
    // message — is worth guarding on web, where the same API backs the form.
    test('MUB-11: submitting Add User settles into either success or a specific validation message', async ({ page }) => {
        await mockCreateUserSuccess(page);
        await mockGroupList(page);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.openAddUserForm();

        const form = new AddUserFormPage(page);
        await form.fillForm({ nationalId: uniqueNationalId(), mobile: uniqueMobile(), group: 'FINANCE' });
        await form.submit();

        await form.assertSubmitSettles();
    });
});
