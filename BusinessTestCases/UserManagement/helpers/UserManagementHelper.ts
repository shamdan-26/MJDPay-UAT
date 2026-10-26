import type { Page } from '@playwright/test';
import { waitForToastClear } from '../../shared/toastMessages.ts';
import { ADMIN_BASE_URL } from '../../pageElements/Shared/AdminOtpConfigPage.ts';
import { boxStep } from '../../shared/boxStep.ts';

/**
 * Manage Accounts → Manage Users (Business web portal).
 *
 * Feature tickets: EMI-4844 (BE — User Management KYP/KYC lifecycle),
 * EMI-4847 (FE Web — create-user form drops names, adds National ID / Iqama,
 * opens Nafath after creation), EMI-5899 (assign-users-to-groups API),
 * EMI-5897 (tenant + isSystem columns on groups and roles).
 *
 * Bug set covered by the specs in this folder: EMI-4742, EMI-4812, EMI-4907,
 * EMI-4997, EMI-5000, EMI-5078, EMI-5085, EMI-5210, EMI-5234, EMI-5240,
 * EMI-5285, EMI-5583, EMI-5584, EMI-5613, EMI-5815, EMI-5816, EMI-5817.
 *
 * ── Endpoint provenance ──────────────────────────────────────────────────
 * `/emi-profile/api/v1/groups/{id}/unassign-users` is confirmed real — it is
 * the exact path in the curl repro on EMI-5234. Everything else
 * (`/api/v1/users`, `/api/v1/roles`, `/api/v1/groups`) is inferred from the
 * ticket wording, because none of the Manage Users bugs attached a curl
 * block. Manage Users is *not* in QA-DATA-TESTID-HANDOFF.md §4, so every
 * locator in pageElements/UserManagement/ is best-effort too. Reconcile both
 * against the live app on the first UAT run before using this suite as a CI
 * gate — same caveat as SubWalletsHelper.ts.
 */

export const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const MANAGE_USERS_URL = `${BASE_URL}/business/main/manage-users`;
export const GROUPS_ROLES_URL = `${BASE_URL}/business/main/groups-roles`;

export const USERS_API   = '**/api/v1/users**';
export const USER_API    = '**/api/v1/users/*';
export const GROUPS_API  = '**/api/v1/groups**';
export const ROLES_API   = '**/api/v1/roles**';
export const PRIVILEGES_API = '**/api/v1/**privilege**';
/** Confirmed real — taken verbatim from the EMI-5234 curl repro. */
export const UNASSIGN_USERS_API = '**/emi-profile/api/v1/groups/*/unassign-users';
export const ASSIGN_USERS_API   = '**/emi-profile/api/v1/groups/*/assign-users';

