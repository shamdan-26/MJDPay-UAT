import { test, expect } from '@playwright/test';

/**
 * Integration Service — generated API scaffold (OpenAPI 3.1.0).
 * 16 operations. Source: /integration-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/IntegrationService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "integration-service";
const SERVICE_BASE_PATH = "/integration-service";
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
    { id: "uploadFile", method: "POST", path: "/api/v1/file/upload", tag: "upload-file-controller", pathParams: false, body: true },
    { id: "generateApiKey", method: "POST", path: "/api/v1/external_party_integration/{id}/api-key", tag: "external-party-controller", pathParams: true, body: false },
    { id: "refreshApiKey", method: "POST", path: "/api/v1/external_party_integration/refresh/api-key", tag: "external-party-controller", pathParams: false, body: true },
    { id: "createExternalParty", method: "POST", path: "/api/v1/external_party_integration/add", tag: "external-party-controller", pathParams: false, body: true },
    { id: "createSession", method: "POST", path: "/api/v1/auth/createSession", tag: "authentication-controller", pathParams: false, body: true },
    { id: "changeStatus", method: "PATCH", path: "/api/v1/external_party_integration/{id}/status", tag: "external-party-controller", pathParams: true, body: true },
    { id: "getAllStatuses", method: "GET", path: "/external-user-statuses", tag: "external-party-status-controller", pathParams: false, body: false },
    { id: "getStatusById", method: "GET", path: "/external-user-statuses/{id}", tag: "external-party-status-controller", pathParams: true, body: false },
    { id: "industryName", method: "GET", path: "/api/v1/lookup/industries", tag: "lookup-controller", pathParams: false, body: false },
    { id: "bankCodes", method: "GET", path: "/api/v1/lookup/banks", tag: "lookup-controller", pathParams: false, body: false },
    { id: "getExternalPartyById", method: "GET", path: "/api/v1/external_party_integration/{id}", tag: "external-party-controller", pathParams: true, body: false },
    { id: "deleteExternalParty", method: "DELETE", path: "/api/v1/external_party_integration/{id}", tag: "external-party-controller", pathParams: true, body: false },
    { id: "getAllExternalParties", method: "GET", path: "/api/v1/external_party_integration/getAll", tag: "external-party-controller", pathParams: false, body: false },
    { id: "getExternalPartyByName", method: "GET", path: "/api/v1/external_party_integration/by-name", tag: "external-party-controller", pathParams: false, body: false },
    { id: "getExternalPartyByApiKey", method: "GET", path: "/api/v1/external_party_integration/by-api-key", tag: "external-party-controller", pathParams: false, body: false },
    { id: "validateSession", method: "GET", path: "/api/v1/auth/validateSession", tag: "authentication-controller", pathParams: false, body: false },
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
