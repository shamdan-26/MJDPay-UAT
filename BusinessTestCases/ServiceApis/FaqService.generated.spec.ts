import { test, expect } from '@playwright/test';

/**
 * FAQ Service — generated API scaffold (OpenAPI 3.1.0).
 * 18 operations. Source: /faq-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/FaqService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "faq-service";
const SERVICE_BASE_PATH = "/faq-service";
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
    { id: "getPageById", method: "GET", path: "/pages/{id}", tag: "page-controller", pathParams: true, body: false },
    { id: "update", method: "PUT", path: "/pages/{id}", tag: "page-controller", pathParams: true, body: true },
    { id: "delete", method: "DELETE", path: "/pages/{id}", tag: "page-controller", pathParams: true, body: false },
    { id: "enable", method: "PUT", path: "/pages/{id}/enable", tag: "page-controller", pathParams: true, body: false },
    { id: "disable", method: "PUT", path: "/pages/{id}/disable", tag: "page-controller", pathParams: true, body: false },
    { id: "linkFaqWithCategory", method: "PUT", path: "/faq-category/{category-id}", tag: "faq-category-controller", pathParams: true, body: true },
    { id: "unlinkFaqWithCategory", method: "PUT", path: "/faq-category/{category-id}/unlink", tag: "faq-category-controller", pathParams: true, body: true },
    { id: "uploadTcPdfFile", method: "POST", path: "/tac/pdf/upload", tag: "tac-controller", pathParams: false, body: true },
    { id: "uploadTcPdfFile_1", method: "POST", path: "/privacyPolicy/pdf/upload", tag: "privacy-policy-controller", pathParams: false, body: true },
    { id: "create", method: "POST", path: "/pages", tag: "page-controller", pathParams: false, body: true },
    { id: "getAllFaqs", method: "GET", path: "/faq", tag: "faq-controller", pathParams: false, body: false },
    { id: "createFaq", method: "POST", path: "/faq", tag: "faq-controller", pathParams: false, body: true },
    { id: "getAllFaqs_1", method: "GET", path: "/faq-category", tag: "faq-category-controller", pathParams: false, body: false },
    { id: "createFaqs", method: "POST", path: "/faq-category", tag: "faq-category-controller", pathParams: false, body: true },
    { id: "getTcPdfFile", method: "GET", path: "/tac/pdf", tag: "tac-controller", pathParams: false, body: false },
    { id: "getTcPdfFile_1", method: "GET", path: "/privacyPolicy/pdf", tag: "privacy-policy-controller", pathParams: false, body: false },
    { id: "getTitles", method: "GET", path: "/pages/titles", tag: "page-controller", pathParams: false, body: false },
    { id: "getPageByTitle", method: "GET", path: "/pages/title/{title}", tag: "page-controller", pathParams: true, body: false },
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
