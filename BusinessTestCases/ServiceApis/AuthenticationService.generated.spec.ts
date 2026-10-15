import { test, expect } from '@playwright/test';

/**
 * Authentication Service — generated API scaffold (OpenAPI 3.1.0).
 * 86 operations. Source: /authentication-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/AuthenticationService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "authentication-service";
const SERVICE_BASE_PATH = "/authentication-service";
const API_BASE = (process.env['API_BASE_URL'] ?? 'https://gateway-dev-emi.dg-cash.app') + SERVICE_BASE_PATH;

const SCAFFOLD = (process.env['SERVICE_API_SCAFFOLD'] ?? '').toLowerCase() === 'true';
const SMOKE = (process.env['SERVICE_API_SMOKE'] ?? '').toLowerCase() === 'true';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
interface ServiceOp {
    id: string;
    method: HttpMethod;
    path: string;
    tag: string;
    pathParams: boolean;
    body: boolean;
}

const OPERATIONS: ServiceOp[] = [
    { id: "unlockUser", method: "PUT", path: "/users/{userId}/unlock", tag: "user-controller", pathParams: true, body: false },
    { id: "lockUser", method: "PUT", path: "/users/{userId}/lock", tag: "user-controller", pathParams: true, body: false },
    { id: "disApproveUser", method: "PUT", path: "/users/{userId}/disapprove", tag: "user-controller", pathParams: true, body: false },
    { id: "deactivateUser", method: "PUT", path: "/users/{userId}/deactivate", tag: "user-controller", pathParams: true, body: false },
    { id: "deactivateUserInternally", method: "PUT", path: "/users/{userId}/deactivate/internally", tag: "user-controller", pathParams: true, body: false },
    { id: "approveUser", method: "PUT", path: "/users/{userId}/approve", tag: "user-controller", pathParams: true, body: false },
    { id: "activateUser", method: "PUT", path: "/users/{userId}/activate", tag: "user-controller", pathParams: true, body: false },
    { id: "deactivateUserByUsernameAndProfileId", method: "PUT", path: "/users/{profileId}/deactivate/tenant-admin", tag: "user-controller", pathParams: true, body: false },
    { id: "resetPasswordStaff", method: "PUT", path: "/users/profiles/{profileId}/staff/reset-password", tag: "user-controller", pathParams: true, body: false },
    { id: "activateProfileUsers", method: "PUT", path: "/users/profile/{profileId}/activate", tag: "user-controller", pathParams: true, body: false },
    { id: "updateUserGroup", method: "PUT", path: "/users/group/{profileId}/update", tag: "user-controller", pathParams: true, body: true },
    { id: "invalidateToken", method: "PUT", path: "/jwt/token", tag: "jwt-controller", pathParams: false, body: false },
    { id: "logout", method: "PUT", path: "/jwt/log-out", tag: "jwt-controller", pathParams: false, body: false },
    { id: "deactivateUserTokens", method: "PUT", path: "/jwt/deactivate", tag: "jwt-controller", pathParams: false, body: false },
    { id: "unassignUserFromGroupByCode", method: "PUT", path: "/internally/custom/groups/unassign", tag: "custom-group-controller", pathParams: false, body: false },
    { id: "addUserToGroupByCode", method: "PUT", path: "/internally/custom/groups/assign", tag: "custom-group-controller", pathParams: false, body: false },
    { id: "unassignUserFromGroup", method: "PUT", path: "/groups/{groupId}/unassign-users", tag: "platform-group-controller", pathParams: true, body: true },
    { id: "addRole", method: "PUT", path: "/groups/{groupId}/roles", tag: "platform-group-controller", pathParams: true, body: true },
    { id: "removeRole", method: "PUT", path: "/groups/{groupId}/roles/remove", tag: "platform-group-controller", pathParams: true, body: true },
    { id: "assignUsersToGroup", method: "PUT", path: "/groups/{groupId}/assign-users", tag: "platform-group-controller", pathParams: true, body: true },
    { id: "updateGroup", method: "PUT", path: "/groups/{group-id}", tag: "platform-group-controller", pathParams: true, body: true },
    { id: "getById_1", method: "GET", path: "/groups/roles/{roleId}", tag: "platform-role-controller", pathParams: true, body: false },
    { id: "addPrivilege", method: "PUT", path: "/groups/roles/{roleId}", tag: "platform-role-controller", pathParams: true, body: true },
    { id: "deleteRole", method: "DELETE", path: "/groups/roles/{roleId}", tag: "platform-role-controller", pathParams: true, body: false },
    { id: "removePrivilege", method: "PUT", path: "/groups/roles/{roleId}/remove", tag: "platform-role-controller", pathParams: true, body: true },
    { id: "updateRole", method: "PUT", path: "/groups/roles/update", tag: "platform-role-controller", pathParams: false, body: true },
    { id: "getById_3", method: "GET", path: "/custom/roles/{roleId}", tag: "custom-role-controller", pathParams: true, body: false },
    { id: "updateRole_1", method: "PUT", path: "/custom/roles/{roleId}", tag: "custom-role-controller", pathParams: true, body: true },
    { id: "deleteRole_1", method: "DELETE", path: "/custom/roles/{roleId}", tag: "custom-role-controller", pathParams: true, body: false },
    { id: "removePrivilege_1", method: "PUT", path: "/custom/roles/{roleId}/remove", tag: "custom-role-controller", pathParams: true, body: true },
    { id: "addPrivilege_1", method: "PUT", path: "/custom/roles/{roleId}/privileges", tag: "custom-role-controller", pathParams: true, body: true },
    { id: "getById_4", method: "GET", path: "/custom/groups/{groupId}", tag: "custom-group-controller", pathParams: true, body: false },
    { id: "updateGroup_1", method: "PUT", path: "/custom/groups/{groupId}", tag: "custom-group-controller", pathParams: true, body: true },
    { id: "deleteGroup_1", method: "DELETE", path: "/custom/groups/{groupId}", tag: "custom-group-controller", pathParams: true, body: false },
    { id: "unassignUserFromGroup_1", method: "PUT", path: "/custom/groups/{groupId}/unassign-users", tag: "custom-group-controller", pathParams: true, body: true },
    { id: "addRole_1", method: "PUT", path: "/custom/groups/{groupId}/roles", tag: "custom-group-controller", pathParams: true, body: true },
    { id: "removeRole_1", method: "PUT", path: "/custom/groups/{groupId}/roles/remove", tag: "custom-group-controller", pathParams: true, body: true },
    { id: "assignUsersToGroup_1", method: "PUT", path: "/custom/groups/{groupId}/assign-users", tag: "custom-group-controller", pathParams: true, body: true },
    { id: "verifyUnlockEmail", method: "PUT", path: "/api/v1/admin/unlock/verify-email", tag: "admin-user-controller", pathParams: false, body: true },
    { id: "resetFirstTimePassword", method: "POST", path: "/users/self/passwords/reset", tag: "user-controller", pathParams: false, body: true },
    { id: "requestResetPassword", method: "POST", path: "/users/self/passwords/reset-request", tag: "user-controller", pathParams: false, body: true },
    { id: "resetPassword", method: "POST", path: "/users/self/passwords/change", tag: "user-controller", pathParams: false, body: true },
    { id: "setPin", method: "POST", path: "/users/pin", tag: "user-controller", pathParams: false, body: true },
    { id: "generateApiKey", method: "POST", path: "/users/integration/{id}/ips", tag: "integration-user-controller", pathParams: true, body: true },
    { id: "generateApiKey_1", method: "POST", path: "/users/integration/{id}/generate-api-key", tag: "integration-user-controller", pathParams: true, body: true },
    { id: "createOTP", method: "POST", path: "/users/integration/generate-api-key/otp", tag: "integration-user-controller", pathParams: false, body: false },
    { id: "refreshToken", method: "POST", path: "/jwt/refresh", tag: "jwt-controller", pathParams: false, body: false },
    { id: "getAll", method: "GET", path: "/groups", tag: "platform-group-controller", pathParams: false, body: false },
    { id: "createGroup", method: "POST", path: "/groups", tag: "platform-group-controller", pathParams: false, body: true },
    { id: "getAll_1", method: "GET", path: "/groups/roles", tag: "platform-role-controller", pathParams: false, body: false },
    { id: "createRole", method: "POST", path: "/groups/roles", tag: "platform-role-controller", pathParams: false, body: true },
    { id: "getAll_3", method: "GET", path: "/custom/roles", tag: "custom-role-controller", pathParams: false, body: false },
    { id: "createCustomRole", method: "POST", path: "/custom/roles", tag: "custom-role-controller", pathParams: false, body: true },
    { id: "getAll_4", method: "GET", path: "/custom/groups", tag: "custom-group-controller", pathParams: false, body: false },
    { id: "createCustomGroup", method: "POST", path: "/custom/groups", tag: "custom-group-controller", pathParams: false, body: true },
    { id: "verifyOtp", method: "POST", path: "/auth/verify/otp", tag: "authentication-controller", pathParams: false, body: true },
    { id: "signin", method: "POST", path: "/auth/signin", tag: "authentication-controller", pathParams: false, body: true },
    { id: "signinUsingPin", method: "POST", path: "/auth/signin/trusted", tag: "authentication-controller", pathParams: false, body: true },
    { id: "signinIntegration", method: "POST", path: "/auth/signin/integration", tag: "authentication-controller", pathParams: false, body: true },
    { id: "forgetPassword", method: "POST", path: "/auth/passwords/forget", tag: "authentication-controller", pathParams: false, body: true },
    { id: "resetForgottenPassword", method: "POST", path: "/auth/passwords/forget/change", tag: "authentication-controller", pathParams: false, body: true },
    { id: "unlockAdminProfile", method: "POST", path: "/api/v1/admin/unlock", tag: "admin-user-controller", pathParams: false, body: true },
    { id: "verifyUnlockOtp", method: "POST", path: "/api/v1/admin/unlock/verify-otp", tag: "admin-user-controller", pathParams: false, body: true },
    { id: "checkUserExistence", method: "GET", path: "/users", tag: "user-controller", pathParams: false, body: false },
    { id: "getUserByUserNameAsAdmin", method: "GET", path: "/users/{tenant}/{username}", tag: "user-controller", pathParams: true, body: false },
    { id: "getUserByToken", method: "GET", path: "/users/self", tag: "user-controller", pathParams: false, body: false },
    { id: "getUserInternallyByToken", method: "GET", path: "/users/self/internal", tag: "user-controller", pathParams: false, body: false },
    { id: "getLastLogin", method: "GET", path: "/users/self/internal/lastLogin", tag: "user-controller", pathParams: false, body: false },
    { id: "getUserByToken_1", method: "GET", path: "/users/profiles/{profile-id}", tag: "user-controller", pathParams: true, body: false },
    { id: "getUsersByProfileInternally", method: "GET", path: "/users/internally", tag: "user-controller", pathParams: false, body: false },
    { id: "getUserByUserNameAsAdmin_1", method: "GET", path: "/users/internally/{tenant}/{username}", tag: "user-controller", pathParams: true, body: false },
    { id: "getUserIdByProfileIdAndUserName", method: "GET", path: "/users/internally/user-id/{profileId}/{username}", tag: "user-controller", pathParams: true, body: false },
    { id: "getUserIdByProfileId", method: "GET", path: "/users/internally/profile-id/{profileId}", tag: "user-controller", pathParams: true, body: false },
    { id: "getUserById", method: "GET", path: "/users/integration/{userId}", tag: "integration-user-controller", pathParams: true, body: false },
    { id: "getUserByProfileId", method: "GET", path: "/users/integration/profiles/{profileId}", tag: "integration-user-controller", pathParams: true, body: false },
    { id: "getAllUsers", method: "GET", path: "/users/integration/all", tag: "integration-user-controller", pathParams: false, body: false },
    { id: "getAllUsers_1", method: "GET", path: "/users/all", tag: "user-controller", pathParams: false, body: false },
    { id: "getGroupByCodeAndTenant", method: "GET", path: "/internally/custom/groups/{groupCode}/{tenantNumber}", tag: "custom-group-controller", pathParams: true, body: false },
    { id: "existsByCode", method: "GET", path: "/internally/custom/groups/{groupCode}/exists", tag: "custom-group-controller", pathParams: true, body: false },
    { id: "getAssignedGroupByCode", method: "GET", path: "/internally/custom/groups/{groupCode}/assigned", tag: "custom-group-controller", pathParams: true, body: false },
    { id: "getById", method: "GET", path: "/groups/{groupId}", tag: "platform-group-controller", pathParams: true, body: false },
    { id: "deleteGroup", method: "DELETE", path: "/groups/{groupId}", tag: "platform-group-controller", pathParams: true, body: false },
    { id: "getAll_2", method: "GET", path: "/groups/roles/privileges", tag: "privilege-controller", pathParams: false, body: false },
    { id: "getById_2", method: "GET", path: "/groups/roles/privileges/{privilegeId}", tag: "privilege-controller", pathParams: true, body: false },
    { id: "getAllCustomPrivileges", method: "GET", path: "/groups/roles/custom/privileges", tag: "privilege-controller", pathParams: false, body: false },
    { id: "getCustomPrivilegeById", method: "GET", path: "/groups/roles/custom/privileges/{privilegeId}", tag: "privilege-controller", pathParams: true, body: false },
];

if (SCAFFOLD || SMOKE) {
    test.describe(`${SERVICE_SLUG} (generated scaffold)`, () => {
        test.describe.configure({ mode: 'serial' });

        for (const op of OPERATIONS) {
            test(`${op.id}  ${op.method} ${op.path}`, async () => {
                test.skip(true, 'generated scaffold — add request fixtures + assertions to enable');
            });
        }

        for (const op of OPERATIONS.filter((o) => !o.pathParams)) {
            test(`unauth ${op.method} ${op.path} is rejected`, async ({ request }) => {
                test.skip(!SMOKE, 'set SERVICE_API_SMOKE=true to run the live contract smoke');
                const res = await request.fetch(`${API_BASE}${op.path}`, {
                    method: op.method,
                    headers: { 'Content-Type': 'application/json' },
                    data: op.body ? {} : undefined,
                });
                expect(res.status(), `${op.method} ${op.path}: expected a 4xx without a token`).toBeGreaterThanOrEqual(400);
                expect(res.status(), `${op.method} ${op.path}: a 5xx here is a gateway defect`).toBeLessThan(500);
            });
        }
    });
}
