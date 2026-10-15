import { test, expect } from '@playwright/test';

/**
 * Reports Service — generated API scaffold (OpenAPI 3.1.0).
 * 24 operations. Source: /reports-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/ReportsService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "reports-service";
const SERVICE_BASE_PATH = "/reports";
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
    { id: "walletReport", method: "POST", path: "/reports-generator/wallet-report", tag: "report-generator-controller", pathParams: false, body: true },
    { id: "walletDetailsReport", method: "POST", path: "/reports-generator/wallet-report/{id}/details", tag: "report-generator-controller", pathParams: true, body: true },
    { id: "generateTransactionsReport", method: "POST", path: "/reports-generator/transactions-report", tag: "report-generator-controller", pathParams: false, body: true },
    { id: "generateTransactionsExcelReport", method: "POST", path: "/reports-generator/transactions-excel-report", tag: "report-generator-controller", pathParams: false, body: true },
    { id: "externalReport", method: "POST", path: "/reports-generator/external-report", tag: "report-generator-controller", pathParams: false, body: true },
    { id: "externalDetailsReport", method: "POST", path: "/reports-generator/external-report/{id}/details", tag: "report-generator-controller", pathParams: true, body: true },
    { id: "collectionReport", method: "POST", path: "/reports-generator/collection", tag: "report-generator-controller", pathParams: false, body: true },
    { id: "collectionDetailsReport", method: "POST", path: "/reports-generator/collection-report/{id}/details", tag: "report-generator-controller", pathParams: true, body: true },
    { id: "generateBillsReport", method: "POST", path: "/reports-generator/bills-report", tag: "report-generator-controller", pathParams: false, body: true },
    { id: "walletReport_1", method: "POST", path: "/job/reconciliation", tag: "job-starter-controller", pathParams: false, body: true },
    { id: "rebuildRunningBalance", method: "POST", path: "/job/rebuild", tag: "job-starter-controller", pathParams: false, body: true },
    { id: "walletReport_2", method: "GET", path: "/reports/wallet-report", tag: "reports-controller", pathParams: false, body: false },
    { id: "collectionReport_1", method: "GET", path: "/reports/wallet-report/{id}/details", tag: "reports-controller", pathParams: true, body: false },
    { id: "walletReconciliationReport", method: "GET", path: "/reports/wallet-reconciliation-report", tag: "reports-controller", pathParams: false, body: false },
    { id: "externalReport_1", method: "GET", path: "/reports/external-report", tag: "reports-controller", pathParams: false, body: false },
    { id: "externalReport_2", method: "GET", path: "/reports/external-report/{id}/details", tag: "reports-controller", pathParams: true, body: false },
    { id: "collectionReport_2", method: "GET", path: "/reports/collection-report", tag: "reports-controller", pathParams: false, body: false },
    { id: "walletReport_3", method: "GET", path: "/reports/collection-report/{id}/details", tag: "reports-controller", pathParams: true, body: false },
    { id: "balanceReport", method: "GET", path: "/reports/balance-report", tag: "reports-controller", pathParams: false, body: false },
    { id: "walletReconciliationReport_1", method: "GET", path: "/reports-generator/wallet-reconciliation-report", tag: "report-generator-controller", pathParams: false, body: false },
    { id: "generateBillsStatisticReport", method: "GET", path: "/reports-generator/statistic-report", tag: "report-generator-controller", pathParams: false, body: false },
    { id: "runningBalanceReport", method: "GET", path: "/reports-generator/running-balance-report", tag: "report-generator-controller", pathParams: false, body: false },
    { id: "externalReconciliationReport", method: "GET", path: "/reports-generator/external-reconciliation-report", tag: "report-generator-controller", pathParams: false, body: false },
    { id: "collectionReconciliationReport", method: "GET", path: "/reports-generator/collection-reconciliation-report", tag: "report-generator-controller", pathParams: false, body: false },
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
