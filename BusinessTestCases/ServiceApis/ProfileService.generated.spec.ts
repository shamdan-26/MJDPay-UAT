import { test, expect } from '@playwright/test';

/**
 * Emi Profile Service — generated API scaffold (OpenAPI 3.1.0).
 * 160 operations. Source: /profile-service/v3/api-docs at the UAT gateway swagger-ui.
 *
 * Every operation below is a traceable placeholder — skipped pending request
 * fixtures and curated assertions, the same "coverage tracked, not yet runnable"
 * pattern as Reconciliation/ and TransactionOperations/. The generated Postman
 * collection postman/ProfileService-API-majdpay.postman_collection.json is the
 * companion for manual/exploratory runs.
 *
 * These tests register only when SERVICE_API_SCAFFOLD=true (to list them) or
 * SERVICE_API_SMOKE=true (to run the unauthenticated-rejection checks live).
 * API_BASE_URL defaults to dev — never point it at prod.
 */

const SERVICE_SLUG = "profile-service";
const SERVICE_BASE_PATH = "/profile-service";
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
    { id: "getByEmail", method: "GET", path: "/profiles/external", tag: "external-profile-controller", pathParams: false, body: false },
    { id: "changeStatus", method: "PUT", path: "/profiles/external", tag: "external-profile-controller", pathParams: false, body: false },
    { id: "createExternalParty", method: "POST", path: "/profiles/external", tag: "external-profile-controller", pathParams: false, body: true },
    { id: "deleteExternalProfile", method: "DELETE", path: "/profiles/external", tag: "external-profile-controller", pathParams: false, body: false },
    { id: "unLockStaffUser", method: "PUT", path: "/profiles/admin/staff/{staffCode}/unlock", tag: "admin-staff-profile-controller", pathParams: true, body: false },
    { id: "reassignAdminStaffProfile", method: "PUT", path: "/profiles/admin/staff/{staffCode}/reassign", tag: "admin-staff-profile-controller", pathParams: true, body: true },
    { id: "deActiveStaffUser", method: "PUT", path: "/profiles/admin/staff/{staffCode}/deactivate", tag: "admin-staff-profile-controller", pathParams: true, body: false },
    { id: "activeStaffUser", method: "PUT", path: "/profiles/admin/staff/{staffCode}/activate", tag: "admin-staff-profile-controller", pathParams: true, body: false },
    { id: "verifyEmail", method: "PUT", path: "/api/v1/verify-email", tag: "email-verification-controller", pathParams: false, body: true },
    { id: "updateEmail", method: "PUT", path: "/api/v1/update-email", tag: "email-verification-controller", pathParams: false, body: false },
    { id: "disApproveUser", method: "PUT", path: "/api/v1/profiles/{profileCode}/disapprove", tag: "profile-controller", pathParams: true, body: false },
    { id: "deactivateUser", method: "PUT", path: "/api/v1/profiles/{profileCode}/deactivate", tag: "profile-controller", pathParams: true, body: false },
    { id: "approveUser", method: "PUT", path: "/api/v1/profiles/{profileCode}/approve", tag: "profile-controller", pathParams: true, body: false },
    { id: "activateUser", method: "PUT", path: "/api/v1/profiles/{profileCode}/activate", tag: "profile-controller", pathParams: true, body: false },
    { id: "unLockStaffUser_1", method: "PUT", path: "/api/v1/profiles/staff/{profileCode}/unlock", tag: "business-staff-profile-controller", pathParams: true, body: false },
    { id: "reassignBusinessStaffProfile", method: "PUT", path: "/api/v1/profiles/staff/{profileCode}/reassign", tag: "business-staff-profile-controller", pathParams: true, body: true },
    { id: "lockStaffUser", method: "PUT", path: "/api/v1/profiles/staff/{profileCode}/lock", tag: "business-staff-profile-controller", pathParams: true, body: false },
    { id: "deActiveStaffUser_1", method: "PUT", path: "/api/v1/profiles/staff/{profileCode}/deactivate", tag: "business-staff-profile-controller", pathParams: true, body: false },
    { id: "activeStaffUser_1", method: "PUT", path: "/api/v1/profiles/staff/{profileCode}/activate", tag: "business-staff-profile-controller", pathParams: true, body: false },
    { id: "getProductByCode", method: "GET", path: "/api/v1/products/admin/{product-code}", tag: "product-controller", pathParams: true, body: false },
    { id: "updateProduct", method: "PUT", path: "/api/v1/products/admin/{product-code}", tag: "product-controller", pathParams: true, body: true },
    { id: "deleteProduct", method: "DELETE", path: "/api/v1/products/admin/{product-code}", tag: "product-controller", pathParams: true, body: false },
    { id: "deactivateProduct", method: "PUT", path: "/api/v1/products/admin/{product-code}/deactivate", tag: "product-controller", pathParams: true, body: false },
    { id: "setProductComingSoon", method: "PUT", path: "/api/v1/products/admin/{product-code}/coming-soon", tag: "product-controller", pathParams: true, body: false },
    { id: "activateProduct", method: "PUT", path: "/api/v1/products/admin/{product-code}/activate", tag: "product-controller", pathParams: true, body: false },
    { id: "updateFeeTier", method: "PUT", path: "/api/v1/products/admin/fee-tiers/{code}", tag: "fee-tier-controller", pathParams: true, body: true },
    { id: "deleteFeeTier", method: "DELETE", path: "/api/v1/products/admin/fee-tiers/{code}", tag: "fee-tier-controller", pathParams: true, body: false },
    { id: "assignFeeTierToProductFee", method: "PUT", path: "/api/v1/products/admin/fee-tiers/{code}/assign/{productFeeCode}", tag: "fee-tier-controller", pathParams: true, body: false },
    { id: "getProductProductFee", method: "GET", path: "/api/v1/products/admin/fee-structure/{code}", tag: "product-fee-controller", pathParams: true, body: false },
    { id: "updateProductFee", method: "PUT", path: "/api/v1/products/admin/fee-structure/{code}", tag: "product-fee-controller", pathParams: true, body: true },
    { id: "deleteProductProductFee", method: "DELETE", path: "/api/v1/products/admin/fee-structure/{code}", tag: "product-fee-controller", pathParams: true, body: false },
    { id: "assignProductFeeToProduct", method: "PUT", path: "/api/v1/products/admin/fee-structure/{code}/assign/{product-code}", tag: "product-fee-controller", pathParams: true, body: false },
    { id: "updateProfileToDormant", method: "PUT", path: "/api/v1/internal/profiles/{profileCode}/dormant", tag: "internal-profile-controller", pathParams: true, body: false },
    { id: "updateProfileRegistrationRequestStatus", method: "PUT", path: "/api/v1/internal/profiles/{identifier}/status/{profileStatus}", tag: "internal-profile-controller", pathParams: true, body: false },
    { id: "updateRiskLevel", method: "PUT", path: "/api/v1/internal/profiles/risk-level", tag: "internal-profile-controller", pathParams: false, body: true },
    { id: "getById_2", method: "GET", path: "/api/v1/contract-templates/{code}", tag: "contract-template-controller", pathParams: true, body: false },
    { id: "update", method: "PUT", path: "/api/v1/contract-templates/{code}", tag: "contract-template-controller", pathParams: true, body: true },
    { id: "publish", method: "PUT", path: "/api/v1/contract-templates/{code}/publish", tag: "contract-template-controller", pathParams: true, body: false },
    { id: "archive", method: "PUT", path: "/api/v1/contract-templates/{code}/archive", tag: "contract-template-controller", pathParams: true, body: false },
    { id: "getAll", method: "GET", path: "/profiles/admin/staff", tag: "admin-staff-profile-controller", pathParams: false, body: false },
    { id: "createAdminStaffProfile", method: "POST", path: "/profiles/admin/staff", tag: "admin-staff-profile-controller", pathParams: false, body: true },
    { id: "generateProfileCode", method: "POST", path: "/migrate-profile-code", tag: "migration-controller", pathParams: false, body: false },
    { id: "resendEmail", method: "POST", path: "/api/v1/resend-email", tag: "email-verification-controller", pathParams: false, body: true },
    { id: "continueRegistration", method: "POST", path: "/api/v1/register", tag: "register-controller", pathParams: false, body: true },
    { id: "verifyOtp", method: "POST", path: "/api/v1/register/verify/otp", tag: "register-controller", pathParams: false, body: true },
    { id: "checkStatus", method: "POST", path: "/api/v1/register/uri/status", tag: "register-controller", pathParams: false, body: true },
    { id: "checkStatusCustomer", method: "POST", path: "/api/v1/register/uri/status/customer", tag: "register-controller", pathParams: false, body: true },
    { id: "refreshRegistrationSession", method: "POST", path: "/api/v1/register/session/refresh", tag: "register-controller", pathParams: false, body: false },
    { id: "initiateRegistration", method: "POST", path: "/api/v1/register/profile-registration-type", tag: "register-controller", pathParams: false, body: true },
    { id: "assignProducts", method: "POST", path: "/api/v1/register/products", tag: "register-controller", pathParams: false, body: true },
    { id: "sendMobileOtp", method: "POST", path: "/api/v1/register/mobile/otp", tag: "register-controller", pathParams: false, body: true },
    { id: "resendMobileOtp", method: "POST", path: "/api/v1/register/mobile/otp/resend", tag: "register-controller", pathParams: false, body: true },
    { id: "registerCustomer", method: "POST", path: "/api/v1/register/customer", tag: "register-controller", pathParams: false, body: true },
    { id: "initiateCustomerRegistration", method: "POST", path: "/api/v1/register/customer/profile-registration-type", tag: "register-controller", pathParams: false, body: true },
    { id: "sendCustomerMobileOtp", method: "POST", path: "/api/v1/register/customer/mobile/otp", tag: "register-controller", pathParams: false, body: true },
    { id: "resendCustomerMobileOtp", method: "POST", path: "/api/v1/register/customer/mobile/otp/resend", tag: "register-controller", pathParams: false, body: true },
    { id: "acceptContract", method: "POST", path: "/api/v1/register/contract/accept", tag: "register-controller", pathParams: false, body: true },
    { id: "blackListProfile", method: "POST", path: "/api/v1/profiles/{unifiedNumber}/black-list", tag: "black-list-profile-controller", pathParams: true, body: false },
    { id: "unBlockProfile", method: "POST", path: "/api/v1/profiles/{profileCode}/unblock", tag: "black-list-profile-controller", pathParams: true, body: false },
    { id: "blockProfile", method: "POST", path: "/api/v1/profiles/{profileCode}/block", tag: "black-list-profile-controller", pathParams: true, body: false },
    { id: "searchBusinessStaffProfiles", method: "GET", path: "/api/v1/profiles/staff", tag: "business-staff-profile-controller", pathParams: false, body: false },
    { id: "createStaffUser", method: "POST", path: "/api/v1/profiles/staff", tag: "business-staff-profile-controller", pathParams: false, body: true },
    { id: "checkNafathStatus", method: "POST", path: "/api/v1/profiles/staff/status", tag: "business-staff-profile-controller", pathParams: false, body: true },
    { id: "getCustomerProfileList", method: "POST", path: "/api/v1/profiles/customer/search", tag: "profile-controller", pathParams: false, body: true },
    { id: "resendOtp", method: "POST", path: "/api/v1/profiles/customer/otp/resend", tag: "profile-otp-controller", pathParams: false, body: true },
    { id: "completeCustomerProfile", method: "POST", path: "/api/v1/profiles/customer/complete/{profileCode}", tag: "profile-controller", pathParams: true, body: false },
    { id: "resendOtp_1", method: "POST", path: "/api/v1/profiles/business/otp/resend", tag: "profile-otp-controller", pathParams: false, body: true },
    { id: "completeBusinessProfile", method: "POST", path: "/api/v1/profiles/business/complete/{profileCode}", tag: "profile-controller", pathParams: true, body: false },
    { id: "sendWathiqRenewalOtp", method: "POST", path: "/api/v1/profile-data/renewal/wathiq/otp", tag: "profile-data-renewal-controller", pathParams: false, body: true },
    { id: "verifyWathiqRenewalOtpAndUpdate", method: "POST", path: "/api/v1/profile-data/renewal/wathiq/otp/verify", tag: "profile-data-renewal-controller", pathParams: false, body: true },
    { id: "checkNafathRenewalStatus", method: "POST", path: "/api/v1/profile-data/renewal/nafath/status", tag: "profile-data-renewal-controller", pathParams: false, body: true },
    { id: "sendNafathRenewalOtp", method: "POST", path: "/api/v1/profile-data/renewal/nafath/otp", tag: "profile-data-renewal-controller", pathParams: false, body: true },
    { id: "verifyNafathRenewalOtp", method: "POST", path: "/api/v1/profile-data/renewal/nafath/otp/verify", tag: "profile-data-renewal-controller", pathParams: false, body: true },
    { id: "submit", method: "POST", path: "/api/v1/products/orders/pos", tag: "product-order-controller", pathParams: false, body: true },
    { id: "assignProduct", method: "POST", path: "/api/v1/products/assign", tag: "user-product-controller", pathParams: false, body: true },
    { id: "createProduct", method: "POST", path: "/api/v1/products/admin", tag: "product-controller", pathParams: false, body: true },
    { id: "addFeeTier", method: "POST", path: "/api/v1/products/admin/fee-tiers", tag: "fee-tier-controller", pathParams: false, body: true },
    { id: "createProductFee", method: "POST", path: "/api/v1/products/admin/fee-structure", tag: "product-fee-controller", pathParams: false, body: true },
    { id: "blackListProfile_1", method: "POST", path: "/api/v1/internal/profiles/{unifiedNumber}/black-list", tag: "black-list-profile-controller", pathParams: true, body: false },
    { id: "getAll_1", method: "GET", path: "/api/v1/contract-templates", tag: "contract-template-controller", pathParams: false, body: false },
    { id: "create", method: "POST", path: "/api/v1/contract-templates", tag: "contract-template-controller", pathParams: false, body: true },
    { id: "deActivateMonthlyIncome", method: "PATCH", path: "/api/v1/monthly-incomes/{code}/deactivate", tag: "monthly-income-controller", pathParams: true, body: false },
    { id: "activateMonthlyIncome", method: "PATCH", path: "/api/v1/monthly-incomes/{code}/activate", tag: "monthly-income-controller", pathParams: true, body: false },
    { id: "deActivateIndustry", method: "PATCH", path: "/api/v1/industries/{code}/deactivate", tag: "industry-controller", pathParams: true, body: false },
    { id: "activateIndustry", method: "PATCH", path: "/api/v1/industries/{code}/activate", tag: "industry-controller", pathParams: true, body: false },
    { id: "deActivateAnnualIncome", method: "PATCH", path: "/api/v1/annual-incomes/{code}/deactivate", tag: "annual-income-controller", pathParams: true, body: false },
    { id: "activateAnnualIncome", method: "PATCH", path: "/api/v1/annual-incomes/{code}/activate", tag: "annual-income-controller", pathParams: true, body: false },
    { id: "getById", method: "GET", path: "/profiles/external/{profileCode}", tag: "external-profile-controller", pathParams: true, body: false },
    { id: "getAllExternalPartyStatus", method: "GET", path: "/profiles/external/statuses", tag: "external-profile-status-controller", pathParams: false, body: false },
    { id: "getAllExternalParty", method: "GET", path: "/profiles/external/q", tag: "external-profile-controller", pathParams: false, body: false },
    { id: "getById_1", method: "GET", path: "/profiles/admin/staff/{staffCode}", tag: "admin-staff-profile-controller", pathParams: true, body: false },
    { id: "getByIdInternal", method: "GET", path: "/internal/profiles/external/{profileCode}", tag: "external-profile-controller", pathParams: true, body: false },
    { id: "getWathiqAddress", method: "GET", path: "/api/v1/register/wathiq/address/{profileCode}", tag: "register-controller", pathParams: true, body: false },
    { id: "getProfileByCode", method: "GET", path: "/api/v1/recipient/{profileCode}", tag: "recipient-controller", pathParams: true, body: false },
    { id: "getProfiles0", method: "GET", path: "/api/v1/profiles", tag: "profile-controller", pathParams: false, body: false },
    { id: "getProfileByCode_1", method: "GET", path: "/api/v1/profiles/{profileCode}", tag: "profile-controller", pathParams: true, body: false },
    { id: "getWathiqInfo", method: "GET", path: "/api/v1/profiles/{profileCode}/wathiq", tag: "profile-controller", pathParams: true, body: false },
    { id: "getNafathInfo", method: "GET", path: "/api/v1/profiles/{profileCode}/nafath", tag: "profile-controller", pathParams: true, body: false },
    { id: "getUserWathiqInfo", method: "GET", path: "/api/v1/profiles/wathiq", tag: "profile-controller", pathParams: false, body: false },
    { id: "getWathiqAddress_1", method: "GET", path: "/api/v1/profiles/wathiq/address", tag: "profile-controller", pathParams: false, body: false },
    { id: "getStaffUser", method: "GET", path: "/api/v1/profiles/staff/{profileCode}", tag: "business-staff-profile-controller", pathParams: true, body: false },
    { id: "getStaffUser_1", method: "GET", path: "/api/v1/profiles/staff/internal/{profileCode}", tag: "business-staff-profile-controller", pathParams: true, body: false },
    { id: "getProfiles", method: "GET", path: "/api/v1/profiles/page", tag: "profile-controller", pathParams: false, body: false },
    { id: "getUserNafathInfo", method: "GET", path: "/api/v1/profiles/nafath", tag: "profile-controller", pathParams: false, body: false },
    { id: "getMerchantProfile", method: "GET", path: "/api/v1/profiles/merchant/{unifiedNumber}", tag: "profile-controller", pathParams: true, body: false },
    { id: "getProfileByUnifiedNumber", method: "GET", path: "/api/v1/profiles/integration/{unifiedNumber}", tag: "integration-profile-controller", pathParams: true, body: false },
    { id: "getCustomerTotals", method: "GET", path: "/api/v1/profiles/customers/count", tag: "profile-controller", pathParams: false, body: false },
    { id: "getCustomerProfileByMobileNumber", method: "GET", path: "/api/v1/profiles/customer/{mobileNumber}/mobile-number", tag: "profile-controller", pathParams: true, body: false },
    { id: "getCustomerProfileByToken", method: "GET", path: "/api/v1/profiles/customer/self", tag: "profile-controller", pathParams: false, body: false },
    { id: "getCustomerProfiles", method: "GET", path: "/api/v1/profiles/customer/page", tag: "profile-controller", pathParams: false, body: false },
    { id: "adminGetProfileById", method: "GET", path: "/api/v1/profiles/by-admin/{profileCode}", tag: "profile-controller", pathParams: true, body: false },
    { id: "getTotals", method: "GET", path: "/api/v1/profiles/businesses/count", tag: "profile-controller", pathParams: false, body: false },
    { id: "getProfileByUnifiedNumber_1", method: "GET", path: "/api/v1/profiles/business/{unifiedNumber}", tag: "profile-controller", pathParams: true, body: false },
    { id: "getProfileByToken", method: "GET", path: "/api/v1/profiles/business/self", tag: "profile-controller", pathParams: false, body: false },
    { id: "getBusinessProfiles", method: "GET", path: "/api/v1/profiles/business/pag", tag: "profile-controller", pathParams: false, body: false },
    { id: "getAdminProfile", method: "GET", path: "/api/v1/profiles/admin/self", tag: "admin-profile-controller", pathParams: false, body: false },
    { id: "getAllProfileTypes", method: "GET", path: "/api/v1/profile-types", tag: "profile-type-controller", pathParams: false, body: false },
    { id: "getProfileType", method: "GET", path: "/api/v1/profile-types/{profileTypeCode}", tag: "profile-type-controller", pathParams: true, body: false },
    { id: "getAllBusinessProfileTypes", method: "GET", path: "/api/v1/profile-types/business", tag: "profile-type-controller", pathParams: false, body: false },
    { id: "getAllProducts", method: "GET", path: "/api/v1/products", tag: "product-controller", pathParams: false, body: false },
    { id: "getMyProducts", method: "GET", path: "/api/v1/products/my-product", tag: "user-product-controller", pathParams: false, body: false },
    { id: "getAllProducts_1", method: "GET", path: "/api/v1/products/all-products", tag: "user-product-controller", pathParams: false, body: false },
    { id: "getProductsByProfileCode", method: "GET", path: "/api/v1/products/admin/profile/{profile-code}", tag: "product-controller", pathParams: true, body: false },
    { id: "getTiersByProductFeeCode", method: "GET", path: "/api/v1/products/admin/fee-tiers/fee-structure/{code}", tag: "fee-tier-controller", pathParams: true, body: false },
    { id: "getProductAduitLog", method: "GET", path: "/api/v1/products/admin/audit-log/{product-code}", tag: "product-audit-log-controller", pathParams: true, body: false },
    { id: "getAllMonthlyIncomes", method: "GET", path: "/api/v1/monthly-incomes", tag: "monthly-income-controller", pathParams: false, body: false },
    { id: "getMonthlyIncomeById", method: "GET", path: "/api/v1/monthly-incomes/{id}", tag: "monthly-income-controller", pathParams: true, body: false },
    { id: "getMonthlyIncomeByCode", method: "GET", path: "/api/v1/monthly-incomes/q", tag: "monthly-income-controller", pathParams: false, body: false },
    { id: "getAllProductTypes", method: "GET", path: "/api/v1/lookups/product-types", tag: "product-type-controller", pathParams: false, body: false },
    { id: "getAllProductStatuses", method: "GET", path: "/api/v1/lookups/product-statuses", tag: "product-status-controller", pathParams: false, body: false },
    { id: "getAllUserProductStatuses", method: "GET", path: "/api/v1/lookups/product-statuses/profile", tag: "product-status-controller", pathParams: false, body: false },
    { id: "getAllFeeTypes", method: "GET", path: "/api/v1/lookups/fee-types", tag: "fee-type-controller", pathParams: false, body: false },
    { id: "getAllBillingCycles", method: "GET", path: "/api/v1/lookups/billing-cycles", tag: "billing-cycle-controller", pathParams: false, body: false },
    { id: "getSuperProfileCode", method: "GET", path: "/api/v1/internal/super-profiles/{profileCode}", tag: "internal-profile-controller", pathParams: true, body: false },
    { id: "getProfile", method: "GET", path: "/api/v1/internal/profiles/{profileCode}", tag: "internal-profile-controller", pathParams: true, body: false },
    { id: "verifyProfileStatus", method: "GET", path: "/api/v1/internal/profiles/{profileCode}/status/verify", tag: "internal-profile-controller", pathParams: true, body: false },
    { id: "getBusinessProfileByUnifiedNumber", method: "GET", path: "/api/v1/internal/profiles/unifiedNumber/{unifiedNumber}", tag: "internal-profile-controller", pathParams: true, body: false },
    { id: "getMerchantProfile_1", method: "GET", path: "/api/v1/internal/profiles/merchant/{unifiedNumber}", tag: "internal-profile-controller", pathParams: true, body: false },
    { id: "getCustomerProfile", method: "GET", path: "/api/v1/internal/profiles/customer/{profileCode}", tag: "internal-profile-controller", pathParams: true, body: false },
    { id: "getBusinessProfile", method: "GET", path: "/api/v1/internal/profiles/business/{profileCode}", tag: "internal-profile-controller", pathParams: true, body: false },
    { id: "getAdminProfileByCode", method: "GET", path: "/api/v1/internal/profiles/admin/{profileCode}", tag: "admin-profile-controller", pathParams: true, body: false },
    { id: "getGenericProfile", method: "GET", path: "/api/v1/internal/generic-profiles/{profileCode}", tag: "internal-profile-controller", pathParams: true, body: false },
    { id: "getAllIndustries", method: "GET", path: "/api/v1/industries", tag: "industry-controller", pathParams: false, body: false },
    { id: "getIndustryById", method: "GET", path: "/api/v1/industries/{id}", tag: "industry-controller", pathParams: true, body: false },
    { id: "getIndustryByCode", method: "GET", path: "/api/v1/industries/q", tag: "industry-controller", pathParams: false, body: false },
    { id: "getContracts", method: "GET", path: "/api/v1/contracts", tag: "signed-contracts-controller", pathParams: false, body: false },
    { id: "adminPreviewContract", method: "GET", path: "/api/v1/contracts/{profileCode}/preview", tag: "signed-contracts-controller", pathParams: true, body: false },
    { id: "downloadContract", method: "GET", path: "/api/v1/contracts/{profileCode}/download", tag: "signed-contracts-controller", pathParams: true, body: false },
    { id: "previewContract", method: "GET", path: "/api/v1/contracts/preview", tag: "signed-contracts-controller", pathParams: false, body: false },
    { id: "getMyContracts", method: "GET", path: "/api/v1/contracts/my", tag: "signed-contracts-controller", pathParams: false, body: false },
    { id: "previewMyContract", method: "GET", path: "/api/v1/contracts/my/preview", tag: "signed-contracts-controller", pathParams: false, body: false },
    { id: "downloadMyContracts", method: "GET", path: "/api/v1/contracts/my/download", tag: "signed-contracts-controller", pathParams: false, body: false },
    { id: "generateContractFile", method: "GET", path: "/api/v1/contracts/generate-file", tag: "signed-contracts-controller", pathParams: false, body: false },
    { id: "findAllPlaceholders", method: "GET", path: "/api/v1/contract-templates/placeholders", tag: "contract-template-controller", pathParams: false, body: false },
    { id: "findAllPersonas", method: "GET", path: "/api/v1/contract-templates/personas", tag: "contract-template-controller", pathParams: false, body: false },
    { id: "getAllAnnualIncomes", method: "GET", path: "/api/v1/annual-incomes", tag: "annual-income-controller", pathParams: false, body: false },
    { id: "getAnnualIncomeById", method: "GET", path: "/api/v1/annual-incomes/{id}", tag: "annual-income-controller", pathParams: true, body: false },
    { id: "getAnnualIncomeByCode", method: "GET", path: "/api/v1/annual-incomes/q", tag: "annual-income-controller", pathParams: false, body: false },
    { id: "getAllAllowedRegisterProfileTypes", method: "GET", path: "/api/v1/allowed-register-profile-types", tag: "allowed-register-profile-type-controller", pathParams: false, body: false },
    { id: "getAllowedRegisterProfileTypeByCode", method: "GET", path: "/api/v1/allowed-register-profile-types/{code}", tag: "allowed-register-profile-type-controller", pathParams: true, body: false },
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