/** The full lifecycle EMI-4844 defines for a User Creation Request. */
export const USER_STATUSES = [
    'PENDING_VERIFICATION',
    'UNDER_REVIEW',
    'ACTIVE',
    'DEACTIVATED',
    'REJECTED',
    'DELETED',
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export function uniqueMobile(): string {
    // KSA mobile shape (5XXXXXXXX) with a time-derived tail so repeat runs
    // never collide on an already-registered number.
    return `5${String(Date.now()).slice(-8)}`;
}

export function uniqueNationalId(): string {
    return `1${String(Date.now()).slice(-9)}`;
}

export interface UserInput {
    nationalId: string;
    mobile: string;
    email?: string;
    group?: string;
}

interface MockUser {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    mobileNumber: string;
    identityNumber: string;
    groupName: string;
    status: { code: UserStatus; nameEn: string; nameAr: string };
}

function statusObject(code: UserStatus) {
    return { code, nameEn: code.replace(/_/g, ' '), nameAr: `ar_${code}` };
}

export function mockUser(overrides: Partial<MockUser> & { firstName: string; lastName: string }): MockUser {
    return {
        id: Math.floor(Math.random() * 100000),
        fullName: `${overrides.firstName} ${overrides.lastName}`,
        mobileNumber: '500000000',
        identityNumber: '1000000000',
        groupName: 'FINANCE',
        status: statusObject('ACTIVE'),
        ...overrides,
    } as MockUser;
}

/**
 * Issues a request from inside the page so page.route() mocks apply.
 * page.request.* is a separate API context that bypasses routing entirely and
 * would hit the real gateway — same reason SubWalletsHelper.ts has this.
 */
export async function fetchJson(
    page: Page,
    path: string,
    options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<{ status: number; body: unknown }> {
    return boxStep('fetchJson', async () => {
        const url = `${BASE_URL}${path}`;
        return page.evaluate(
            async ({ url, method, body, headers }) => {
                const res = await fetch(url, {
                    method: method ?? 'GET',
                    headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
                    body: body !== undefined ? JSON.stringify(body) : undefined,
                });
                const parsedBody = await res.json().catch(() => null);
                return { status: res.status, body: parsedBody };
            },
            { url, method: options.method, body: options.body, headers: options.headers }
        );
    });
}

export async function gotoManageUsers(page: Page): Promise<void> {
    return boxStep('gotoManageUsers', async () => {
        await page.goto(MANAGE_USERS_URL);
        await page.waitForLoadState('domcontentloaded');
        await waitForToastClear(page);
    });
}

export async function gotoGroupsAndRoles(page: Page): Promise<void> {
    return boxStep('gotoGroupsAndRoles', async () => {
        await page.goto(GROUPS_ROLES_URL);
        await page.waitForLoadState('domcontentloaded');
        await waitForToastClear(page);
    });
}

// ── Users list ───────────────────────────────────────────────────────────

export async function mockUserList(page: Page, users?: MockUser[]): Promise<void> {
    return boxStep('mockUserList', async () => {
        const content = users ?? [
            mockUser({ firstName: 'Sara', lastName: 'Ahmed', groupName: 'FINANCE' }),
            mockUser({ firstName: 'Omar', lastName: 'Khalid', groupName: 'OPERATIONS', status: statusObject('DEACTIVATED') }),
        ];
        await page.route(USERS_API, route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ content, totalElements: content.length }),
            })
        );
    });
}

export async function mockEmptyUserList(page: Page): Promise<void> {
    return boxStep('mockEmptyUserList', async () => {
        await page.route(USERS_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [], totalElements: 0 }) })
        );
    });
}

/**
 * EMI-4812: the Status filter must actually reach the API and narrow the list.
 * The mock only returns rows whose status matches the `statusCode` query param,
 * so a UI that drops the param (the pre-fix behaviour) gets the unfiltered set
 * back and the assertion fails.
 */
export async function mockUserListFilteredByStatus(page: Page): Promise<void> {
    return boxStep('mockUserListFilteredByStatus', async () => {
        const all = [
            mockUser({ firstName: 'Active', lastName: 'User', status: statusObject('ACTIVE') }),
            mockUser({ firstName: 'Deactivated', lastName: 'User', status: statusObject('DEACTIVATED') }),
            mockUser({ firstName: 'Pending', lastName: 'User', status: statusObject('PENDING_VERIFICATION') }),
        ];
        await page.route(USERS_API, route => {
            const requested = new URL(route.request().url()).searchParams.get('statusCode');
            const content = requested ? all.filter(u => u.status.code === requested) : all;
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ content, totalElements: content.length }),
            });
        });
    });
}

/** EMI-4812 pre-fix state: the list ignores statusCode and always returns everything. */
export async function mockUserListIgnoringStatusFilter(page: Page): Promise<void> {
    return boxStep('mockUserListIgnoringStatusFilter', async () => {
        await mockUserList(page, [
            mockUser({ firstName: 'Active', lastName: 'User', status: statusObject('ACTIVE') }),
            mockUser({ firstName: 'Deactivated', lastName: 'User', status: statusObject('DEACTIVATED') }),
            mockUser({ firstName: 'Pending', lastName: 'User', status: statusObject('PENDING_VERIFICATION') }),
        ]);
    });
}

/** EMI-5285 pre-fix state: GET /users blew up. */
export async function mockUserListServerError(page: Page): Promise<void> {
    return boxStep('mockUserListServerError', async () => {
        await page.route(USERS_API, route =>
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ status: 500, error: 'Internal Server Error', path: '/api/v1/users' }),
            })
        );
    });
}

/**
 * EMI-5000 pre-fix state: the API returns first/last name but no `fullName`,
 * and the UI concatenated two undefined fields into "Undefined Undefined".
 */
export async function mockUserListWithoutFullName(page: Page): Promise<void> {
    return boxStep('mockUserListWithoutFullName', async () => {
        const broken = [{ id: 1, mobileNumber: '500000000', groupName: 'FINANCE', status: statusObject('ACTIVE') }];
        await page.route(USERS_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: broken, totalElements: 1 }) })
        );
    });
}

