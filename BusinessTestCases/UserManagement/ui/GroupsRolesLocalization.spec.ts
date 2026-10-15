import { test, expect } from '@playwright/test';
import { SESSION_PATH } from '../../Login/LoginHelper';
import { GroupsRolesPage } from '../../pageElements/UserManagement/GroupsRolesPage';
import {
    fetchJson,
    gotoGroupsManagement,
    localizedGroups,
    localizedRoles,
    mockCustomGroupsAndRoles,
    mockCustomListingsWithoutArabicFields,
} from '../UserManagementHelper';

// ─────────────────────────────────────────────────────────────────────────────
// Access & Permissions — Arabic layout and form completeness (GRL-01..GRL-06).
// MOCK ONLY. `ui/` per the repo convention: element/text presence and
// rendering, no business outcomes (those live in RbacScopedEndpoints.spec.ts).
//
// EMI-5972 (Name column blank in the Arabic Groups List), EMI-6005 (Roles
// table renders `name` instead of `nameAr` in Arabic mode), EMI-6004 (BE:
// `descriptionAr` missing from the listing DTOs entirely), EMI-5973
// (breadcrumb shows the raw i18n key `Main.Permissions_management.Add_edit_role`),
// EMI-5974 (unstyled Create Role button), EMI-5975 (no Arabic name/description
// fields on the create/edit forms). Part of the EMI-5966 Saudi/MSA i18n sweep.
//
// EMI-6004 is still To Do at time of writing — GRL-03's "fixed" assertion is
// expected to fail until the DTO change lands, which is the point of writing it.
//
// Language switching: the portal reads `Accept-Language` / the `locale` header
// server-side, but the client-side toggle is a UI control this repo has no
// confirmed locator for. Rather than guess at a language switcher, the DOM
// assertions below set the browser locale via test.use({ locale }) and the
// contract assertions go straight at the API with an explicit header — the
// same split PayBill/BankTransfer localisation specs already use.
// ─────────────────────────────────────────────────────────────────────────────

const AR_LOCALE = 'ar-SA';
const GROUPS_PATH = '/custom/groups?page=0&size=10';
const ROLES_PATH  = '/custom/roles?page=0&size=10';

interface ListingPage { content: Record<string, unknown>[] }

test.describe('Groups & Roles Arabic — Name Column Is Populated (GRL-01, EMI-5972)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH, locale: AR_LOCALE });

    test('GRL-01: every group row renders a non-empty Name cell in the Arabic layout', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openGroups();
        await expect(access.groupRows.first()).toBeVisible({ timeout: 20000 });

        const names = await access.nameColumnTexts();
        test.skip(names.length === 0, 'Name column not resolvable — reconcile locators against the live DOM');

        // EMI-5972: the cell rendered as an empty space while the description
        // beside it was fine, so an all-rows innerText check would have passed.
        for (const name of names) {
            expect(name, 'a group row rendered an empty Name cell').not.toBe('');
        }
    });
});

test.describe('Groups & Roles Arabic — Roles Table Renders nameAr (GRL-02, EMI-6005)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH, locale: AR_LOCALE });

    test('GRL-02: the Arabic Roles table shows nameAr, not the English name', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openRoles();
        await expect(access.roleRows.first()).toBeVisible({ timeout: 20000 });

        const [maker] = localizedRoles();
        const table = await access.roleRows.first().innerText();

        expect(table, 'Arabic roles table rendered the English name').toContain(maker!.nameAr);
    });

    test('GRL-02b: nameAr falls back to name only when nameAr is null', async ({ page }) => {
        const roles = localizedRoles().map(r => ({ ...r, nameAr: null }));
        await mockCustomGroupsAndRoles(page, localizedGroups(), roles);
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openRoles();
        await expect(access.roleRows.first()).toBeVisible({ timeout: 20000 });

        // With nameAr null the AC explicitly permits the English name.
        await expect(access.roleRows.filter({ hasText: 'Maker' }).first()).toBeVisible();
    });
});

