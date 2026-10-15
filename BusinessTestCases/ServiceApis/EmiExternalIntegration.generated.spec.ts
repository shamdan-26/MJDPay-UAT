import { test, expect } from '@playwright/test';

/**
 * External Integration — generated API scaffold (OpenAPI 3.0.1).
 * 53 operations. Source: /emi-external-integration/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/EmiExternalIntegration-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "emi-external-integration";
const SERVICE_BASE_PATH = "/emi-external%20integration";
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
    { id: "findById", method: "GET", path: "/external/api/v1/provider-configs/{providerName}", tag: "provider-config-controller", pathParams: true, body: false },
    { id: "updateConfiguration", method: "PUT", path: "/external/api/v1/provider-configs/{providerName}", tag: "provider-config-controller", pathParams: true, body: true },
    { id: "updateServiceProvider", method: "PUT", path: "/api/v1/admin/provider/{id}", tag: "admin-controller", pathParams: true, body: true },
    { id: "deleteServiceProvider", method: "DELETE", path: "/api/v1/admin/provider/{id}", tag: "admin-controller", pathParams: true, body: false },
    { id: "getNafathStatus", method: "POST", path: "/status", tag: "nafath-controller", pathParams: false, body: true },
    { id: "sendSms", method: "POST", path: "/sms", tag: "sms-controller", pathParams: false, body: true },
    { id: "generateCheckoutId", method: "POST", path: "/payment/checkout-id", tag: "hyperpay-controller", pathParams: false, body: true },
    { id: "verifyCustomerAccount", method: "POST", path: "/lean/verify-account/customer", tag: "lean-controller", pathParams: false, body: false },
    { id: "verifyBusinessAccount", method: "POST", path: "/lean/verify-account/business", tag: "lean-controller", pathParams: false, body: false },
    { id: "getNafathStatus_1", method: "POST", path: "/external/v2/status", tag: "nafath-v-2-controller", pathParams: false, body: true },
    { id: "receiveNafathData", method: "POST", path: "/external/api/v2/nafath/callback", tag: "nafath-v-2-callback-controller", pathParams: false, body: true },
    { id: "receive", method: "POST", path: "/api/v1/webhooks/mozn", tag: "mozn-webhook-controller", pathParams: false, body: true },
    { id: "receiveNafathData_1", method: "POST", path: "/api/v1/nafath/callback", tag: "nafath-callback-controller", pathParams: false, body: true },
    { id: "evaluateTrustDevice", method: "POST", path: "/api/v1/mozn/events/trust-device", tag: "mozn-controller", pathParams: false, body: true },
    { id: "evaluateRegister", method: "POST", path: "/api/v1/mozn/events/register", tag: "mozn-controller", pathParams: false, body: true },
    { id: "evaluateProfileUpdate", method: "POST", path: "/api/v1/mozn/events/profile-update", tag: "mozn-controller", pathParams: false, body: true },
    { id: "evaluatePasswordReset", method: "POST", path: "/api/v1/mozn/events/password-reset", tag: "mozn-controller", pathParams: false, body: true },
    { id: "evaluateNewBeneficiary", method: "POST", path: "/api/v1/mozn/events/new-beneficiary", tag: "mozn-controller", pathParams: false, body: true },
    { id: "evaluateLogin", method: "POST", path: "/api/v1/mozn/events/login", tag: "mozn-controller", pathParams: false, body: true },
    { id: "evaluateFundsTransfer", method: "POST", path: "/api/v1/internal/mozn/funds-transfer", tag: "mozn-controller", pathParams: false, body: true },
    { id: "payment", method: "POST", path: "/api/v1/anb/payment", tag: "anb-bank-controller", pathParams: false, body: true },
    { id: "channel", method: "POST", path: "/api/v1/anb/channel", tag: "anb-bank-controller", pathParams: false, body: true },
    { id: "findAllServiceProviderLookup", method: "GET", path: "/api/v1/admin/provider", tag: "admin-controller", pathParams: false, body: false },
    { id: "createServiceProvider", method: "POST", path: "/api/v1/admin/provider", tag: "admin-controller", pathParams: false, body: true },
    { id: "ws3Aml", method: "POST", path: "/aml/ws3", tag: "aml-controller", pathParams: false, body: true },
    { id: "ws1Aml", method: "POST", path: "/aml/ws1", tag: "aml-controller", pathParams: false, body: true },
    { id: "generateNafathRandomNumber", method: "GET", path: "/random-number", tag: "nafath-controller", pathParams: false, body: false },
    { id: "getPaymentStatus", method: "GET", path: "/payment/{checkoutId}/status", tag: "hyperpay-controller", pathParams: true, body: false },
    { id: "generateViw", method: "GET", path: "/payment/view", tag: "hyperpay-controller", pathParams: false, body: false },
    { id: "verifyMobileNumber", method: "GET", path: "/ownership/mobiles/{mobileNumber}/people/{nationalId}", tag: "mobile-ownership-controller", pathParams: true, body: false },
    { id: "getLogsInfo", method: "GET", path: "/logging/info", tag: "http-logging-controller", pathParams: false, body: false },
    { id: "getNafathJwks", method: "GET", path: "/jwks", tag: "nafath-controller", pathParams: false, body: false },
    { id: "getNafathInfoByTransactionId", method: "GET", path: "/info", tag: "nafath-controller", pathParams: false, body: false },
    { id: "generateNafathRandomNumber_1", method: "GET", path: "/external/v2/random-number", tag: "nafath-v-2-controller", pathParams: false, body: false },
    { id: "getNafathJwks_1", method: "GET", path: "/external/v2/jwks", tag: "nafath-v-2-controller", pathParams: false, body: false },
    { id: "getNafathInfoByTransactionId_1", method: "GET", path: "/external/v2/info", tag: "nafath-v-2-controller", pathParams: false, body: false },
    { id: "commercialRegistration", method: "GET", path: "/external/v2/companies/{crNumber}", tag: "registration-v-2-controller", pathParams: true, body: false },
    { id: "getAddress", method: "GET", path: "/external/v2/companies/address/{unifiedNumber}", tag: "registration-v-2-controller", pathParams: true, body: false },
    { id: "getAll", method: "GET", path: "/external/api/v1/provider-configs", tag: "provider-config-controller", pathParams: false, body: false },
    { id: "convert", method: "GET", path: "/exchange-rate", tag: "exchange-rate-controller", pathParams: false, body: false },
    { id: "commercialRegistration_1", method: "GET", path: "/companies/{crNumber}", tag: "registration-controller", pathParams: true, body: false },
    { id: "getAddress_1", method: "GET", path: "/companies/address/{unifiedNumber}", tag: "registration-controller", pathParams: true, body: false },
    { id: "getPayments", method: "GET", path: "/api/v1/anb/report/payment", tag: "anb-bank-controller", pathParams: false, body: false },
    { id: "getStatement", method: "GET", path: "/api/v1/anb/report/account/statement", tag: "anb-bank-controller", pathParams: false, body: false },
    { id: "getEndOfDayStatements", method: "GET", path: "/api/v1/anb/reconciliation/end-of-day-statements", tag: "anb-bank-reconciliation-controller", pathParams: false, body: false },
    { id: "getEndOfDayStatement", method: "GET", path: "/api/v1/anb/reconciliation/end-of-day-statements/{id}", tag: "anb-bank-reconciliation-controller", pathParams: true, body: false },
    { id: "getBalance", method: "GET", path: "/api/v1/anb/reconciliation/balance", tag: "anb-bank-reconciliation-controller", pathParams: false, body: false },
    { id: "inquiryPayment", method: "GET", path: "/api/v1/anb/inquiry/payment/{id}", tag: "anb-bank-controller", pathParams: true, body: false },
    { id: "getBtsStatement", method: "GET", path: "/api/v1/anb/bts/statement", tag: "bts-controller", pathParams: false, body: false },
    { id: "abcCheck", method: "GET", path: "/api/v1/anb/abc-list/{customerID}", tag: "anb-bank-controller", pathParams: true, body: false },
    { id: "findIntegrationCountByProviderId", method: "GET", path: "/api/v1/admin/provider/{id}/integration-count", tag: "admin-controller", pathParams: true, body: false },
    { id: "findAllIntegrationCount", method: "GET", path: "/api/v1/admin/integration-count", tag: "admin-controller", pathParams: false, body: false },
    { id: "getStatistics", method: "GET", path: "/api/statistics", tag: "statistics-controller", pathParams: false, body: false },
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
