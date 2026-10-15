import { test, expect } from '@playwright/test';

/**
 * Aml Integration Service — generated API scaffold (OpenAPI 3.1.0).
 * 10 operations. Source: /aml-integration-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/AmlIntegrationService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "aml-integration-service";
const SERVICE_BASE_PATH = "/aml-integration-service";
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
    { id: "evaluateTrustDevice", method: "POST", path: "/api/v1/mozn/events/trust-device", tag: "mozn-event-controller", pathParams: false, body: true },
    { id: "evaluateRegister", method: "POST", path: "/api/v1/mozn/events/register", tag: "mozn-event-controller", pathParams: false, body: true },
    { id: "evaluateProfileUpdate", method: "POST", path: "/api/v1/mozn/events/profile-update", tag: "mozn-event-controller", pathParams: false, body: true },
    { id: "evaluatePasswordReset", method: "POST", path: "/api/v1/mozn/events/password-reset", tag: "mozn-event-controller", pathParams: false, body: true },
    { id: "evaluateNewBeneficiary", method: "POST", path: "/api/v1/mozn/events/new-beneficiary", tag: "mozn-event-controller", pathParams: false, body: true },
    { id: "evaluateLogin", method: "POST", path: "/api/v1/mozn/events/login", tag: "mozn-event-controller", pathParams: false, body: true },
    { id: "WS3AmlCheck", method: "POST", path: "/api/v1/aml/ws3", tag: "aml-controller", pathParams: false, body: true },
    { id: "WS1AmlCheck", method: "POST", path: "/api/v1/aml/ws1", tag: "aml-controller", pathParams: false, body: true },
    { id: "createProfileRiskLevel", method: "POST", path: "/aml/risks/single", tag: "aml-risk-controller", pathParams: false, body: true },
    { id: "createProfilesRiskLevel", method: "POST", path: "/aml/risks/batch", tag: "aml-risk-controller", pathParams: false, body: true },
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
