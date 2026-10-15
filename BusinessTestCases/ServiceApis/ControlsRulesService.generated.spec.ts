import { test, expect } from '@playwright/test';

/**
 * Controls Rules Service — generated API scaffold (OpenAPI 3.1.0).
 * 16 operations. Source: /controls-rules-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/ControlsRulesService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "controls-rules-service";
const SERVICE_BASE_PATH = "/controls-rules-service";
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
    { id: "setWalletControls", method: "POST", path: "/api/v1/wallet-config/{walletCode}/configuration", tag: "wallet-controls-controller", pathParams: true, body: true },
    { id: "setSubWalletControls", method: "POST", path: "/api/v1/wallet-config/sub-wallet/{walletCode}/configuration", tag: "wallet-controls-controller", pathParams: true, body: true },
    { id: "copyWalletControls", method: "POST", path: "/api/v1/internal/wallet-config/copy", tag: "internal-wallet-controls-controller", pathParams: false, body: true },
    { id: "getAllCountries", method: "GET", path: "/api/v1/countries", tag: "country-controller", pathParams: false, body: false },
    { id: "createCountry", method: "POST", path: "/api/v1/countries", tag: "country-controller", pathParams: false, body: true },
    { id: "getWalletControls", method: "GET", path: "/api/v1/wallet-config/{walletCode}", tag: "wallet-controls-controller", pathParams: true, body: false },
    { id: "getAllMerchantCategoryCode", method: "GET", path: "/api/v1/merchant-category-code", tag: "merchant-category-code-controller", pathParams: false, body: false },
    { id: "getMerchantCategoryCodeByCode", method: "GET", path: "/api/v1/merchant-category-code/{code}", tag: "merchant-category-code-controller", pathParams: true, body: false },
    { id: "getWalletControls_1", method: "GET", path: "/api/v1/internal/wallet-config/{walletCode}", tag: "internal-wallet-controls-controller", pathParams: true, body: false },
    { id: "getDefaultLimitations", method: "GET", path: "/api/v1/default-limitations/wallet", tag: "default-wallet-limitation-controller", pathParams: false, body: false },
    { id: "getDefaultTransactionLimitations", method: "GET", path: "/api/v1/default-limitations/transaction", tag: "default-wallet-limitation-controller", pathParams: false, body: false },
    { id: "getSubWalletDefaultLimitations", method: "GET", path: "/api/v1/default-limitations/sub-wallet", tag: "default-wallet-limitation-controller", pathParams: false, body: false },
    { id: "getCountryByCode", method: "GET", path: "/api/v1/countries/{code}", tag: "country-controller", pathParams: true, body: false },
    { id: "deleteCountry", method: "DELETE", path: "/api/v1/countries/{code}", tag: "country-controller", pathParams: true, body: false },
    { id: "getAllChannels", method: "GET", path: "/api/v1/channels", tag: "channel-controller", pathParams: false, body: false },
    { id: "getChannelByCode", method: "GET", path: "/api/v1/channels/{code}", tag: "channel-controller", pathParams: true, body: false },
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
