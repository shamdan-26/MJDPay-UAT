import type { Page } from '@playwright/test';

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
    options: { method?: string; body?: unknown } = {}
): Promise<{ status: number; body: unknown }> {
    const url = `${BASE_URL}${path}`;
    return page.evaluate(
        async ({ url, method, body }) => {
            const res = await fetch(url, {
                method: method ?? 'GET',
                headers: { 'Content-Type': 'application/json' },
                body: body !== undefined ? JSON.stringify(body) : undefined,
            });
            const parsedBody = await res.json().catch(() => null);
            return { status: res.status, body: parsedBody };
        },
        { url, method: options.method, body: options.body }
    );
}

export async function gotoManageUsers(page: Page): Promise<void> {
    await page.goto(MANAGE_USERS_URL);
    await page.waitForLoadState('domcontentloaded');
}

export async function gotoGroupsAndRoles(page: Page): Promise<void> {
    await page.goto(GROUPS_ROLES_URL);
    await page.waitForLoadState('domcontentloaded');
}

// ── Users list ───────────────────────────────────────────────────────────

export async function mockUserList(page: Page, users?: MockUser[]): Promise<void> {
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
}

export async function mockEmptyUserList(page: Page): Promise<void> {
    await page.route(USERS_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [], totalElements: 0 }) })
    );
}

/**
 * EMI-4812: the Status filter must actually reach the API and narrow the list.
 * The mock only returns rows whose status matches the `statusCode` query param,
 * so a UI that drops the param (the pre-fix behaviour) gets the unfiltered set
 * back and the assertion fails.
 */
export async function mockUserListFilteredByStatus(page: Page): Promise<void> {
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
}

/** EMI-4812 pre-fix state: the list ignores statusCode and always returns everything. */
export async function mockUserListIgnoringStatusFilter(page: Page): Promise<void> {
    await mockUserList(page, [
        mockUser({ firstName: 'Active', lastName: 'User', status: statusObject('ACTIVE') }),
        mockUser({ firstName: 'Deactivated', lastName: 'User', status: statusObject('DEACTIVATED') }),
        mockUser({ firstName: 'Pending', lastName: 'User', status: statusObject('PENDING_VERIFICATION') }),
    ]);
}

/** EMI-5285 pre-fix state: GET /users blew up. */
export async function mockUserListServerError(page: Page): Promise<void> {
    await page.route(USERS_API, route =>
        route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ status: 500, error: 'Internal Server Error', path: '/api/v1/users' }),
        })
    );
}

/**
 * EMI-5000 pre-fix state: the API returns first/last name but no `fullName`,
 * and the UI concatenated two undefined fields into "Undefined Undefined".
 */
export async function mockUserListWithoutFullName(page: Page): Promise<void> {
    const broken = [{ id: 1, mobileNumber: '500000000', groupName: 'FINANCE', status: statusObject('ACTIVE') }];
    await page.route(USERS_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: broken, totalElements: 1 }) })
    );
}

// ── Create user ──────────────────────────────────────────────────────────

/**
 * EMI-4742: creation succeeds AND the follow-up list call returns the new row
 * fully populated. The first GET after the POST serves the enlarged list.
 */
export async function mockCreateUserSuccess(page: Page, newUser = mockUser({ firstName: 'New', lastName: 'Staff' })): Promise<void> {
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
}

/** EMI-4742 pre-fix state: POST succeeds but the row comes back with blank fields. */
export async function mockCreateUserReturnsBlankRow(page: Page): Promise<void> {
    const blank = { id: 99, fullName: '', mobileNumber: '', groupName: '', status: null };
    await page.route(USERS_API, route => {
        if (route.request().method() === 'POST') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 99 }) });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [blank], totalElements: 1 }) });
    });
}

/** EMI-5815 pre-fix state: POST /users returned a 500 and no user was created. */
export async function mockCreateUserServerError(page: Page): Promise<void> {
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
}

/**
 * EMI-4997: a freshly created user must come back with only the privileges
 * explicitly assigned — never the full Super Admin set.
 */