// ── Create user ──────────────────────────────────────────────────────────

/**
 * EMI-4742: creation succeeds AND the follow-up list call returns the new row
 * fully populated. The first GET after the POST serves the enlarged list.
 */
export async function mockCreateUserSuccess(page: Page, newUser = mockUser({ firstName: 'New', lastName: 'Staff' })): Promise<void> {
    return boxStep('mockCreateUserSuccess', async () => {
        let created = false;
        await page.route(USERS_API, route => {
            if (route.request().method() === 'POST') {
                created = true;
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(newUser) });
            }
            const content = created ? [newUser] : [];
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ content, totalElements: content.length }),
            });
        });
    });
}

/** EMI-4742 pre-fix state: POST succeeds but the row comes back with blank fields. */
export async function mockCreateUserReturnsBlankRow(page: Page): Promise<void> {
    return boxStep('mockCreateUserReturnsBlankRow', async () => {
        const blank = { id: 99, fullName: '', mobileNumber: '', groupName: '', status: null };
        await page.route(USERS_API, route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 99 }) });
            }
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [blank], totalElements: 1 }) });
        });
    });
}

/** EMI-5815 pre-fix state: POST /users returned a 500 and no user was created. */
export async function mockCreateUserServerError(page: Page): Promise<void> {
    return boxStep('mockCreateUserServerError', async () => {
        await page.route(USERS_API, route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ status: 500, error: 'Internal Server Error', path: '/api/v1/users' }),
                });
            }
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [], totalElements: 0 }) });
        });
    });
}

/**
 * EMI-4997: a freshly created user must come back with only the privileges
 * explicitly assigned — never the full Super Admin set.
 */
export async function mockCreatedUserPrivileges(page: Page, privileges: string[]): Promise<void> {
    return boxStep('mockCreatedUserPrivileges', async () => {
        await page.route(PRIVILEGES_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ privileges }) })
        );
    });
}

// ── Edit / status transitions ────────────────────────────────────────────

export async function mockUpdateUserSuccess(page: Page): Promise<void> {
    return boxStep('mockUpdateUserSuccess', async () => {
        await page.route(USER_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updated: true }) })
        );
    });
}

/** EMI-5816 pre-fix state: changing a user's group 500'd. */
export async function mockUpdateUserGroupServerError(page: Page): Promise<void> {
    return boxStep('mockUpdateUserGroupServerError', async () => {
        await page.route(USER_API, route =>
            route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: 500, error: 'Internal Server Error' }) })
        );
    });
}

/** EMI-5078 pre-fix state: activate/deactivate on legacy users returned 405. */
export async function mockUserStatusChangeMethodNotAllowed(page: Page): Promise<void> {
    return boxStep('mockUserStatusChangeMethodNotAllowed', async () => {
        await page.route('**/api/v1/users/*/status**', route =>
            route.fulfill({ status: 405, contentType: 'application/json', body: JSON.stringify({ error: 'Method Not Allowed' }) })
        );
    });
}

export async function mockUserStatusChangeSuccess(page: Page, status: UserStatus = 'DEACTIVATED'): Promise<void> {
    return boxStep('mockUserStatusChangeSuccess', async () => {
        await page.route('**/api/v1/users/*/status**', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: statusObject(status) }) })
        );
    });
}

/**
 * EMI-5085 pre-fix state: activate/deactivate on a business staff user was
 * refused with an authorisation message even though the privilege was granted.
 */
export async function mockUserStatusChangeForbidden(page: Page): Promise<void> {
    return boxStep('mockUserStatusChangeForbidden', async () => {
        await page.route('**/api/v1/users/*/status**', route =>
            route.fulfill({
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        httpStatusCode: 403,
                        message: {
                            messageCode: 'UNAUTHORIZED_EXCEPTION',
                            plainText: 'You are not authorized to perform this action. Please check your permissions',
                        },
                    },
                ]),
            })
        );
    });
}

// ── Groups & roles ───────────────────────────────────────────────────────

export function mockGroups(names = ['FINANCE', 'OPERATIONS', 'COMPLIANCE']) {
    // EMI-5897 added tenant + isSystem to groups and roles; a system group must
    // not be editable or deletable by a tenant admin.
    return names.map((name, i) => ({
        id: i + 1,
        name,
        description: `${name} group`,
        tenant: 'BUSINESS',
        isSystem: name === 'COMPLIANCE',
        usersCount: i,
    }));
}

