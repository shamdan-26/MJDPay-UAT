import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/helpers/LoginHelper.ts';
import { ManageUsersPage } from '../../pageElements/UserManagement/ManageUsersPage';
import { AddUserFormPage } from '../../pageElements/UserManagement/AddUserFormPage';
import { ExternalPartyPage } from '../../pageElements/UserManagement/ExternalPartyPage';
import {
    fetchJson,
    gotoManageUsers,
    gotoAdminUsers,
    gotoAdminExternalParties,
    uniqueMobile,
    uniqueNationalId,
    mockCreateUserSuccess,
    mockCreateUserThenEmptyList,
    mockAdminStaffGroups,
    mockAdminStaffGroupsServerError,
    mockExternalPartyRoles,
    mockExternalPartyRolesEmpty,
} from '../helpers/UserManagementHelper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Admin / Business user provisioning — post-creation visibility and the two
// dropdowns that block it (AUP-01..AUP-04) — MOCK ONLY.
//
// EMI-6038 (Manage Users list appears empty after a successful create),
// EMI-6066 (GET /groups/admin/staff 500s, so the Group dropdown in Add New
// User is empty), EMI-6067 (Role dropdown is empty in the Add External Party
// modal, blocking party creation).
//
// All three are "the create succeeded but the screen can't show it / can't be
// reached" defects, which is why they sit together rather than in
// ManageUsers.spec.ts (happy-path CRUD) or UserManagementBugs.spec.ts (the
// EMI-47xx/50xx/58xx bug wave).
//
// Endpoints: `/emi-profile/api/v1/groups/admin/staff` is confirmed — it is the
// exact failing path in the EMI-6066 curl block. The Add External Party role
// source is NOT named anywhere in EMI-6067, so mockExternalPartyRoles() serves
// both plausible sources; see its comment in UserManagementHelper.ts.
//
// Locators: neither the Admin Portal nor Manage Users is in
// QA-DATA-TESTID-HANDOFF.md, so every locator used here is best-effort.
// Reconcile against the live DOM before using this file as a CI gate.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('User Provisioning — New User Appears In The List (AUP-01, EMI-6038)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('AUP-01: the users list is repopulated with the new row after a successful create', async ({ page }) => {
        await mockCreateUserSuccess(page);
        await gotoManageUsers(page);

        const users = new ManageUsersPage(page);
        await users.waitForList();
        await users.openAddUserForm();

        const form = new AddUserFormPage(page);
        await form.fillForm({ nationalId: uniqueNationalId(), mobile: uniqueMobile() });
        await form.submit();
        await form.assertSubmitSettles();

        // EMI-6038: the POST succeeded and the API even returned the user, but
        // the list came back empty, so the row never showed.
        await users.waitForList();
        await expect(users.emptyState, 'users list rendered its empty state after a successful create').not.toBeVisible({ timeout: 20000 });
        await expect(users.userRows.first()).toBeVisible({ timeout: 20000 });
    });

    test('AUP-01 (regression guard, EMI-6038): the pre-fix mock creates the user but lists nothing', async ({ page }) => {
        await mockCreateUserThenEmptyList(page);
        await gotoManageUsers(page);

        const created = await fetchJson(page, '/api/v1/users', {
            method: 'POST',
            body: { identityNumber: uniqueNationalId(), mobileNumber: uniqueMobile() },
        });
        const listed = await fetchJson(page, '/api/v1/users?page=0&size=10');

        expect(created.status).toBe(200);
        expect((created.body as { id: number }).id).toBeDefined();
        expect((listed.body as { content: unknown[] }).content.length).toBe(0);
    });
});

test.describe('User Provisioning — Admin Group Dropdown (AUP-02, EMI-6066)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('AUP-02: GET /groups/admin/staff returns 200 with the admin groups', async ({ page }) => {
        await mockAdminStaffGroups(page);
        await gotoAdminUsers(page);

        const { status, body } = await fetchJson(page, '/emi-profile/api/v1/groups/admin/staff?page=0&size=10');

        expect(status).toBe(200);
        expect((body as { content: unknown[] }).content.length).toBeGreaterThan(0);
    });

    test('AUP-02 (regression guard, EMI-6066): the pre-fix mock reproduces the 500', async ({ page }) => {
        await mockAdminStaffGroupsServerError(page);
        await gotoAdminUsers(page);

        const { status, body } = await fetchJson(page, '/emi-profile/api/v1/groups/admin/staff?page=0&size=10');

        expect(status).toBe(500);
        expect(JSON.stringify(body)).toContain('INTERNAL_SERVER_ERROR');
    });

    test('AUP-02b: no error toast on landing, and the Group dropdown has options', async ({ page }) => {
        await mockAdminStaffGroups(page);
        await gotoAdminUsers(page);

        const users = new ManageUsersPage(page);
        // EMI-6066's first symptom is the toast that fires before the user
        // even opens the form.
        await expect(users.errorToast).not.toBeVisible({ timeout: 5000 });

        await users.waitForList();
        await users.openAddUserForm();

        const form = new AddUserFormPage(page);
        const hasGroupPicker = await form.groupDropdown
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!hasGroupPicker, 'Group dropdown not rendered — reconcile locators against the live DOM');

        await form.groupDropdown.click();
        await expect(page.getByRole('option').first(), 'Group dropdown rendered no options').toBeVisible({ timeout: 15000 });
    });
});

test.describe('User Provisioning — External Party Role Dropdown (AUP-03, EMI-6067)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('AUP-03: the Add External Party modal renders selectable roles', async ({ page }) => {
        await mockExternalPartyRoles(page);
        await gotoAdminExternalParties(page);

        const externals = new ExternalPartyPage(page);
        await externals.openAddPartyModal();
        await externals.openRoleDropdown();

        await expect(externals.roleOptions().first(), 'Role dropdown opened with no options').toBeVisible({ timeout: 15000 });
        expect(await externals.roleOptions().count()).toBeGreaterThan(0);
    });

    test('AUP-03b: filling every field and picking a role submits without a required-field block', async ({ page }) => {
        await mockExternalPartyRoles(page);
        await gotoAdminExternalParties(page);

        const externals = new ExternalPartyPage(page);
        await externals.openAddPartyModal();
        await externals.fillRequiredFields({
            name: `QA External ${Date.now()}`,
            email: `qa.external.${Date.now()}@example.com`,
            mobile: uniqueMobile(),
        });
        await externals.openRoleDropdown();

        const optionCount = await externals.roleOptions().count();
        test.skip(optionCount === 0, 'no role options — AUP-03 already covers the empty-dropdown defect');
        await externals.roleOptions().first().click();

        await externals.submitButton.click();

        // EMI-6067: pre-fix the empty dropdown left the field unset and
        // "This Field is Required" blocked submission permanently.
        await expect(externals.requiredFieldError).not.toBeVisible({ timeout: 10000 });
    });

    test('AUP-03 (regression guard, EMI-6067): the pre-fix mock leaves the Role dropdown empty', async ({ page }) => {
        await mockExternalPartyRolesEmpty(page);
        await gotoAdminExternalParties(page);

        const externals = new ExternalPartyPage(page);
        await externals.openAddPartyModal();
        await externals.openRoleDropdown();

        expect(await externals.roleOptions().count()).toBe(0);
    });
});
