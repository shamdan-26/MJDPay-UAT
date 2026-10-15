import { test, expect } from '@playwright/test';

/**
 * Attachment Service — generated API scaffold (OpenAPI 3.1.0).
 * 22 operations. Source: /attachment-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/AttachmentService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "attachment-service";
const SERVICE_BASE_PATH = "/attachment-service";
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
    { id: "getAll", method: "GET", path: "/types", tag: "type-controller", pathParams: false, body: false },
    { id: "update", method: "PUT", path: "/types", tag: "type-controller", pathParams: false, body: true },
    { id: "create", method: "POST", path: "/types", tag: "type-controller", pathParams: false, body: true },
    { id: "getById_1", method: "GET", path: "/settings/{id}", tag: "settings-controller", pathParams: true, body: false },
    { id: "update_1", method: "PUT", path: "/settings/{id}", tag: "settings-controller", pathParams: true, body: true },
    { id: "delete_1", method: "DELETE", path: "/settings/{id}", tag: "settings-controller", pathParams: true, body: false },
    { id: "getById_2", method: "GET", path: "/extensions/{id}", tag: "extension-controller", pathParams: true, body: false },
    { id: "update_2", method: "PUT", path: "/extensions/{id}", tag: "extension-controller", pathParams: true, body: true },
    { id: "delete_2", method: "DELETE", path: "/extensions/{id}", tag: "extension-controller", pathParams: true, body: false },
    { id: "getAll_1", method: "GET", path: "/settings", tag: "settings-controller", pathParams: false, body: false },
    { id: "create_1", method: "POST", path: "/settings", tag: "settings-controller", pathParams: false, body: true },
    { id: "uploadFile", method: "POST", path: "/file/upload", tag: "ftp-controller", pathParams: false, body: true },
    { id: "uploadFile_1", method: "POST", path: "/file/attachment/upload", tag: "ftp-controller", pathParams: false, body: true },
    { id: "generateTokenForFile", method: "POST", path: "/file/attachment/token", tag: "ftp-controller", pathParams: false, body: true },
    { id: "getAll_2", method: "GET", path: "/extensions", tag: "extension-controller", pathParams: false, body: false },
    { id: "create_2", method: "POST", path: "/extensions", tag: "extension-controller", pathParams: false, body: true },
    { id: "getById", method: "GET", path: "/types/{id}", tag: "type-controller", pathParams: true, body: false },
    { id: "delete", method: "DELETE", path: "/types/{id}", tag: "type-controller", pathParams: true, body: false },
    { id: "fileExists", method: "GET", path: "/file", tag: "ftp-controller", pathParams: false, body: false },
    { id: "viewFile", method: "GET", path: "/file/view", tag: "ftp-controller", pathParams: false, body: false },
    { id: "viewFileContents", method: "GET", path: "/file/view/contents", tag: "ftp-controller", pathParams: false, body: false },
    { id: "getFileAttachment", method: "GET", path: "/file/attachment", tag: "ftp-controller", pathParams: false, body: false },
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
