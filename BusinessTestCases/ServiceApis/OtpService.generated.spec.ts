import { test, expect } from '@playwright/test';

/**
 * OTP Service — generated API scaffold (OpenAPI 3.1.0).
 * 11 operations. Source: /otp-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/OtpService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "otp-service";
const SERVICE_BASE_PATH = "/otp-service";
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
    { id: "getOtpSettingsById", method: "GET", path: "/otp/otp-settings/{id}", tag: "otp-settings-controller", pathParams: true, body: false },
    { id: "updateOtpSettings", method: "PUT", path: "/otp/otp-settings/{id}", tag: "otp-settings-controller", pathParams: true, body: true },
    { id: "getAllFunctionTypes", method: "GET", path: "/otp/operations", tag: "otp-operation-controller", pathParams: false, body: false },
    { id: "updateOperation", method: "PUT", path: "/otp/operations", tag: "otp-operation-controller", pathParams: false, body: true },
    { id: "createOperation", method: "POST", path: "/otp/operations", tag: "otp-operation-controller", pathParams: false, body: true },
    { id: "getAllOtpSettings", method: "GET", path: "/otp/otp-settings", tag: "otp-settings-controller", pathParams: false, body: false },
    { id: "createOtpSetting", method: "POST", path: "/otp/otp-settings", tag: "otp-settings-controller", pathParams: false, body: true },
    { id: "getOtpSettingsByCode", method: "GET", path: "/otp/otp-settings/q", tag: "otp-settings-controller", pathParams: false, body: false },
    { id: "getOperationByCode", method: "GET", path: "/otp/operations/q", tag: "otp-operation-controller", pathParams: false, body: false },
    { id: "getAllFunctionTypesByPage", method: "GET", path: "/otp/operations/page", tag: "otp-operation-controller", pathParams: false, body: false },
    { id: "deleteOtpSetting", method: "DELETE", path: "/otp/otp-settings/{settingId}", tag: "otp-settings-controller", pathParams: true, body: false },
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
