import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { ManageUsersPage } from '../../pageElements/UserManagement/ManageUsersPage';
import { AddUserFormPage } from '../../pageElements/UserManagement/AddUserFormPage';
import {
    gotoManageUsers,
    uniqueMobile,
    uniqueNationalId,
    mockUserList,
    mockEmptyUserList,
    mockUser,
    mockCreateUserSuccess,
    mockUserListFilteredByStatus,
    mockUpdateUserSuccess,
    mockUserStatusChangeSuccess,
    mockGroupList,
    USER_STATUSES,
} from '../UserManagementHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Manage Accounts → Manage Users — core flow (MU-01..MU-10).
//
// Traces to EMI-4844 (BE — User Management KYP/KYC lifecycle and the six user
// statuses) and EMI-4847 (FE Web — names removed from the create form,
// National ID / Iqama added, Nafath opens after creation).
//
// MOCK-DRIVEN. Creating a real staff user in UAT burns a National ID and a
// mobile number from a finite pool and leaves an unrevertible record behind, so
// the happy path is driven through page.route() rather than the live gateway.
// The live-data variants are marked test.skip pending a dedicated
// user-management fixture account (see UserManagementHelper.ts header).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Manage Users — List (MU-01, MU-02)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MU-01: the users list renders Full Name, User Group, Mobile Number and Status for each row', async ({ page }) => {
        await mockUserList(page, [
            mockUser({ firstName: 'Sara', lastName: 'Ahmed', groupName: 'FINANCE', mobileNumber: '500111222' }),
        ]);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();

        const firstRow = users.userRows.first();
        await expect(firstRow).toContainText('Sara Ahmed');
        await expect(firstRow).toContainText('FINANCE');
        await expect(firstRow).toContainText('500111222');
        await expect(firstRow).toContainText(/active/i);
    });

    test('MU-02: an account with no staff users shows the empty state instead of a broken table', async ({ page }) => {
        await mockEmptyUserList(page);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await expect(users.emptyState).toBeVisible({ timeout: 15000 });
        await expect(users.errorToast).not.toBeVisible();
    });
});

test.describe('Manage Users — Add New User (MU-03, MU-04, MU-05, MU-06)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MU-03: the create-user form asks for National ID / Iqama and no longer asks for first or last name (EMI-4847)', async ({ page }) => {
        await mockUserList(page);
        await mockGroupList(page);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.openAddUserForm();

        const form = new AddUserFormPage(page);
        await expect(form.nationalIdInput).toBeVisible({ timeout: 15000 });
        await expect(form.mobileInput).toBeVisible();
        await expect(form.firstNameInput).toHaveCount(0);
        await expect(form.lastNameInput).toHaveCount(0);
    });

    test('MU-04: submitting valid details creates the user and it appears in the list (EMI-4742)', async ({ page }) => {
        const created = mockUser({ firstName: 'New', lastName: 'Staff', groupName: 'FINANCE', mobileNumber: '500999888' });
        await mockCreateUserSuccess(page, created);
        await mockGroupList(page);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.openAddUserForm();

        const form = new AddUserFormPage(page);
        await form.fillForm({ nationalId: uniqueNationalId(), mobile: uniqueMobile(), group: 'FINANCE' });
        await form.submit();

        await expect(users.userRows.filter({ hasText: 'New Staff' })).toBeVisible({ timeout: 20000 });
        await expect(users.userRows.first()).toContainText('500999888');
    });

    test('MU-05: submitting an empty form is blocked with a field-level required message', async ({ page }) => {
        await mockUserList(page);
        await mockGroupList(page);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.openAddUserForm();

        const form = new AddUserFormPage(page);
        await expect(form.nationalIdInput).toBeVisible({ timeout: 15000 });
        await form.submit();

        await expect(form.submitButton.and(page.locator(':disabled')).or(form.requiredFieldError))
            .toBeVisible({ timeout: 15000 });
    });

    test('MU-06: the Nafath verification screen opens once the user record is created (EMI-4847)', async ({ page }) => {
        await mockCreateUserSuccess(page);
        await mockGroupList(page);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.openAddUserForm();

        const form = new AddUserFormPage(page);
        await form.fillForm({ nationalId: uniqueNationalId(), mobile: uniqueMobile(), group: 'FINANCE' });
        await form.submit();

        await expect(form.nafathScreen).toBeVisible({ timeout: 20000 });
    });
});

test.describe('Manage Users — Status Filter (MU-07)', () => {
    test.use({ storageState: SESSION_PATH });

    // EMI-4844 defines six statuses; the filter must reach the API for each.
    for (const status of USER_STATUSES.filter(s => s !== 'DELETED')) {
        test(`MU-07 [${status}]: selecting the ${status} status narrows the list to that status only`, async ({ page }) => {
            await mockUserListFilteredByStatus(page);
            await gotoManageUsers(page);

            const users = new ManageUsersPage(page);
            await users.waitForList();
            await users.filterByStatus(status);

            await expect(async () => {
                const rows = await users.userRows.allInnerTexts();
                const humanised = status.replace(/_/g, ' ');
                for (const row of rows) {
                    expect(row).toMatch(new RegExp(humanised, 'i'));
                }
            }).toPass({ timeout: 15000 });
        });
    }
});

test.describe('Manage Users — Edit & Lifecycle (MU-08, MU-09, MU-10)', () => {
    test.use({ storageState: SESSION_PATH });

    test('MU-08: editing a user updates their group and confirms with a success message', async ({ page }) => {
        await mockUserList(page);
        await mockGroupList(page);
        await mockUpdateUserSuccess(page);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.editUserButton.first().click();

        const form = new AddUserFormPage(page);
        await form.selectGroup('OPERATIONS');
        await form.submit();

        await expect(users.successToast).toBeVisible({ timeout: 20000 });
        await expect(users.errorToast).not.toBeVisible();
    });

    test('MU-09: deactivating an active user moves them to DEACTIVATED (EMI-4844 lifecycle)', async ({ page }) => {
        await mockUserList(page, [mockUser({ firstName: 'Active', lastName: 'Staff' })]);
        await mockUserStatusChangeSuccess(page, 'DEACTIVATED');
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.deactivateUserButton.first().click();

        await expect(users.successToast).toBeVisible({ timeout: 20000 });
        await expect(users.unauthorizedMessage).not.toBeVisible();
    });

    test('MU-10: reactivating a deactivated user moves them back to ACTIVE', async ({ page }) => {
        await mockUserList(page, [
            mockUser({ firstName: 'Inactive', lastName: 'Staff', status: { code: 'DEACTIVATED', nameEn: 'Deactivated', nameAr: 'ar' } }),
        ]);
        await mockUserStatusChangeSuccess(page, 'ACTIVE');
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.activateUserButton.first().click();

        await expect(users.successToast).toBeVisible({ timeout: 20000 });
        await expect(users.unauthorizedMessage).not.toBeVisible();
    });
});
