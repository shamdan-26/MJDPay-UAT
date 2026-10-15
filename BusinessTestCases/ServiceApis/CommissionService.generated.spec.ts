import { test, expect } from '@playwright/test';

/**
 * Commission Service — generated API scaffold (OpenAPI 3.1.0).
 * 12 operations. Source: /commission-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/CommissionService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "commission-service";
const SERVICE_BASE_PATH = "/commission-service";
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
    { id: "updateDefaultCommission", method: "PUT", path: "/api/v1/default-commissions/{id}", tag: "default-commission-controller", pathParams: true, body: true },
    { id: "deactivateCommission", method: "PUT", path: "/api/v1/default-commissions/{id}/deactivate", tag: "default-commission-controller", pathParams: true, body: false },
    { id: "activateCommission", method: "PUT", path: "/api/v1/default-commissions/{id}/activate", tag: "default-commission-controller", pathParams: true, body: false },
    { id: "getCommissions", method: "GET", path: "/api/v1/commissions", tag: "commission-controller", pathParams: false, body: false },
    { id: "updateCommission", method: "PUT", path: "/api/v1/commissions", tag: "commission-controller", pathParams: false, body: true },
    { id: "createCommissions", method: "POST", path: "/api/v1/commissions", tag: "commission-controller", pathParams: false, body: true },
    { id: "deactivateCommission_1", method: "PUT", path: "/api/v1/commissions/{id}/deactivate", tag: "commission-controller", pathParams: true, body: false },
    { id: "activateCommission_1", method: "PUT", path: "/api/v1/commissions/{id}/activate", tag: "commission-controller", pathParams: true, body: false },
    { id: "getDefaultCommission", method: "GET", path: "/api/v1/default-commissions", tag: "default-commission-controller", pathParams: false, body: false },
    { id: "createDefaultCommissions", method: "POST", path: "/api/v1/default-commissions", tag: "default-commission-controller", pathParams: false, body: true },
    { id: "calculateCommission", method: "POST", path: "/api/v1/commissions/calculate", tag: "commission-controller", pathParams: false, body: true },
    { id: "getCommissionByUserCode", method: "GET", path: "/api/v1/commissions/{profileCode}", tag: "commission-controller", pathParams: true, body: false },
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
