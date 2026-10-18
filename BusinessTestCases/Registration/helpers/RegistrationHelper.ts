// Barrel — the Registration helpers live in ./helpers/*; import from here so specs stay unchanged.
// Grouped by purpose: config → identities → real wizard drivers → mocked drivers → API → DB.

// ── Config: URLs, fixed email, shared valid test data ────────────────────────
export { LOGIN_URL, REGISTER_URL, VALID_EMAIL, VALID_IBAN, VALID_VAT_NUMBER, TEST_FILE_BUFFER, REGISTRATION_EMAIL, generateEmail } from './registrationConfig';

// ── Identities: pre-generated pools + used-flag tracking (data/registrationAssets.json) ──
export { RESIDENT_ASSETS, VALID_CRN, VALID_IQAMA, VALID_MOBILE, AssetAlreadyProgressedError, markCitizenAssetUsed, markResidentAssetUsed, nextCitizenAsset, nextResidentAsset, getFreshResidentAsset, nextMobileReuseResidentAsset, generateKSAMobile, DEV_OTP_ASSETS, nextUatOtpAsset, markUatOtpAssetUsed, generateFreshKSAMobile } from './registrationAssets';
export type { CitizenAssetOutcome, ResidentAssetOutcome } from './registrationAssets';

// ── Real wizard drivers, in wizard order (OTP → Info → Financial → Verification → Products → Contract) ──
export { getOtpFromDb, fillOTP } from './registrationOtp';
export { goToInfoStep, fillBusinessInfo, submitBusinessInfo, isAlreadyRegisteredMessage, goToFinancialStep, goToFinancialStepWithDedicatedAsset, goToVerificationStep, fillFinancialForm, fillVerificationForm } from './registrationSteps';
export type { FinancialStepCredentials } from './registrationSteps';
export { lastReachedCitizenAssetMobile, goToProductsStep, goToContractStep } from './registrationLateSteps';

// ── UI interaction helpers (PoS card/form, dropdowns) ────────────────────────
export { expandPosCard, fillPosDevicesDeliveryForm, selectRandomOption } from './registrationUi';

// ── Mocked drivers & route stubs (no real OTP, no pool identity burned) ───────
export { DUMMY_SESSION, OTP_OK, OTP_NOT_VALID, NEW_APPLICATION_STATE, apiError, json, mockOtpBypass, mockOtpRequired, mockProfileType, mockFixedMerchantMode, mockAutoApprovedRegistration, goToInfoStepMocked, goToOtpDialogMocked, goToFinancialStepMocked, goToVerificationStepMocked, goToContractStepMocked, goToConfirmationStepMocked, AT_CONTRACT_STATE, CONTRACT_ACCEPT } from './registrationMocks';
export type { VerifyCall, VerifyReply } from './registrationMocks';

// ── Gateway API (direct HTTP, no browser) ────────────────────────────────────
export { REGISTRATION_API_BASE, REGISTRATION_API, registrationHeaders, toApiMobile, postRegistration, openRegistrationSession } from './registrationApi';

// ── Database reads (SQL Server emi_profile, MongoDB notifications) ───────────
export { getRegistrationProfileByMobileFromSql, getBusinessRegistrationRequestByMobileFromSql, getFullRegistrationDetailByMobileFromSql, getRegistrationProvisioningFromSql, countProfilesByMobileFromSql, getActivationNotificationFromMongo, getActivationNotificationsFromMongo, countActivationNotificationsFromMongo, ACTIVATION_API_CREDENTIALS_MARKER, ACTIVATION_LOGIN_DETAILS_MARKER } from './registrationDb';
export type { RegistrationProfileRow, BusinessProfileRegistrationRequestRow, RegistrationFullDetail, RegistrationActivationNotification, RegistrationProvisioning } from './registrationDb';
