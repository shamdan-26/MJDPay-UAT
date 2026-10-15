import { test, expect } from '@playwright/test';

/**
 * Product Management Service — generated API scaffold (OpenAPI 3.1.0).
 * 79 operations. Source: /product-management-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/ProductManagementService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "product-management-service";
const SERVICE_BASE_PATH = "/product-management-service";
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
    { id: "updateStatus", method: "PUT", path: "/api/v1/pos/orders/{orderReference}/status", tag: "pos-order-controller", pathParams: true, body: true },
    { id: "uploadConsentDelivery", method: "PUT", path: "/api/v1/pos/orders/{orderReference}/delivery-groups/{deliveryGroupSeq}/consent-delivery", tag: "pos-order-controller", pathParams: true, body: true },
    { id: "removeConsentDelivery", method: "DELETE", path: "/api/v1/pos/orders/{orderReference}/delivery-groups/{deliveryGroupSeq}/consent-delivery", tag: "pos-order-controller", pathParams: true, body: false },
    { id: "getMerchantCategoryCodeByCode", method: "GET", path: "/api/v1/mcc-lookup/{code}", tag: "merchant-category-controller", pathParams: true, body: false },
    { id: "updateMerchantCategoryCode", method: "PUT", path: "/api/v1/mcc-lookup/{code}", tag: "merchant-category-controller", pathParams: true, body: true },
    { id: "deleteMerchantCategoryCode", method: "DELETE", path: "/api/v1/mcc-lookup/{code}", tag: "merchant-category-controller", pathParams: true, body: false },
    { id: "verifyChangePin", method: "PUT", path: "/api/v1/cards/{id}/pin/verify", tag: "cards-controller", pathParams: true, body: true },
    { id: "toggleIsOnlineActive", method: "PUT", path: "/api/v1/cards/{id}/online", tag: "cards-controller", pathParams: true, body: false },
    { id: "verifyCancel", method: "PUT", path: "/api/v1/cards/{id}/cancel/verify", tag: "cards-controller", pathParams: true, body: true },
    { id: "getById_1", method: "GET", path: "/api/v1/cards/products/{id}", tag: "card-product-controller", pathParams: true, body: false },
    { id: "update", method: "PUT", path: "/api/v1/cards/products/{id}", tag: "card-product-controller", pathParams: true, body: true },
    { id: "delete_1", method: "DELETE", path: "/api/v1/cards/products/{id}", tag: "card-product-controller", pathParams: true, body: false },
    { id: "deactivate", method: "PUT", path: "/api/v1/cards/products/{id}/deactivate", tag: "card-product-controller", pathParams: true, body: false },
    { id: "activate", method: "PUT", path: "/api/v1/cards/products/{id}/activate", tag: "card-product-controller", pathParams: true, body: false },
    { id: "getById_2", method: "GET", path: "/api/v1/cards/benefits/{id}", tag: "benefits-controller", pathParams: true, body: false },
    { id: "update_1", method: "PUT", path: "/api/v1/cards/benefits/{id}", tag: "benefits-controller", pathParams: true, body: true },
    { id: "delete_2", method: "DELETE", path: "/api/v1/cards/benefits/{id}", tag: "benefits-controller", pathParams: true, body: false },
    { id: "getCardLimitByTitle", method: "GET", path: "/api/v1/card-limits/{id}", tag: "card-limit-controller", pathParams: true, body: false },
    { id: "updateCardLimit", method: "PUT", path: "/api/v1/card-limits/{id}", tag: "card-limit-controller", pathParams: true, body: true },
    { id: "deleteCardLimit", method: "DELETE", path: "/api/v1/card-limits/{id}", tag: "card-limit-controller", pathParams: true, body: false },
    { id: "receiveXml_1", method: "POST", path: "/api/v1/pos/transactions/callback", tag: "pos-transaction-callback-controller", pathParams: false, body: true },
    { id: "receive", method: "POST", path: "/api/v1/pos/reconciliation/receive", tag: "pos-reconciliation-controller", pathParams: false, body: true },
    { id: "importTids", method: "POST", path: "/api/v1/pos/orders/tids/import", tag: "pos-order-controller", pathParams: false, body: true },
    { id: "activateDevices", method: "POST", path: "/api/v1/pos/devices/activate", tag: "po-s-device-controller", pathParams: false, body: true },
    { id: "getAll_1", method: "GET", path: "/api/v1/mcc-lookup", tag: "merchant-category-controller", pathParams: false, body: false },
    { id: "createMerchantCategoryCode", method: "POST", path: "/api/v1/mcc-lookup", tag: "merchant-category-controller", pathParams: false, body: true },
    { id: "eod", method: "POST", path: "/api/v1/job/eod", tag: "job-started-controller", pathParams: false, body: false },
    { id: "runBtsJob", method: "POST", path: "/api/v1/job/bts", tag: "job-started-controller", pathParams: false, body: false },
    { id: "applyPosBankPaymentStatuses", method: "POST", path: "/api/v1/internal/pos/bank-payments/status", tag: "pos-bank-payment-status-controller", pathParams: false, body: true },
    { id: "verifyOtp", method: "POST", path: "/api/v1/cards/{request-id}/verify", tag: "cards-controller", pathParams: true, body: true },
    { id: "changePinRequest", method: "POST", path: "/api/v1/cards/{id}/pin", tag: "cards-controller", pathParams: true, body: true },
    { id: "requestPhysicalCard", method: "POST", path: "/api/v1/cards/{id}/physical/requests", tag: "cards-controller", pathParams: true, body: false },
    { id: "verifyRequestPhysicalCard", method: "POST", path: "/api/v1/cards/{id}/physical/requests/verify", tag: "cards-controller", pathParams: true, body: true },
    { id: "cancel", method: "POST", path: "/api/v1/cards/{id}/cancel", tag: "cards-controller", pathParams: true, body: false },
    { id: "resendOtp", method: "POST", path: "/api/v1/cards/resend-otp", tag: "cards-controller", pathParams: false, body: false },
    { id: "getAll_3", method: "GET", path: "/api/v1/cards/products", tag: "card-product-controller", pathParams: false, body: false },
    { id: "create", method: "POST", path: "/api/v1/cards/products", tag: "card-product-controller", pathParams: false, body: true },
    { id: "createCardTopup", method: "POST", path: "/api/v1/cards/payment/topup", tag: "card-payment-controller", pathParams: false, body: true },
    { id: "updateCardTopup", method: "POST", path: "/api/v1/cards/payment/topup/update", tag: "card-payment-controller", pathParams: false, body: true },
    { id: "settlement", method: "POST", path: "/api/v1/cards/jit/payment/settlement", tag: "jit-payment-controller", pathParams: false, body: true },
    { id: "authorizeTransaction", method: "POST", path: "/api/v1/cards/jit/payment/authDecision", tag: "jit-payment-controller", pathParams: false, body: true },
    { id: "getAll_4", method: "GET", path: "/api/v1/cards/benefits", tag: "benefits-controller", pathParams: false, body: false },
    { id: "create_1", method: "POST", path: "/api/v1/cards/benefits", tag: "benefits-controller", pathParams: false, body: true },
    { id: "apply", method: "POST", path: "/api/v1/cards/apply", tag: "cards-controller", pathParams: false, body: true },
    { id: "summeryClose", method: "POST", path: "/api/v1/card-summary/close", tag: "card-summary-controller", pathParams: false, body: true },
    { id: "getAllCardLimits", method: "GET", path: "/api/v1/card-limits", tag: "card-limit-controller", pathParams: false, body: false },
    { id: "createCardLimit", method: "POST", path: "/api/v1/card-limits", tag: "card-limit-controller", pathParams: false, body: true },
    { id: "release", method: "POST", path: "/api/v1/admin/pos/ach-transfers/release", tag: "pos-ach-transfer-controller", pathParams: false, body: true },
    { id: "reject", method: "POST", path: "/api/v1/admin/pos/ach-transfers/reject", tag: "pos-ach-transfer-controller", pathParams: false, body: true },
    { id: "getProductDashboardInfo", method: "GET", path: "/api/v1/product/dashboard/pos", tag: "product-dashboard-controller", pathParams: false, body: false },
    { id: "getAdminPosDashboard", method: "GET", path: "/api/v1/product/dashboard/admin/pos", tag: "product-dashboard-controller", pathParams: false, body: false },
    { id: "getMyTransactions", method: "GET", path: "/api/v1/pos/transactions", tag: "pos-transaction-controller", pathParams: false, body: false },
    { id: "getMyTransactions_1", method: "GET", path: "/api/v1/pos/transactions/terminals/{terminalId}", tag: "pos-transaction-controller", pathParams: true, body: false },
    { id: "getAll", method: "GET", path: "/api/v1/pos/orders", tag: "pos-order-controller", pathParams: false, body: false },
    { id: "getByOrderReference", method: "GET", path: "/api/v1/pos/orders/{orderReference}", tag: "pos-order-controller", pathParams: true, body: false },
    { id: "viewTimeline", method: "GET", path: "/api/v1/pos/orders/{orderReference}/timeline", tag: "pos-order-controller", pathParams: true, body: false },
    { id: "getPOS", method: "GET", path: "/api/v1/pos/orders/my-order", tag: "pos-order-controller", pathParams: false, body: false },
    { id: "downloadAttachment", method: "GET", path: "/api/v1/pos/orders/my-order/attachments/{attachmentToken}/download", tag: "pos-order-controller", pathParams: true, body: false },
    { id: "export", method: "GET", path: "/api/v1/pos/orders/export", tag: "pos-order-controller", pathParams: false, body: false },
    { id: "downloadAttachmentByAdmin", method: "GET", path: "/api/v1/pos/orders/attachments/{attachmentToken}/download", tag: "pos-order-controller", pathParams: true, body: false },
    { id: "getMyLedgerByWalletReference", method: "GET", path: "/api/v1/pos/ledger/wallets/{walletReference}", tag: "pos-ledger-controller", pathParams: true, body: false },
    { id: "getMyLedgerByTerminalId", method: "GET", path: "/api/v1/pos/ledger/terminals/{terminalId}", tag: "pos-ledger-controller", pathParams: true, body: false },
    { id: "getAllDevices", method: "GET", path: "/api/v1/pos/devices", tag: "po-s-device-controller", pathParams: false, body: false },
    { id: "getMyDevices", method: "GET", path: "/api/v1/pos/devices/my", tag: "po-s-device-controller", pathParams: false, body: false },
    { id: "getAll_2", method: "GET", path: "/api/v1/cards", tag: "cards-controller", pathParams: false, body: false },
    { id: "getById", method: "GET", path: "/api/v1/cards/{id}/details", tag: "cards-controller", pathParams: true, body: false },
    { id: "getAllRequests", method: "GET", path: "/api/v1/cards/requests", tag: "cards-controller", pathParams: false, body: false },
    { id: "getRequestById", method: "GET", path: "/api/v1/cards/requests/{id}", tag: "cards-controller", pathParams: true, body: false },
    { id: "getPeriods", method: "GET", path: "/api/v1/cards/periods", tag: "lookup-controller", pathParams: false, body: false },
    { id: "getCardRequestByProfileId", method: "GET", path: "/api/v1/cards/my-requests", tag: "cards-controller", pathParams: false, body: false },
    { id: "getMyCards", method: "GET", path: "/api/v1/cards/my-cards", tag: "cards-controller", pathParams: false, body: false },
    { id: "countries", method: "GET", path: "/api/v1/cards/countries", tag: "lookup-controller", pathParams: false, body: false },
    { id: "getCountryByCode", method: "GET", path: "/api/v1/cards/countries/{code}", tag: "lookup-controller", pathParams: true, body: false },
    { id: "countriesInternational", method: "GET", path: "/api/v1/cards/countries/international", tag: "lookup-controller", pathParams: false, body: false },
    { id: "getCardSchemes", method: "GET", path: "/api/v1/cards/card-schemes", tag: "lookup-controller", pathParams: false, body: false },
    { id: "getAll_5", method: "GET", path: "/api/v1/admin/pos/transactions", tag: "pos-admin-transaction-controller", pathParams: false, body: false },
    { id: "getAll_6", method: "GET", path: "/api/v1/admin/pos/ledger", tag: "pos-ledger-admin-controller", pathParams: false, body: false },
    { id: "getAll_7", method: "GET", path: "/api/v1/admin/pos/ach-transfers", tag: "pos-ach-transfer-controller", pathParams: false, body: false },
    { id: "delete", method: "DELETE", path: "/api/v1/cards/{id}", tag: "cards-controller", pathParams: true, body: false },
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