export async function mockGroupList(page: Page, groups = mockGroups()): Promise<void> {
    return boxStep('mockGroupList', async () => {
        await page.route(GROUPS_API, route => {
            if (route.request().method() !== 'GET') return route.fallback();
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ content: groups, totalElements: groups.length }),
            });
        });
    });
}

/** EMI-5583/EMI-5584 pre-fix state: the edit screen's group list came back empty. */
export async function mockEmptyGroupList(page: Page): Promise<void> {
    return boxStep('mockEmptyGroupList', async () => {
        await page.route(GROUPS_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [], totalElements: 0 }) })
        );
    });
}

export async function mockRoleList(page: Page, roles = [{ id: 1, name: 'Maker', description: 'Creates requests', usersCount: 2, isSystem: false }]): Promise<void> {
    return boxStep('mockRoleList', async () => {
        await page.route(ROLES_API, route => {
            if (route.request().method() !== 'GET') return route.fallback();
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: roles, totalElements: roles.length }) });
        });
    });
}

export async function mockGroupRoleUpdateSuccess(page: Page): Promise<void> {
    return boxStep('mockGroupRoleUpdateSuccess', async () => {
        await page.route(/\/api\/v1\/(groups|roles)\/\d+/, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updated: true }) })
        );
    });
}

/** EMI-5240 / EMI-5613 pre-fix state: update and delete both 403'd. */
export async function mockGroupRoleUpdateForbidden(page: Page): Promise<void> {
    return boxStep('mockGroupRoleUpdateForbidden', async () => {
        await page.route(/\/api\/v1\/(groups|roles)\/\d+/, route =>
            route.fulfill({
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify({ message: { messageCode: 'FORBIDDEN', plainText: 'Forbidden' } }),
            })
        );
    });
}

/** EMI-5210 pre-fix state: editing a role name or description returned 400. */
export async function mockRoleUpdateBadRequest(page: Page): Promise<void> {
    return boxStep('mockRoleUpdateBadRequest', async () => {
        await page.route(/\/api\/v1\/roles\/\d+/, route =>
            route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Bad Request' }) })
        );
    });
}

/**
 * EMI-5234: assigning a user who is already in the group (or unassigning one
 * who is not) must be rejected instead of silently succeeding again.
 */
export async function mockAssignUsersWithValidation(page: Page, alreadyAssigned: number[] = [7]): Promise<void> {
    return boxStep('mockAssignUsersWithValidation', async () => {
        await page.route(ASSIGN_USERS_API, async route => {
            const body = route.request().postDataJSON() as { userIds?: number[] } | null;
            const duplicate = (body?.userIds ?? []).some(id => alreadyAssigned.includes(id));
            await route.fulfill({
                status: duplicate ? 400 : 200,
                contentType: 'application/json',
                body: JSON.stringify(
                    duplicate
                        ? { messageCode: 'USER_ALREADY_ASSIGNED', plainText: 'User is already assigned to this group' }
                        : { assigned: true }
                ),
            });
        });
        await page.route(UNASSIGN_USERS_API, async route => {
            const body = route.request().postDataJSON() as { userIds?: number[] } | null;
            const notAssigned = (body?.userIds ?? []).some(id => !alreadyAssigned.includes(id));
            await route.fulfill({
                status: notAssigned ? 400 : 200,
                contentType: 'application/json',
                body: JSON.stringify(
                    notAssigned
                        ? { messageCode: 'USER_NOT_ASSIGNED', plainText: 'User is not assigned to this group' }
                        : { unassigned: true }
                ),
            });
        });
    });
}

/** EMI-5234 pre-fix state: repeated assign/unassign always returned 200. */
export async function mockAssignUsersWithoutValidation(page: Page): Promise<void> {
    return boxStep('mockAssignUsersWithoutValidation', async () => {
        for (const glob of [ASSIGN_USERS_API, UNASSIGN_USERS_API]) {
            await page.route(glob, route =>
                route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
            );
        }
    });
}

// ── Password reset (EMI-5817) ────────────────────────────────────────────

export async function mockResetPasswordSuccess(page: Page): Promise<void> {
    return boxStep('mockResetPasswordSuccess', async () => {
        await page.route('**/api/v1/**reset-password**', route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reset: true }) })
        );
    });
}