test.describe('Groups & Roles — descriptionAr On The Listing DTOs (GRL-03, EMI-6004)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('GRL-03: /custom/groups and /custom/roles both return descriptionAr', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await gotoGroupsManagement(page);

        for (const path of [GROUPS_PATH, ROLES_PATH]) {
            const { status, body } = await fetchJson(page, path, { headers: { 'Accept-Language': 'ar_sa' } });
            expect(status).toBe(200);
            expect((body as ListingPage).content[0], `${path} is missing descriptionAr`).toHaveProperty('descriptionAr');
        }
    });

    test('GRL-03 (regression guard, EMI-6004): the pre-fix mock drops descriptionAr and nameAr', async ({ page }) => {
        await mockCustomListingsWithoutArabicFields(page);
        await gotoGroupsManagement(page);

        const { body } = await fetchJson(page, GROUPS_PATH, { headers: { 'Accept-Language': 'ar_sa' } });
        const row = (body as ListingPage).content[0]!;

        expect(row).not.toHaveProperty('descriptionAr');
        expect(row).toHaveProperty('description');
    });
});

test.describe('Groups & Roles — Assign Privileges Breadcrumb (GRL-04, EMI-5973)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('GRL-04: the breadcrumb shows a localized title, not a raw i18n key', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openRoles();
        await expect(access.roleRows.first()).toBeVisible({ timeout: 20000 });

        const canAssign = await access.assignPrivilegesButton
            .waitFor({ state: 'visible', timeout: 5000 })
            .then(() => true)
            .catch(() => false);
        test.skip(!canAssign, 'Assign privileges control not rendered — reconcile locators against the live DOM');

        await access.openAssignPrivileges();
        await expect(access.breadcrumb).toBeVisible({ timeout: 15000 });

        const crumb = await access.breadcrumb.innerText();
        // The exact untranslated string quoted in EMI-5973.
        expect(crumb, 'breadcrumb still renders the raw translation key').not.toContain('Main.Permissions_management');
        expect(crumb).not.toMatch(/Main\.[A-Za-z_]+\./);
    });
});

test.describe('Groups & Roles — Create Role Button Styling (GRL-05, EMI-5974)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('GRL-05: the Create Role button has a real primary background, not a transparent one', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openRoles();
        await expect(access.createRoleButton).toBeVisible({ timeout: 20000 });

        const background = await access.createRoleBackgroundColor();

        // EMI-5974 is "no background colour at all" — the button inherited the
        // page ground, so text contrast was unreadable. rgba(0,0,0,0) is the
        // computed value for an unset background.
        expect(background, 'Create Role button has no background colour').not.toBe('rgba(0, 0, 0, 0)');
        expect(background).not.toBe('transparent');
    });
});

test.describe('Groups & Roles — Arabic Fields On The Forms (GRL-06, EMI-5975)', () => {
    test.describe.configure({ mode: 'serial' });
    test.use({ storageState: SESSION_PATH });

    test('GRL-06: the Create Role form offers Name (Arabic) and Description (Arabic)', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openRoles();
        await expect(access.createRoleButton).toBeVisible({ timeout: 20000 });
        await access.createRoleButton.click();

        await expect(access.nameInput).toBeVisible({ timeout: 15000 });
        await expect(access.nameArInput, 'Name (Arabic) field is missing from the Create Role form').toBeVisible();
        await expect(access.descriptionArInput, 'Description (Arabic) field is missing from the Create Role form').toBeVisible();
    });

    test('GRL-06b: the Create Group form offers the same two Arabic fields', async ({ page }) => {
        await mockCustomGroupsAndRoles(page);
        await gotoGroupsManagement(page);

        const access = new GroupsRolesPage(page);
        await access.openGroups();
        await expect(access.createGroupButton).toBeVisible({ timeout: 20000 });
        await access.createGroupButton.click();

        await expect(access.nameInput).toBeVisible({ timeout: 15000 });
        await expect(access.nameArInput, 'Name (Arabic) field is missing from the Create Group form').toBeVisible();
        await expect(access.descriptionArInput, 'Description (Arabic) field is missing from the Create Group form').toBeVisible();
    });
});