export async function mockCreatedUserPrivileges(page: Page, privileges: string[]): Promise<void> {
    await page.route(PRIVILEGES_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ privileges }) })
    );
}

// ── Edit / status transitions ────────────────────────────────────────────

export async function mockUpdateUserSuccess(page: Page): Promise<void> {
    await page.route(USER_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updated: true }) })
    );
}

/** EMI-5816 pre-fix state: changing a user's group 500'd. */
export async function mockUpdateUserGroupServerError(page: Page): Promise<void> {
    await page.route(USER_API, route =>
        route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ status: 500, error: 'Internal Server Error' }) })
    );
}

/** EMI-5078 pre-fix state: activate/deactivate on legacy users returned 405. */
export async function mockUserStatusChangeMethodNotAllowed(page: Page): Promise<void> {
    await page.route('**/api/v1/users/*/status**', route =>
        route.fulfill({ status: 405, contentType: 'application/json', body: JSON.stringify({ error: 'Method Not Allowed' }) })
    );
}

export async function mockUserStatusChangeSuccess(page: Page, status: UserStatus = 'DEACTIVATED'): Promise<void> {
    await page.route('**/api/v1/users/*/status**', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: statusObject(status) }) })
    );
}

/**
 * EMI-5085 pre-fix state: activate/deactivate on a business staff user was
 * refused with an authorisation message even though the privilege was granted.
 */
export async function mockUserStatusChangeForbidden(page: Page): Promise<void> {
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
    await page.route(GROUPS_API, route => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ content: groups, totalElements: groups.length }),
        });
    });
}

/** EMI-5583/EMI-5584 pre-fix state: the edit screen's group list came back empty. */
export async function mockEmptyGroupList(page: Page): Promise<void> {
    await page.route(GROUPS_API, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [], totalElements: 0 }) })
    );
}

export async function mockRoleList(page: Page, roles = [{ id: 1, name: 'Maker', description: 'Creates requests', usersCount: 2, isSystem: false }]): Promise<void> {
    await page.route(ROLES_API, route => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: roles, totalElements: roles.length }) });
    });
}

export async function mockGroupRoleUpdateSuccess(page: Page): Promise<void> {
    await page.route(/\/api\/v1\/(groups|roles)\/\d+/, route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updated: true }) })
    );
}

/** EMI-5240 / EMI-5613 pre-fix state: update and delete both 403'd. */
export async function mockGroupRoleUpdateForbidden(page: Page): Promise<void> {
    await page.route(/\/api\/v1\/(groups|roles)\/\d+/, route =>
        route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ message: { messageCode: 'FORBIDDEN', plainText: 'Forbidden' } }),
        })
    );
}

/** EMI-5210 pre-fix state: editing a role name or description returned 400. */
export async function mockRoleUpdateBadRequest(page: Page): Promise<void> {
    await page.route(/\/api\/v1\/roles\/\d+/, route =>
        route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Bad Request' }) })
    );
}

/**
 * EMI-5234: assigning a user who is already in the group (or unassigning one
 * who is not) must be rejected instead of silently succeeding again.
 */
export async function mockAssignUsersWithValidation(page: Page, alreadyAssigned: number[] = [7]): Promise<void> {
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
}

/** EMI-5234 pre-fix state: repeated assign/unassign always returned 200. */
export async function mockAssignUsersWithoutValidation(page: Page): Promise<void> {
    for (const glob of [ASSIGN_USERS_API, UNASSIGN_USERS_API]) {
        await page.route(glob, route =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
        );
    }
}

// ── Password reset (EMI-5817) ────────────────────────────────────────────

export async function mockResetPasswordSuccess(page: Page): Promise<void> {
    await page.route('**/api/v1/**reset-password**', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reset: true }) })
    );
}

/** EMI-5817 pre-fix state: the post-reset login was bounced to Forbidden. */
export async function mockResetPasswordForbidden(page: Page): Promise<void> {
    await page.route('**/api/v1/**reset-password**', route =>
        route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: { plainText: 'Forbidden' } }) })
    );
}
