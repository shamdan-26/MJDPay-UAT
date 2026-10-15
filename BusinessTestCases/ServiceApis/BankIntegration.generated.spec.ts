import { test, expect } from '@playwright/test';

/**
 * Anb Bank Integration Service — generated API scaffold (OpenAPI 3.1.0).
 * 53 operations. Source: /bank-integration/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/BankIntegration-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "bank-integration";
const SERVICE_BASE_PATH = "/bank-integration";
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
    { id: "deactivate", method: "PUT", path: "/api/v1/partner-banks/{id}/deactivate", tag: "partner-bank-controller", pathParams: true, body: false },
    { id: "activate", method: "PUT", path: "/api/v1/partner-banks/{id}/activate", tag: "partner-bank-controller", pathParams: true, body: false },
    { id: "getPartnerBankTransferFee", method: "GET", path: "/api/v1/partner-banks/transfer-fees/{id}", tag: "partner-bank-transfer-fee-controller", pathParams: true, body: false },
    { id: "update", method: "PUT", path: "/api/v1/partner-banks/transfer-fees/{id}", tag: "partner-bank-transfer-fee-controller", pathParams: true, body: true },
    { id: "delete_1", method: "DELETE", path: "/api/v1/partner-banks/transfer-fees/{id}", tag: "partner-bank-transfer-fee-controller", pathParams: true, body: false },
    { id: "setDefaultBank", method: "PUT", path: "/api/v1/partner-banks/default/{swiftCode}", tag: "partner-bank-controller", pathParams: true, body: false },
    { id: "getBank", method: "GET", path: "/api/v1/lookups/banks/{id}", tag: "bank-controller", pathParams: true, body: false },
    { id: "updateBank", method: "PUT", path: "/api/v1/lookups/banks/{id}", tag: "bank-controller", pathParams: true, body: true },
    { id: "deleteBank", method: "DELETE", path: "/api/v1/lookups/banks/{id}", tag: "bank-controller", pathParams: true, body: false },
    { id: "payPayment", method: "POST", path: "/api/v1/payment", tag: "payment-controller", pathParams: false, body: true },
    { id: "getPayment", method: "POST", path: "/api/v1/payment/{bank-bic}/{id}", tag: "payment-controller", pathParams: true, body: false },
    { id: "getPartnerBanks", method: "GET", path: "/api/v1/partner-banks", tag: "partner-bank-controller", pathParams: false, body: false },
    { id: "create", method: "POST", path: "/api/v1/partner-banks", tag: "partner-bank-controller", pathParams: false, body: true },
    { id: "getPartnerBankTransferFees", method: "GET", path: "/api/v1/partner-banks/transfer-fees", tag: "partner-bank-transfer-fee-controller", pathParams: false, body: false },
    { id: "create_1", method: "POST", path: "/api/v1/partner-banks/transfer-fees", tag: "partner-bank-transfer-fee-controller", pathParams: false, body: true },
    { id: "otcCallback", method: "POST", path: "/api/v1/otc-callback", tag: "otc-callback-controller", pathParams: false, body: true },
    { id: "getAllBanks", method: "GET", path: "/api/v1/lookups/banks", tag: "bank-controller", pathParams: false, body: false },
    { id: "createBank", method: "POST", path: "/api/v1/lookups/banks", tag: "bank-controller", pathParams: false, body: true },
    { id: "uploadBankFeesFile", method: "POST", path: "/api/v1/bank-fees/upload", tag: "file-generator-controller", pathParams: false, body: true },
    { id: "getBankViolationByCode", method: "GET", path: "/bank-violations/{code}", tag: "bank-violation-controller", pathParams: true, body: false },
    { id: "transactionCheck", method: "GET", path: "/bank-violations/transaction/{customerId}", tag: "bank-check-controller", pathParams: true, body: false },
    { id: "check", method: "GET", path: "/bank-violations/registration/{customerId}", tag: "bank-check-controller", pathParams: true, body: false },
    { id: "getBankViolationByCodeBulk", method: "GET", path: "/bank-violations/bulk", tag: "bank-violation-controller", pathParams: false, body: false },
    { id: "getPartnerBank", method: "GET", path: "/api/v1/partner-banks/{id}", tag: "partner-bank-controller", pathParams: true, body: false },
    { id: "delete", method: "DELETE", path: "/api/v1/partner-banks/{id}", tag: "partner-bank-controller", pathParams: true, body: false },
    { id: "generatePartnerBankValidationReport", method: "GET", path: "/api/v1/partner-banks/{id}/deactivate/deactivate-report", tag: "partner-bank-controller", pathParams: true, body: false },
    { id: "getAllPartnerBankBySwiftCodes", method: "GET", path: "/api/v1/partner-banks/swifts", tag: "partner-bank-controller", pathParams: false, body: false },
    { id: "getPartnerBankBySwiftCode", method: "GET", path: "/api/v1/partner-banks/swift/{swiftCode}", tag: "partner-bank-controller", pathParams: true, body: false },
    { id: "getPartnerBankByIbanInternal", method: "GET", path: "/api/v1/partner-banks/iban", tag: "partner-bank-controller", pathParams: false, body: false },
    { id: "getDefaultPartnerBank", method: "GET", path: "/api/v1/partner-banks/default", tag: "partner-bank-controller", pathParams: false, body: false },
    { id: "getDefaultPartnerBank_1", method: "GET", path: "/api/v1/partner-banks/default/internally", tag: "partner-bank-controller", pathParams: false, body: false },
    { id: "getActivePartnerBanks", method: "GET", path: "/api/v1/partner-banks/active", tag: "partner-bank-controller", pathParams: false, body: false },
    { id: "PurposeTransferCodes", method: "GET", path: "/api/v1/lookup/purpose-transfer", tag: "lookup-controller", pathParams: false, body: false },
    { id: "getCurrencyById", method: "GET", path: "/api/v1/lookup/currency/{id}", tag: "lookup-controller", pathParams: true, body: false },
    { id: "getAllCurrencies", method: "GET", path: "/api/v1/lookup/currencies", tag: "lookup-controller", pathParams: false, body: false },
    { id: "getCurrencies", method: "GET", path: "/api/v1/lookup/currencies/{countryId}", tag: "lookup-controller", pathParams: true, body: false },
    { id: "countries", method: "GET", path: "/api/v1/lookup/countries", tag: "lookup-controller", pathParams: false, body: false },
    { id: "getCountryByCode", method: "GET", path: "/api/v1/lookup/countries/{code}", tag: "lookup-controller", pathParams: true, body: false },
    { id: "countriesInternational", method: "GET", path: "/api/v1/lookup/countries/international", tag: "lookup-controller", pathParams: false, body: false },
    { id: "bankCodes", method: "GET", path: "/api/v1/lookup/banks", tag: "lookup-controller", pathParams: false, body: false },
    { id: "getBankByBIC", method: "GET", path: "/api/v1/lookup/banks/{bic}", tag: "lookup-controller", pathParams: true, body: false },
    { id: "getBankById", method: "GET", path: "/api/v1/lookup/banks/ids/{id}", tag: "lookup-controller", pathParams: true, body: false },
    { id: "runPosPayments", method: "GET", path: "/api/v1/job/pos-payments", tag: "job-starter-controller", pathParams: false, body: false },
    { id: "runIncomingBankStatements", method: "GET", path: "/api/v1/job/incoming-bank-statements", tag: "job-starter-controller", pathParams: false, body: false },
    { id: "runIncomingBankPayments", method: "GET", path: "/api/v1/job/incoming-bank-payments", tag: "job-starter-controller", pathParams: false, body: false },
    { id: "getBankTransactions", method: "GET", path: "/api/v1/job/bank-transactions", tag: "job-starter-controller", pathParams: false, body: false },
    { id: "getAccountBalance", method: "GET", path: "/api/v1/job/account-balance", tag: "job-starter-controller", pathParams: false, body: false },
    { id: "getPartnerBankTransferFees_1", method: "GET", path: "/api/v1/internal/partner-banks/transfer-fees", tag: "internal-partner-bank-controller", pathParams: false, body: false },
    { id: "getPartnerBankCodes", method: "GET", path: "/api/v1/internal/partner-banks/codes", tag: "internal-partner-bank-controller", pathParams: false, body: false },
    { id: "getEndOfDayStatements", method: "GET", path: "/api/v1/internal/end-of-day-statements", tag: "internal-end-of-day-statement-controller", pathParams: false, body: false },
    { id: "generateIban", method: "GET", path: "/api/v1/iban", tag: "iban-generator-controller", pathParams: false, body: false },
    { id: "ingest", method: "GET", path: "/api/v1/bts/statement", tag: "bts-controller", pathParams: false, body: false },
    { id: "generateExcelSheet", method: "GET", path: "/api/v1/bank-fees/generate/excel", tag: "file-generator-controller", pathParams: false, body: false },
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