/** EMI-5817 pre-fix state: the post-reset login was bounced to Forbidden. */
export async function mockResetPasswordForbidden(page: Page): Promise<void> {
    return boxStep('mockResetPasswordForbidden', async () => {
        await page.route('**/api/v1/**reset-password**', route =>
            route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: { plainText: 'Forbidden' } }) })
        );
    });
}

// ═════════════════════════════════════════════════════════════════════════
// Scope-aware RBAC — EMI-5956 (FE Web Business) / EMI-5957 (FE Web Admin)
// ═════════════════════════════════════════════════════════════════════════
//
// EMI-5956 and EMI-5957 moved Groups / Roles / Privileges off the generic
// `/api/v1/{groups,roles}` paths used higher up in this file and onto
// scope-specific ones. Unlike that older block, every path below IS confirmed —
// each is quoted verbatim in a ticket description or curl repro:
//
//   GET    /custom/groups?page&size                   EMI-6029, EMI-6004
//   GET    /custom/roles?page&size                    EMI-6029, EMI-6005, EMI-6004
//   GET    /groups/roles/custom/privileges?page&size  EMI-6027, EMI-6016  (tenant scope)
//   GET    /groups/roles/privileges?page&size         EMI-5999, EMI-6016  (system scope)
//   GET    /emi-profile/api/v1/groups/admin/staff     EMI-6066
//   PUT    /groups/{groupId}/roles                    EMI-6000
//   PUT    /groups/{groupId}/roles/remove             EMI-6000
//   DELETE /groups/{groupId}                          EMI-6001, EMI-5986
//   DELETE /groups/roles/{roleId}                     EMI-6001, EMI-5985
//
// Screen under test is `/business/main/groups-management` (EMI-6026, EMI-6029) —
// note this is NOT the `/business/main/groups-roles` path GROUPS_ROLES_URL
// still points at. Both are kept: the older specs were written against the
// older route, and no ticket says the old one 404s.

export const GROUPS_MANAGEMENT_URL = `${BASE_URL}/business/main/groups-management`;
export const ADMIN_EXTERNAL_PARTY_URL = `${ADMIN_BASE_URL}/admin/main/external-part`;
export const ADMIN_USERS_URL = `${ADMIN_BASE_URL}/admin/main/manage-users`;

export const CUSTOM_GROUPS_API      = '**/custom/groups**';
export const CUSTOM_ROLES_API       = '**/custom/roles**';
export const CUSTOM_PRIVILEGES_API  = '**/groups/roles/custom/privileges**';
export const SYSTEM_PRIVILEGES_API  = '**/groups/roles/privileges**';
export const ADMIN_STAFF_GROUPS_API = '**/emi-profile/api/v1/groups/admin/staff**';
export const GROUP_ROLES_ASSIGN_API = '**/groups/*/roles';
export const GROUP_ROLES_REMOVE_API = '**/groups/*/roles/remove';
export const GROUP_DELETE_API       = '**/groups/*';
export const ROLE_DELETE_API        = '**/groups/roles/*';
export const EXTERNAL_PARTY_ROLES_API = '**/external-part**role**';

/** Privilege code EMI-6026 names as the gate on the Create Group action. */
export const CREATE_GROUP_PRIVILEGE = 'CREATE_BUSINESS_GROUP';
/** Obsolete privilege EMI-5999 requires to disappear from the system list. */
export const OBSOLETE_PRIVILEGE = { id: 220, name: 'Get Groups Settings', code: 'GET_GROUPS_SETTINGS' };

/**
 * A group/role row carrying BOTH locales. EMI-6004 requires `descriptionAr` on
 * every listing DTO; EMI-6005 requires the Arabic table to render `nameAr`;
 * EMI-5972 is the same defect surfacing as a blank Name column in Arabic.
 */
export interface LocalizedEntity {
    id: number;
    name: string;
    nameAr: string | null;
    description: string;
    descriptionAr: string | null;
    isSystem: boolean;
    usersCount?: number;
}

export function localizedGroups(): LocalizedEntity[] {
    return [
        { id: 1, name: 'Biller checker', nameAr: 'مدقق الفواتير', description: 'Biller checker', descriptionAr: 'مدقق الفواتير', isSystem: false, usersCount: 3 },
        { id: 2, name: 'FINANCE',        nameAr: 'المالية',       description: 'Finance group', descriptionAr: 'مجموعة المالية', isSystem: false, usersCount: 1 },
        { id: 3, name: 'System Admins',  nameAr: 'مدراء النظام',  description: 'System group',  descriptionAr: 'مجموعة النظام',  isSystem: true,  usersCount: 2 },
    ];
}

