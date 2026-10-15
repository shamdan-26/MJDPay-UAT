import { test, expect } from '@playwright/test';

/**
 * Ebill Service — generated API scaffold (OpenAPI 3.1.0).
 * 58 operations. Source: /ebill-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/EbillService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "ebill-service";
const SERVICE_BASE_PATH = "/ebill-service";
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
    { id: "getProductById", method: "GET", path: "/api/v1/products/{productId}", tag: "product-controller", pathParams: true, body: false },
    { id: "updateProduct", method: "PUT", path: "/api/v1/products/{productId}", tag: "product-controller", pathParams: true, body: true },
    { id: "deleteProductById", method: "DELETE", path: "/api/v1/products/{productId}", tag: "product-controller", pathParams: true, body: false },
    { id: "getBillById", method: "GET", path: "/api/v1/external/bills/{bill-id}", tag: "integration-e-bill-controller", pathParams: true, body: false },
    { id: "updateBill", method: "PUT", path: "/api/v1/external/bills/{bill-id}", tag: "integration-e-bill-controller", pathParams: true, body: true },
    { id: "deleteBill", method: "DELETE", path: "/api/v1/external/bills/{bill-id}", tag: "integration-e-bill-controller", pathParams: true, body: false },
    { id: "getBillByReference", method: "GET", path: "/api/v1/bills/{bill-id}", tag: "e-bill-controller", pathParams: true, body: false },
    { id: "updateBill_1", method: "PUT", path: "/api/v1/bills/{bill-id}", tag: "e-bill-controller", pathParams: true, body: true },
    { id: "deleteBill_1", method: "DELETE", path: "/api/v1/bills/{bill-id}", tag: "e-bill-controller", pathParams: true, body: false },
    { id: "updateBillItem", method: "PUT", path: "/api/v1/bill-items/bills/{billId}/bill-item/{billItemId}", tag: "bill-item-controller", pathParams: true, body: true },
    { id: "generateDynamicQr", method: "POST", path: "/qr/dynamic", tag: "qr-controller", pathParams: false, body: true },
    { id: "getProductsByBillerProfile", method: "GET", path: "/api/v1/products", tag: "product-controller", pathParams: false, body: false },
    { id: "addProduct", method: "POST", path: "/api/v1/products", tag: "product-controller", pathParams: false, body: true },
    { id: "uploadBillsFile", method: "POST", path: "/api/v1/files/upload", tag: "file-generator-controller", pathParams: false, body: true },
    { id: "createBill0", method: "POST", path: "/api/v1/external/bills", tag: "integration-e-bill-controller", pathParams: false, body: true },
    { id: "rejectBill", method: "POST", path: "/api/v1/external/bills/{bill-id}/reject", tag: "integration-e-bill-controller", pathParams: true, body: false },
    { id: "approveBill", method: "POST", path: "/api/v1/external/bills/{bill-id}/approve", tag: "integration-e-bill-controller", pathParams: true, body: false },
    { id: "transferToWallet", method: "POST", path: "/api/v1/external/bills/transferToWallet", tag: "integration-e-bill-controller", pathParams: false, body: true },
    { id: "payBill", method: "POST", path: "/api/v1/external/bills/pay", tag: "integration-e-bill-controller", pathParams: false, body: true },
    { id: "calculateBillSummary", method: "POST", path: "/api/v1/external/bills/calculate", tag: "integration-e-bill-controller", pathParams: false, body: true },
    { id: "createBill", method: "POST", path: "/api/v1/external/bills/bulk", tag: "integration-e-bill-controller", pathParams: false, body: true },
    { id: "createBill0_1", method: "POST", path: "/api/v1/bills", tag: "e-bill-controller", pathParams: false, body: true },
    { id: "rejectBill_1", method: "POST", path: "/api/v1/bills/{bill-id}/reject", tag: "e-bill-controller", pathParams: true, body: false },
    { id: "approveBill_1", method: "POST", path: "/api/v1/bills/{bill-id}/approve", tag: "e-bill-controller", pathParams: true, body: false },
    { id: "transferToWallet_1", method: "POST", path: "/api/v1/bills/transferToWallet", tag: "e-bill-controller", pathParams: false, body: true },
    { id: "getAllPaymentLinks", method: "GET", path: "/api/v1/bills/payment-links", tag: "payment-link-controller", pathParams: false, body: false },
    { id: "create", method: "POST", path: "/api/v1/bills/payment-links", tag: "payment-link-controller", pathParams: false, body: true },
    { id: "disablePaymentLink", method: "POST", path: "/api/v1/bills/payment-links/{paymentLinkId}/disable", tag: "payment-link-controller", pathParams: true, body: false },
    { id: "regenerate", method: "POST", path: "/api/v1/bills/payment-links/regenerate", tag: "payment-link-controller", pathParams: false, body: true },
    { id: "submitPayment", method: "POST", path: "/api/v1/bills/payment-links/pay/{token}/submit", tag: "payment-link-controller", pathParams: true, body: true },
    { id: "verifyPayment", method: "POST", path: "/api/v1/bills/payment-links/pay/{token}/submit/verify", tag: "payment-link-controller", pathParams: true, body: true },
    { id: "updatePaymentStatus", method: "POST", path: "/api/v1/bills/payment-links/pay/{token}/submit/update-status", tag: "payment-link-controller", pathParams: true, body: true },
    { id: "payBill_1", method: "POST", path: "/api/v1/bills/pay", tag: "e-bill-controller", pathParams: false, body: true },
    { id: "billPaymentSummery", method: "POST", path: "/api/v1/bills/pay/summary", tag: "e-bill-controller", pathParams: false, body: true },
    { id: "calculateBillSummary_1", method: "POST", path: "/api/v1/bills/calculate", tag: "e-bill-controller", pathParams: false, body: true },
    { id: "createBill_1", method: "POST", path: "/api/v1/bills/bulk", tag: "e-bill-controller", pathParams: false, body: true },
    { id: "addBillItems", method: "POST", path: "/api/v1/bill-items/bills/{billId}/bill-item", tag: "bill-item-controller", pathParams: true, body: true },
    { id: "qrScan", method: "GET", path: "/qr/scan", tag: "qr-controller", pathParams: false, body: false },
    { id: "dynamicQrScan", method: "GET", path: "/qr/dynamic/scan", tag: "qr-controller", pathParams: false, body: false },
    { id: "generateExcelSheet", method: "GET", path: "/api/v1/files/generate/excel", tag: "file-generator-controller", pathParams: false, body: false },
    { id: "getBillsTotal", method: "GET", path: "/api/v1/external/bills/total", tag: "integration-e-bill-controller", pathParams: false, body: false },
    { id: "getCreatedBillReport", method: "GET", path: "/api/v1/external/bills/sent", tag: "integration-e-bill-controller", pathParams: false, body: false },
    { id: "getReceivedBillReport", method: "GET", path: "/api/v1/external/bills/received", tag: "integration-e-bill-controller", pathParams: false, body: false },
    { id: "getBillById_1", method: "GET", path: "/api/v1/external/bills/activities/{billId}", tag: "bill-activity-controller", pathParams: true, body: false },
    { id: "getDiscountTypes", method: "GET", path: "/api/v1/discountTypes", tag: "discount-type-controller", pathParams: false, body: false },
    { id: "getDiscountTypeByCode", method: "GET", path: "/api/v1/discountTypes/{code}", tag: "discount-type-controller", pathParams: true, body: false },
    { id: "getBillTypes", method: "GET", path: "/api/v1/bills/types", tag: "bill-type-controller", pathParams: false, body: false },
    { id: "getBillTypeByCode", method: "GET", path: "/api/v1/bills/types/{code}", tag: "bill-type-controller", pathParams: true, body: false },
    { id: "getBillByDraftTransactionId", method: "GET", path: "/api/v1/bills/transactions/bill/{transaction-id}", tag: "e-bill-controller", pathParams: true, body: false },
    { id: "getBillsTotal_1", method: "GET", path: "/api/v1/bills/total", tag: "e-bill-controller", pathParams: false, body: false },
    { id: "getCreatedBillReport_1", method: "GET", path: "/api/v1/bills/sent", tag: "e-bill-controller", pathParams: false, body: false },
    { id: "getReceivedBillReport_1", method: "GET", path: "/api/v1/bills/received", tag: "e-bill-controller", pathParams: false, body: false },
    { id: "resolve", method: "GET", path: "/api/v1/bills/payment-links/pay/{token}", tag: "payment-link-controller", pathParams: true, body: false },
    { id: "getBillsInternal", method: "GET", path: "/api/v1/bills/internal", tag: "e-bill-controller", pathParams: false, body: false },
    { id: "getBillsCount", method: "GET", path: "/api/v1/bills/count", tag: "e-bill-controller", pathParams: false, body: false },
    { id: "getBillItemByBillId", method: "GET", path: "/api/v1/bill-items/bills/{billId}", tag: "bill-item-controller", pathParams: true, body: false },
    { id: "deletePaymentLink", method: "DELETE", path: "/api/v1/bills/payment-links/{paymentLinkId}", tag: "payment-link-controller", pathParams: true, body: false },
    { id: "deleteBillItem", method: "DELETE", path: "/api/v1/bill-items/{billItemId}", tag: "bill-item-controller", pathParams: true, body: false },
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
