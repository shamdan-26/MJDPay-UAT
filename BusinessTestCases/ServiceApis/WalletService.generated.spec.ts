import { test, expect } from '@playwright/test';

/**
 * Wallet Service — generated API scaffold (OpenAPI 3.1.0).
 * 91 operations. Source: /wallet-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/WalletService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "wallet-service";
const SERVICE_BASE_PATH = "/wallet-service";
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
    { id: "regenerateQrCode", method: "PUT", path: "/qr/regenerate", tag: "qr-controller", pathParams: false, body: false },
    { id: "updateWalletType", method: "PUT", path: "/api/v1/wallet-types/{id}", tag: "wallet-type-controller", pathParams: true, body: true },
    { id: "deleteWalletType", method: "DELETE", path: "/api/v1/wallet-types/{id}", tag: "wallet-type-controller", pathParams: true, body: false },
    { id: "updateWalletCategory", method: "PUT", path: "/api/v1/wallet-categories/{id}", tag: "wallet-category-controller", pathParams: true, body: true },
    { id: "deleteWalletCategory", method: "DELETE", path: "/api/v1/wallet-categories/{id}", tag: "wallet-category-controller", pathParams: true, body: false },
    { id: "regenerateQrCode_1", method: "PUT", path: "/api/v1/sub-wallets/{walletCode}/qr/regenerate", tag: "sub-wallet-controller", pathParams: true, body: false },
    { id: "updateSubWallet", method: "PUT", path: "/api/v1/sub-wallets/{id}", tag: "sub-wallet-controller", pathParams: true, body: true },
    { id: "closeSubWallet", method: "PUT", path: "/api/v1/sub-wallets/{id}/close", tag: "sub-wallet-controller", pathParams: true, body: false },
    { id: "getLimitations_1", method: "GET", path: "/api/v1/limitations/admin-wallet-limitations", tag: "admin-wallet-limitation-controller", pathParams: false, body: false },
    { id: "updateLimitation", method: "PUT", path: "/api/v1/limitations/admin-wallet-limitations", tag: "admin-wallet-limitation-controller", pathParams: false, body: true },
    { id: "consumePaymentLink", method: "PUT", path: "/api/v1/internal/wallets/payment-link/payment-link/{token}/consume", tag: "internal-payment-link-controller", pathParams: true, body: false },
    { id: "isUserAuthorizedOnWallet", method: "GET", path: "/api/v1/wallets/{walletCode}/authorized", tag: "wallet-controller", pathParams: true, body: false },
    { id: "addUserAsAuthorizedUserToWallet", method: "POST", path: "/api/v1/wallets/{walletCode}/authorized", tag: "wallet-controller", pathParams: true, body: true },
    { id: "isUserAdminOnWallet", method: "GET", path: "/api/v1/wallets/{walletCode}/admins", tag: "wallet-controller", pathParams: true, body: false },
    { id: "addUserAsAdminUserToWallet", method: "POST", path: "/api/v1/wallets/{walletCode}/admins", tag: "wallet-controller", pathParams: true, body: true },
    { id: "disablePaymentLink", method: "POST", path: "/api/v1/wallets/payment-links/{paymentLinkId}/disable", tag: "payment-link-controller", pathParams: true, body: false },
    { id: "regenerate", method: "POST", path: "/api/v1/wallets/payment-links/regenerate", tag: "payment-link-controller", pathParams: false, body: true },
    { id: "regenerateWalletCode", method: "POST", path: "/api/v1/wallets/migrate-wallet-code", tag: "migration-controller", pathParams: false, body: false },
    { id: "getWalletTypes", method: "GET", path: "/api/v1/wallet-types", tag: "wallet-type-controller", pathParams: false, body: false },
    { id: "createWalletType", method: "POST", path: "/api/v1/wallet-types", tag: "wallet-type-controller", pathParams: false, body: true },
    { id: "getWalletCategories", method: "GET", path: "/api/v1/wallet-categories", tag: "wallet-category-controller", pathParams: false, body: false },
    { id: "createWalletCategory", method: "POST", path: "/api/v1/wallet-categories", tag: "wallet-category-controller", pathParams: false, body: true },
    { id: "getSubWallets", method: "GET", path: "/api/v1/sub-wallets", tag: "sub-wallet-controller", pathParams: false, body: false },
    { id: "createSubWallet", method: "POST", path: "/api/v1/sub-wallets", tag: "sub-wallet-controller", pathParams: false, body: true },
    { id: "createUserWallet", method: "POST", path: "/api/v1/internal/wallets", tag: "internal-wallet-controller", pathParams: false, body: true },
    { id: "addUserAsAuthorizedUserToWallet_1", method: "POST", path: "/api/v1/internal/wallets/{profileCode}/authorize-user", tag: "internal-wallet-controller", pathParams: true, body: false },
    { id: "addUserAsAdminUserAndAuthorizeToWallet", method: "POST", path: "/api/v1/internal/wallets/{profileCode}/authorize-admin", tag: "internal-wallet-controller", pathParams: true, body: true },
    { id: "addUserAsAdminUser", method: "POST", path: "/api/v1/internal/wallets/{profileCode}/admin-user", tag: "internal-wallet-controller", pathParams: true, body: false },
    { id: "qrScan", method: "GET", path: "/qr/scan", tag: "qr-controller", pathParams: false, body: false },
    { id: "getControlWallets", method: "GET", path: "/controls/internal", tag: "control-wallet-controller", pathParams: false, body: false },
    { id: "getControlWalletByWalletCode", method: "GET", path: "/control-wallets/{wallet-code}/balances/internal", tag: "control-wallet-controller", pathParams: true, body: false },
    { id: "getControlWallet", method: "GET", path: "/control-wallets/{swiftCode}", tag: "control-wallet-controller", pathParams: true, body: false },
    { id: "getAvailableMasterBalance", method: "GET", path: "/balance", tag: "control-wallet-controller", pathParams: false, body: false },
    { id: "getWalletCodeByVIbanInternally", method: "GET", path: "/api/v1/wallets", tag: "wallet-controller", pathParams: false, body: false },
    { id: "getWalletByCodeAndUser", method: "GET", path: "/api/v1/wallets/{walletCode}", tag: "wallet-controller", pathParams: true, body: false },
    { id: "isWalletExistByCodeInternal", method: "GET", path: "/api/v1/wallets/{walletCode}/exist/internal", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getAvailableBalanceInternal", method: "GET", path: "/api/v1/wallets/{walletCode}/balance/internal", tag: "wallet-controller", pathParams: true, body: false },
    { id: "isUserAuthorizedOnWalletInternal", method: "GET", path: "/api/v1/wallets/{walletCode}/authorized/internal/{userId}", tag: "wallet-controller", pathParams: true, body: false },
    { id: "isUserAdminOnWalletInternal", method: "GET", path: "/api/v1/wallets/{walletCode}/admins/internal/{userId}", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getWalletByTypeCode", method: "GET", path: "/api/v1/wallets/wallet-types/{walletTypeCode}/internal", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getWalletByCode", method: "GET", path: "/api/v1/wallets/wallet-codes/{walletCode}", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getProfileByWalletCode", method: "GET", path: "/api/v1/wallets/wallet-codes/{walletCode}/profiles", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getWalletCodeByUserId", method: "GET", path: "/api/v1/wallets/user", tag: "wallet-controller", pathParams: false, body: false },
    { id: "getWalletInternal", method: "GET", path: "/api/v1/wallets/user/internal", tag: "wallet-controller", pathParams: false, body: false },
    { id: "getWalletByProfileId", method: "GET", path: "/api/v1/wallets/profiles/{profileCode}", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getControlWalletByProfileIdInternal", method: "GET", path: "/api/v1/wallets/profiles/{profileCode}/internal", tag: "wallet-controller", pathParams: true, body: false },
    { id: "isWalletExist", method: "GET", path: "/api/v1/wallets/profiles/{profileCode}/exist", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getAllPaymentLinks", method: "GET", path: "/api/v1/wallets/payment-links", tag: "payment-link-controller", pathParams: false, body: false },
    { id: "resolve", method: "GET", path: "/api/v1/wallets/payment-links/pay/{token}", tag: "payment-link-controller", pathParams: true, body: false },
    { id: "getAllUserWallet", method: "GET", path: "/api/v1/wallets/get-all", tag: "wallet-controller", pathParams: false, body: false },
    { id: "getWalletsCount", method: "GET", path: "/api/v1/wallets/count", tag: "wallet-controller", pathParams: false, body: false },
    { id: "isControlWalletExistsByVIban", method: "GET", path: "/api/v1/wallets/control/{vIban}/exists", tag: "wallet-controller", pathParams: true, body: false },
    { id: "isControlWalletExistsBySwiftCode", method: "GET", path: "/api/v1/wallets/control/swift/{swift-code}/exists", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getCollectionWalletBySwiftCode", method: "GET", path: "/api/v1/wallets/control-wallets/{swiftCode}/collection-wallets", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getCollectionWalletBySwiftCodeInternal", method: "GET", path: "/api/v1/wallets/collection-wallets/account-wallet/{swiftCode}/internal", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getWalletCodeByAccountNumberInternally", method: "GET", path: "/api/v1/wallets/by-account-number", tag: "wallet-controller", pathParams: false, body: false },
    { id: "getTotalWalletsBalance", method: "GET", path: "/api/v1/wallets/balances", tag: "wallet-controller", pathParams: false, body: false },
    { id: "getWalletBalance", method: "GET", path: "/api/v1/wallets/balance", tag: "wallet-controller", pathParams: false, body: false },
    { id: "isAccountWalletExistByCodeInternal", method: "GET", path: "/api/v1/wallets/account/{walletCode}/exist/internal", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getAccountWalletsByProfileCode", method: "GET", path: "/api/v1/wallets/account-wallet/{profileCode}", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getUserWalletWithNonZeroBalanceBySwiftCode", method: "GET", path: "/api/v1/wallets/account-wallet/non-zero-balances/internal/{swiftCode}", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getAccountWalletReportData", method: "GET", path: "/api/v1/wallets/account-wallet/non-zero-balances/internal/report/{swiftCode}", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getAccountWalletByWalletCode", method: "GET", path: "/api/v1/wallets/account-wallet/internal/{walletCode}", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getWalletByAccountCode", method: "GET", path: "/api/v1/wallets/account-wallet-codes/{walletCode}", tag: "wallet-controller", pathParams: true, body: false },
    { id: "getWalletTypeByCode", method: "GET", path: "/api/v1/wallet-types/{code}", tag: "wallet-type-controller", pathParams: true, body: false },
    { id: "getUserWalletTypes", method: "GET", path: "/api/v1/wallet-types/user-wallet", tag: "wallet-type-controller", pathParams: false, body: false },
    { id: "getSubWalletTypes", method: "GET", path: "/api/v1/wallet-types/sub-wallets", tag: "wallet-type-controller", pathParams: false, body: false },
    { id: "getCollectionWallets", method: "GET", path: "/api/v1/wallet-types/collection", tag: "wallet-type-controller", pathParams: false, body: false },
    { id: "getWalletTypeByCategoryCode", method: "GET", path: "/api/v1/wallet-types/category/{code}/internally", tag: "wallet-type-controller", pathParams: true, body: false },
    { id: "getWalletTypeByCode_1", method: "GET", path: "/api/v1/wallet-types/account/{walletCode}/internal", tag: "wallet-type-controller", pathParams: true, body: false },
    { id: "getWalletCategoryByCode", method: "GET", path: "/api/v1/wallet-categories/{walletCategoryCode}", tag: "wallet-category-controller", pathParams: true, body: false },
    { id: "getAllWalletTiers", method: "GET", path: "/api/v1/wallet-Tiers", tag: "wallet-tier-controller", pathParams: false, body: false },
    { id: "getWalletTierById", method: "GET", path: "/api/v1/wallet-Tiers/{id}", tag: "wallet-tier-controller", pathParams: true, body: false },
    { id: "getWalletTierByCode", method: "GET", path: "/api/v1/wallet-Tiers/level/{code}", tag: "wallet-tier-controller", pathParams: true, body: false },
    { id: "getSubWalletByCode", method: "GET", path: "/api/v1/sub-wallets/{walletCode}", tag: "sub-wallet-controller", pathParams: true, body: false },
    { id: "getRunningBalanceEntriesByToken", method: "GET", path: "/api/v1/running-balance", tag: "running-balance-controller", pathParams: false, body: false },
    { id: "getRunningBalanceEntries", method: "GET", path: "/api/v1/running-balance/q", tag: "running-balance-controller", pathParams: false, body: false },
    { id: "getAllPeriods", method: "GET", path: "/api/v1/periods", tag: "period-controller", pathParams: false, body: false },
    { id: "getPeriodsById", method: "GET", path: "/api/v1/periods/{id}", tag: "period-controller", pathParams: true, body: false },
    { id: "getPeriodsByCode", method: "GET", path: "/api/v1/periods/q/{code}", tag: "period-controller", pathParams: true, body: false },
    { id: "isValidSourceWalletBalance", method: "GET", path: "/api/v1/limitations/wallet-limitations/user/source", tag: "wallet-limitation-controller", pathParams: false, body: false },
    { id: "isValidDestinationWalletBalance", method: "GET", path: "/api/v1/limitations/wallet-limitations/user/destination", tag: "wallet-limitation-controller", pathParams: false, body: false },
    { id: "getSubWalletDefaultLimitationsInternal", method: "GET", path: "/api/v1/limitations/wallet-limitations/sub-wallet/internal/default", tag: "wallet-limitation-controller", pathParams: false, body: false },
    { id: "getLimitations", method: "GET", path: "/api/v1/limitations/wallet-limitations/internal", tag: "wallet-limitation-controller", pathParams: false, body: false },
    { id: "getDefaultLimitations", method: "GET", path: "/api/v1/limitations/wallet-limitations/internal/default", tag: "wallet-limitation-controller", pathParams: false, body: false },
    { id: "isValidSourceControlWalletBalance", method: "GET", path: "/api/v1/limitations/wallet-limitations/control/source", tag: "wallet-limitation-controller", pathParams: false, body: false },
    { id: "isValidDestinationControlWalletBalance", method: "GET", path: "/api/v1/limitations/wallet-limitations/control/destination", tag: "wallet-limitation-controller", pathParams: false, body: false },
    { id: "isValidCollectionDestinationWalletBalance", method: "GET", path: "/api/v1/limitations/wallet-limitations/collection/destination", tag: "wallet-limitation-controller", pathParams: false, body: false },
    { id: "getVirtualIbanByWalletCodeAndSwiftCode", method: "GET", path: "/api/v1/internal/wallets/wallet-codes/{walletCode}/swift-codes/{swiftCode}/virtual-iban", tag: "internal-wallet-controller", pathParams: true, body: false },
    { id: "getPaymentLink", method: "GET", path: "/api/v1/internal/wallets/payment-link/payment-link/{token}", tag: "internal-payment-link-controller", pathParams: true, body: false },
    { id: "deletePaymentLink", method: "DELETE", path: "/api/v1/wallets/payment-links/{paymentLinkId}", tag: "payment-link-controller", pathParams: true, body: false },
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