export function localizedRoles(): LocalizedEntity[] {
    return [
        { id: 11, name: 'Maker',       nameAr: 'المُنشئ',      description: 'Creates requests',  descriptionAr: 'ينشئ الطلبات',  isSystem: false, usersCount: 2 },
        { id: 12, name: 'Checker',     nameAr: 'المُدقق',      description: 'Approves requests', descriptionAr: 'يعتمد الطلبات', isSystem: false, usersCount: 1 },
        { id: 13, name: 'Super Admin', nameAr: 'المدير العام', description: 'System role',       descriptionAr: 'دور النظام',    isSystem: true,  usersCount: 1 },
    ];
}

function pageBody(content: unknown[]): string {
    return JSON.stringify({ content, totalElements: content.length, totalPages: 1, size: 10, number: 0 });
}

// ── Scoped listings (EMI-5956 / EMI-5957, EMI-6004, EMI-6005, EMI-5972) ──

export async function mockCustomGroupsAndRoles(
    page: Page,
    groups: LocalizedEntity[] = localizedGroups(),
    roles: LocalizedEntity[] = localizedRoles()
): Promise<void> {
    return boxStep('mockCustomGroupsAndRoles', async () => {
        await page.route(CUSTOM_GROUPS_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: pageBody(groups) })
        );
        await page.route(CUSTOM_ROLES_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: pageBody(roles) })
        );
    });
}

/**
 * EMI-6004 pre-fix state: the listing DTOs carry `description` but drop
 * `descriptionAr` — and, per EMI-5972 / EMI-6005, `nameAr` — entirely, so an
 * Arabic UI has nothing to render and shows a blank Name column.
 */
export async function mockCustomListingsWithoutArabicFields(page: Page): Promise<void> {
    return boxStep('mockCustomListingsWithoutArabicFields', async () => {
        const strip = (rows: LocalizedEntity[]) =>
            rows.map(({ id, name, description, isSystem, usersCount }) => ({ id, name, description, isSystem, usersCount }));
        await page.route(CUSTOM_GROUPS_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: pageBody(strip(localizedGroups())) })
        );
        await page.route(CUSTOM_ROLES_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: pageBody(strip(localizedRoles())) })
        );
    });
}

/**
 * Counts how many times a glob was requested. EMI-6029 (a tab switch fires each
 * listing twice) and EMI-6000 (Save fires both add- and remove-roles) are both
 * "how many calls went out", not "what came back" — so the counter sits in front
 * of the mock and hands off with `route.fallback()`.
 *
 * Register this AFTER the mock that fulfils. page.route() handlers run
 * last-registered-first, so the counter has to be the NEWEST registration to
 * see the request at all; it then hands off with route.fallback() to the
 * earlier-registered handler that actually responds. Registering it first
 * means the fulfilling mock answers and the counter never runs, silently
 * reading zero.
 */
export function countRequests(page: Page, glob: string): { count: () => number } {
    let seen = 0;
    void page.route(glob, async route => {
        seen += 1;
        await route.fallback();
    });
    return { count: () => seen };
}

// ── Privilege scoping (EMI-6016, EMI-6027, EMI-5999) ─────────────────────

const ALL_PRIVILEGES = [
    { id: 101, name: 'Create Bill',        code: 'CREATE_BILL' },
    { id: 102, name: 'Get All Privileges', code: 'GET_ALL_PRIVILEGES' },
    { id: 103, name: 'Create Group',       code: CREATE_GROUP_PRIVILEGE },
    { id: 104, name: 'Delete Group',       code: 'DELETE_BUSINESS_GROUP' },
];

/**
 * EMI-6016 fixed behaviour: the privileges list is filtered to what the caller
 * actually holds, so a restricted user cannot grant themselves — or anyone
 * else — a privilege they do not have (privilege escalation).
 */
export async function mockPrivilegesScopedToCaller(page: Page, held: string[]): Promise<void> {
    return boxStep('mockPrivilegesScopedToCaller', async () => {
        const content = ALL_PRIVILEGES.filter(p => held.includes(p.code));
        for (const glob of [CUSTOM_PRIVILEGES_API, SYSTEM_PRIVILEGES_API]) {
            await page.route(glob, route =>
                route.fulfill({ status: 200, contentType: 'application/json', body: pageBody(content) })
            );
        }
    });
}

