// Barrel — the Registration helpers live in ./helpers/*; import from here so specs stay unchanged.
export { LOGIN_URL, REGISTER_URL, VALID_EMAIL, VALID_IBAN, VALID_VAT_NUMBER, TEST_FILE_BUFFER, REGISTRATION_EMAIL, generateEmail } from './helpers/registrationConfig';
export { RESIDENT_ASSETS, VALID_CRN, VALID_IQAMA, VALID_MOBILE, AssetAlreadyProgressedError, markCitizenAssetUsed, markResidentAssetUsed, nextCitizenAsset, nextResidentAsset, getFreshResidentAsset, nextMobileReuseResidentAsset, generateKSAMobile, DEV_OTP_ASSETS, nextUatOtpAsset, markUatOtpAssetUsed, generateFreshKSAMobile } from './helpers/registrationAssets';
export type { CitizenAssetOutcome, ResidentAssetOutcome } from './helpers/registrationAssets';
export { getOtpFromDb, fillOTP } from './helpers/registrationOtp';
export { goToInfoStep, submitBusinessInfo, isAlreadyRegisteredMessage, goToFinancialStep, goToFinancialStepWithDedicatedAsset, goToVerificationStep, fillFinancialForm, fillVerificationForm } from './helpers/registrationSteps';
export type { FinancialStepCredentials } from './helpers/registrationSteps';
export { lastReachedCitizenAssetMobile, goToProductsStep, goToContractStep } from './helpers/registrationLateSteps';
export { expandPosCard, fillPosDevicesDeliveryForm, mockFixedMerchantMode, mockAutoApprovedRegistration, selectRandomOption } from './helpers/registrationUi';
export { getRegistrationProfileByMobileFromSql, getBusinessRegistrationRequestByMobileFromSql, getFullRegistrationDetailByMobileFromSql, getActivationNotificationFromMongo, getActivationNotificationsFromMongo, ACTIVATION_API_CREDENTIALS_MARKER, ACTIVATION_LOGIN_DETAILS_MARKER, countProfilesByMobileFromSql, getRegistrationProvisioningFromSql, countActivationNotificationsFromMongo } from './helpers/registrationDb';
export { DUMMY_SESSION, OTP_OK, OTP_NOT_VALID, apiError, json, mockOtpBypass, mockOtpRequired, mockProfileType, goToInfoStepMocked, goToOtpDialogMocked, NEW_APPLICATION_STATE, goToFinancialStepMocked, goToVerificationStepMocked } from './helpers/registrationMocks';
export type { VerifyCall, VerifyReply } from './helpers/registrationMocks';
export { REGISTRATION_API_BASE, REGISTRATION_API, registrationHeaders, toApiMobile, postRegistration, openRegistrationSession } from './helpers/registrationApi';
export type { RegistrationProfileRow,BusinessProfileRegistrationRequestRow, RegistrationFullDetail, RegistrationActivationNotification, RegistrationProvisioning } from './helpers/registrationDb';
