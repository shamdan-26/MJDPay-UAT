import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { ManageUsersPage } from '../../pageElements/UserManagement/ManageUsersPage';
import { AddUserFormPage } from '../../pageElements/UserManagement/AddUserFormPage';
import { gotoManageUsers, mockUserList, mockGroupList } from '../UserManagementHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Manage Accounts → Manage Users — element/text presence only (MUU-01..MUU-05).
// Per the repo's functional/ vs ui/ split, nothing here asserts business
// outcomes; that lives in ../functional/.
//
// EMI-4847 (form fields), EMI-4812 (Status filter control), EMI-5883 (Clear
// Filter control), EMI-4742 (list column headers), EMI-5817 (Reset Password
// action present on a row).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Manage Users UI — Page Chrome (MUU-01, MUU-02, MUU-03)', () => {
    test.use({ storageState: SESSION_PATH });

    test.beforeEach(async ({ page }) => {
        await mockUserList(page);
        await mockGroupList(page);
        await gotoManageUsers(page);
    });

    test('MUU-01: the users table and the Add New User button are displayed', async ({ page }) => {
        const users = new ManageUsersPage(page);
        await users.waitForList();

        await expect(users.usersTable).toBeVisible();
        await expect(users.addUserButton).toBeVisible();
    });

    test('MUU-02: the list shows the Full Name, User Group, Mobile Number and Status column headers', async ({ page }) => {
        const users = new ManageUsersPage(page);
        await users.waitForList();

        for (const header of [/full\s*name/i, /(user\s*)?group/i, /mobile/i, /status/i]) {
            await expect(page.getByRole('columnheader', { name: header }).first()).toBeVisible({ timeout: 15000 });
        }
    });

    test('MUU-03: the Status filter and Clear Filter controls are displayed', async ({ page }) => {
        const users = new ManageUsersPage(page);
        await users.waitForList();

        await expect(users.statusFilterDropdown).toBeVisible({ timeout: 15000 });
        await expect(users.clearFilterButton).toBeVisible();
    });
});

test.describe('Manage Users UI — Add User Form (MUU-04, MUU-05)', () => {
    test.use({ storageState: SESSION_PATH });

    test.beforeEach(async ({ page }) => {
        await mockUserList(page);
        await mockGroupList(page);
        await gotoManageUsers(page);
        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.openAddUserForm();
    });

    test('MUU-04: the form shows National ID / Iqama, Mobile and Group inputs (EMI-4847)', async ({ page }) => {
        const form = new AddUserFormPage(page);

        await expect(form.nationalIdInput).toBeVisible({ timeout: 15000 });
        await expect(form.mobileInput).toBeVisible();
        await expect(form.groupDropdown).toBeVisible();
    });

    test('MUU-05: the form shows Save and Cancel actions', async ({ page }) => {
        const form = new AddUserFormPage(page);

        await expect(form.submitButton).toBeVisible({ timeout: 15000 });
        await expect(form.cancelButton).toBeVisible();
    });
});