/** EMI-6016 pre-fix state: the full system privilege list, unfiltered. */
export async function mockPrivilegesUnscoped(page: Page): Promise<void> {
    return boxStep('mockPrivilegesUnscoped', async () => {
        for (const glob of [CUSTOM_PRIVILEGES_API, SYSTEM_PRIVILEGES_API]) {
            await page.route(glob, route =>
                route.fulfill({ status: 200, contentType: 'application/json', body: pageBody(ALL_PRIVILEGES) })
            );
        }
    });
}

/** EMI-6027 fixed behaviour: no "Get All privilege" -> 403 UNAUTHORIZED_USER. */
export async function mockCustomPrivilegesForbidden(page: Page): Promise<void> {
    return boxStep('mockCustomPrivilegesForbidden', async () => {
        await page.route(CUSTOM_PRIVILEGES_API, route =>
            route.fulfill({
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify([{
                    httpStatusCode: 403,
                    message: { messageCode: 'UNAUTHORIZED_USER', plainText: 'You are not authorized to perform this action' },
                }]),
            })
        );
    });
}

/** EMI-6027 pre-fix state: 200 OK, full privilege list leaked to an unauthorised caller. */
export async function mockCustomPrivilegesLeaked(page: Page): Promise<void> {
    return boxStep('mockCustomPrivilegesLeaked', async () => {
        await page.route(CUSTOM_PRIVILEGES_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: pageBody(ALL_PRIVILEGES) })
        );
    });
}

/** EMI-5999 pre-fix state: the retired "Get Groups Settings" (id 220) is still assignable. */
export async function mockSystemPrivilegesIncludingObsolete(page: Page): Promise<void> {
    return boxStep('mockSystemPrivilegesIncludingObsolete', async () => {
        await page.route(SYSTEM_PRIVILEGES_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: pageBody([...ALL_PRIVILEGES, OBSOLETE_PRIVILEGE]) })
        );
    });
}

/**
 * Drives the UI's own privilege gate (EMI-6026). The Create Group control must
 * be hidden or disabled when CREATE_BUSINESS_GROUP is absent — it must never
 * open the modal and then fail with an error toast.
 */
export async function mockCallerPrivileges(page: Page, held: string[]): Promise<void> {
    return boxStep('mockCallerPrivileges', async () => {
        await page.route(PRIVILEGES_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ privileges: held }) })
        );
    });
}

// ── Group / role deletion (EMI-5985, EMI-5986, EMI-6001) ─────────────────

export async function mockDeleteGroupSuccess(page: Page): Promise<void> {
    return boxStep('mockDeleteGroupSuccess', async () => {
        await page.route(GROUP_DELETE_API, route => {
            if (route.request().method() !== 'DELETE') return route.fallback();
            return route.fulfill({ status: 204, body: '' });
        });
    });
}

/** EMI-5986 pre-fix state: DELETE /groups/{id} blew up with a 500. */
export async function mockDeleteGroupServerError(page: Page): Promise<void> {
    return boxStep('mockDeleteGroupServerError', async () => {
        await page.route(GROUP_DELETE_API, route => {
            if (route.request().method() !== 'DELETE') return route.fallback();
            return route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify([{
                    httpStatusCode: 500,
                    message: { messageCode: 'INTERNAL_SERVER_ERROR', plainText: 'Failed to process your request.Please contact support.' },
                }]),
            });
        });
    });
}

export async function mockDeleteRoleSuccess(page: Page): Promise<void> {
    return boxStep('mockDeleteRoleSuccess', async () => {
        await page.route(ROLE_DELETE_API, route => {
            if (route.request().method() !== 'DELETE') return route.fallback();
            return route.fulfill({ status: 204, body: '' });
        });
    });
}

/**
 * EMI-6001: a system entity (isSystem = true) must not be deletable. If the UI
 * ever does fire the call, the backend answers with
 * SystemEntityCannotBeModifiedException rather than deleting it.
 */
