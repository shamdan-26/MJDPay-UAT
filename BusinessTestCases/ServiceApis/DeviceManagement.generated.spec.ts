import { test, expect } from '@playwright/test';

/**
 * Device Management — generated API scaffold (OpenAPI 3.1.0).
 * 15 operations. Source: /device-management/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/DeviceManagement-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "device-management";
const SERVICE_BASE_PATH = "/device-management";
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
    { id: "getDevices", method: "GET", path: "/devices", tag: "device-controller", pathParams: false, body: false },
    { id: "updateDevice", method: "PUT", path: "/devices", tag: "device-controller", pathParams: false, body: true },
    { id: "unAssignUserToDevice", method: "PUT", path: "/devices/users/unassign", tag: "device-controller", pathParams: false, body: true },
    { id: "generateUUID", method: "POST", path: "/devices/uuid", tag: "device-controller", pathParams: false, body: true },
    { id: "UnBannedDevice", method: "POST", path: "/devices/unbanned", tag: "banned-device-controller", pathParams: false, body: false },
    { id: "bannedDevice", method: "POST", path: "/devices/banned", tag: "banned-device-controller", pathParams: false, body: false },
    { id: "bannedDeviceInternal", method: "POST", path: "/devices/banned/internal", tag: "banned-device-controller", pathParams: false, body: false },
    { id: "isBannedDevice", method: "GET", path: "/devices/{deviceId}", tag: "banned-device-controller", pathParams: true, body: false },
    { id: "getIpAddress", method: "GET", path: "/devices/ip-address", tag: "device-controller", pathParams: false, body: false },
    { id: "getAllDevicesInternally", method: "GET", path: "/devices/internal", tag: "device-controller", pathParams: false, body: false },
    { id: "isExist", method: "GET", path: "/devices/internal/user/{userId}/{deviceId}", tag: "device-controller", pathParams: true, body: false },
    { id: "getActiveDeviceByProfileCode", method: "GET", path: "/devices/internal/profile/{profileCode}", tag: "device-controller", pathParams: true, body: false },
    { id: "getFcmTokensByToken", method: "GET", path: "/devices/fcms", tag: "device-controller", pathParams: false, body: false },
    { id: "getByDeviceId", method: "GET", path: "/devices/details/{deviceId}", tag: "device-controller", pathParams: true, body: false },
    { id: "getActiveFcmTokens", method: "GET", path: "/devices/active/fcm", tag: "device-controller", pathParams: false, body: false },
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