export async function mockDeleteSystemEntityRejected(page: Page): Promise<void> {
    return boxStep('mockDeleteSystemEntityRejected', async () => {
        for (const glob of [GROUP_DELETE_API, ROLE_DELETE_API]) {
            await page.route(glob, route => {
                if (route.request().method() !== 'DELETE') return route.fallback();
                return route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify([{
                        httpStatusCode: 400,
                        message: { messageCode: 'SYSTEM_ENTITY_CANNOT_BE_MODIFIED', plainText: 'System groups/roles cannot be modified or deleted' },
                    }]),
                });
            });
        }
    });
}

// ── Group role assignment diffing (EMI-6000) ─────────────────────────────

export async function mockGroupRoleAssignmentSuccess(page: Page): Promise<void> {
    return boxStep('mockGroupRoleAssignmentSuccess', async () => {
        // Remove is registered first so the more specific /roles/remove glob is
        // matched by the later, narrower handler — Playwright runs the most
        // recently registered handler first.
        await page.route(GROUP_ROLES_ASSIGN_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ assigned: true }) })
        );
        await page.route(GROUP_ROLES_REMOVE_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ removed: true }) })
        );
    });
}

// ── Admin staff groups & external parties (EMI-6066, EMI-6067) ───────────

export async function mockAdminStaffGroups(page: Page, groups = localizedGroups()): Promise<void> {
    return boxStep('mockAdminStaffGroups', async () => {
        await page.route(ADMIN_STAFF_GROUPS_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: pageBody(groups) })
        );
    });
}

/** EMI-6066 pre-fix state: GET /groups/admin/staff 500s, so the Group dropdown is empty. */
export async function mockAdminStaffGroupsServerError(page: Page): Promise<void> {
    return boxStep('mockAdminStaffGroupsServerError', async () => {
        await page.route(ADMIN_STAFF_GROUPS_API, route =>
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify([{
                    httpStatusCode: 500,
                    message: { messageCode: 'INTERNAL_SERVER_ERROR', plainText: 'Failed to process your request.Please contact support.' },
                }]),
            })
        );
    });
}

export async function mockExternalPartyRoles(page: Page, roles = localizedRoles()): Promise<void> {
    return boxStep('mockExternalPartyRoles', async () => {
        await page.route(EXTERNAL_PARTY_ROLES_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: pageBody(roles) })
        );
        // EMI-6067 does not name the endpoint the modal reads from, only that the
        // dropdown is empty. Serving the standard Admin role source too means the
        // test passes whichever of the two the modal actually calls.
        await page.route(CUSTOM_ROLES_API, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: pageBody(roles) })
        );
    });
}

/** EMI-6067 pre-fix state: the Role dropdown source returns nothing at all. */
export async function mockExternalPartyRolesEmpty(page: Page): Promise<void> {
    return boxStep('mockExternalPartyRolesEmpty', async () => {
        for (const glob of [EXTERNAL_PARTY_ROLES_API, CUSTOM_ROLES_API]) {
            await page.route(glob, route =>
                route.fulfill({ status: 200, contentType: 'application/json', body: pageBody([]) })
            );
        }
    });
}

/**
 * EMI-6038 pre-fix state: POST /users returns the created user, but the
 * follow-up list call comes back empty so the new row never appears.
 */
export async function mockCreateUserThenEmptyList(page: Page): Promise<void> {
    return boxStep('mockCreateUserThenEmptyList', async () => {
        const created = mockUser({ firstName: 'New', lastName: 'Staff' });
        await page.route(USERS_API, route => {
            if (route.request().method() === 'POST') {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(created) });
            }
            return route.fulfill({ status: 200, contentType: 'application/json', body: pageBody([]) });
        });
    });
}

export async function gotoGroupsManagement(page: Page): Promise<void> {
    return boxStep('gotoGroupsManagement', async () => {
        await page.goto(GROUPS_MANAGEMENT_URL);
        await page.waitForLoadState('domcontentloaded');
        await waitForToastClear(page);
    });
}

export async function gotoAdminExternalParties(page: Page): Promise<void> {
    return boxStep('gotoAdminExternalParties', async () => {
        await page.goto(ADMIN_EXTERNAL_PARTY_URL);
        await page.waitForLoadState('domcontentloaded');
        await waitForToastClear(page);
    });
}

export async function gotoAdminUsers(page: Page): Promise<void> {
    return boxStep('gotoAdminUsers', async () => {
        await page.goto(ADMIN_USERS_URL);
        await page.waitForLoadState('domcontentloaded');
        await waitForToastClear(page);
    });
}
