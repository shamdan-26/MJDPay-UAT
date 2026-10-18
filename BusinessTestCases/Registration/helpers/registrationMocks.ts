import type { Page, Route } from '@playwright/test';
import { REGISTER_URL } from './registrationConfig';
import { generateKSAMobile, RESIDENT_ASSETS } from './registrationAssets';
import { RegistrationInfoPage } from '../../pageElements/Registration/RegistrationInfoPage';
import { RegistrationFinancialPage } from '../../pageElements/Registration/RegistrationFinancialPage';
import { RegistrationVerificationPage } from '../../pageElements/Registration/RegistrationVerificationPage';
import { RegistrationContractPage } from '../../pageElements/Registration/RegistrationContractPage';
import { RegistrationConfirmationPage } from '../../pageElements/Registration/RegistrationConfirmationPage';
import { fillBusinessInfo, fillFinancialForm } from './registrationSteps';

// ─────────────────────────────────────────────────────────────────────────────
// Network mocks that make the wizard reachable WITHOUT a real OTP or a pool
// identity. Confirmed live on dev: answering POST /register/mobile/otp with
// `otpRequired: false` and a session token makes the UI skip the OTP dialog and
// land on Business Info; the lookups (banks, industries, annual incomes) load
// fine with the dummy token. Everything downstream can then be stubbed per test.
// ─────────────────────────────────────────────────────────────────────────────

const MOBILE_OTP   = '**/emi-profile/api/v1/register/mobile/otp';
const RESEND_OTP   = '**/emi-profile/api/v1/register/mobile/otp/resend';
const VERIFY_OTP   = '**/emi-profile/api/v1/register/verify/otp';
const PROFILE_TYPE = '**/emi-profile/api/v1/register/profile-registration-type';

/** Three-part placeholder shaped like a JWT; built at runtime so it is obviously not a real credential. */
function dummyJwt(kind: string): string { return [`dummy-${kind}-header`, `dummy-${kind}-payload`, `dummy-${kind}-sig`].join('.'); }

export const DUMMY_SESSION = {
    sessionToken: { token: dummyJwt('s'), expirationDuration: 600_000 },
    refreshToken: { token: dummyJwt('r'), expirationDuration: 1_200_000 },
};

/** Gateway error envelope, as observed on dev (`message.messageCode` carries the reason). */
export function apiError(httpStatusCode: number, messageCode: string): { status: number; body: unknown } {
    return { status: httpStatusCode, body: { httpStatusCode, message: { messageCode, messageType: null, languageCode: 'en_UK' }, requestTime: null, requestedUri: null } };
}

export function json(route: Route, status: number, body: unknown): Promise<void> {
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** The mobile step answers "no OTP needed" with a session — the wizard goes straight to Business Info. */
export async function mockOtpBypass(page: Page): Promise<void> {
    await page.route(MOBILE_OTP, route => json(route, 200, { requestId: 'mock-request', otpRequired: false, ...DUMMY_SESSION }));
}

export interface VerifyCall { mobileNumber?: string; otp?: string; requestId?: string }
export type VerifyReply = { status: number; body: unknown };

/**
 * The mobile step asks for an OTP; `verify` decides each verify attempt's reply (attempt is 1-based).
 * Returns the recorded calls so tests can assert how many requests the UI made and what it sent.
 */
export async function mockOtpRequired(
    page: Page,
    verify: (attempt: number, call: VerifyCall) => VerifyReply,
): Promise<{ verifyCalls: VerifyCall[]; sendCalls: { count: number }; resendCalls: { count: number } }> {
    const verifyCalls: VerifyCall[] = [];
    const sendCalls = { count: 0 };
    const resendCalls = { count: 0 };
    await page.route(MOBILE_OTP, route => {
        sendCalls.count++;
        return json(route, 200, { requestId: `mock-request-${sendCalls.count}`, otpRequired: true, sessionToken: null, refreshToken: null });
    });
    await page.route(RESEND_OTP, route => {
        resendCalls.count++;
        return json(route, 200, { requestId: `mock-resend-${resendCalls.count}`, otpRequired: true, sessionToken: null, refreshToken: null });
    });
    await page.route(VERIFY_OTP, route => {
        const call = (route.request().postDataJSON() ?? {}) as VerifyCall;
        verifyCalls.push(call);
        const reply = verify(verifyCalls.length, call);
        return json(route, reply.status, reply.body);
    });
    return { verifyCalls, sendCalls, resendCalls };
}

export const OTP_OK: VerifyReply = { status: 200, body: { ...DUMMY_SESSION } };
export const OTP_NOT_VALID = apiError(400, 'OTP_NOT_VALID');

/** Stubs the Business Info submit (POST /register/profile-registration-type). */
export async function mockProfileType(page: Page, status: number, body: unknown): Promise<{ calls: Record<string, unknown>[] }> {
    const calls: Record<string, unknown>[] = [];
    await page.route(PROFILE_TYPE, route => {
        if (route.request().method() !== 'POST') return route.continue();
        calls.push((route.request().postDataJSON() ?? {}) as Record<string, unknown>);
        return json(route, status, body);
    });
    return { calls };
}

/** Mobile → (mocked, no OTP) → Business Info, with no pool identity consumed. */
export async function goToInfoStepMocked(page: Page, mobile: string = generateKSAMobile()): Promise<string> {
    await mockOtpBypass(page);
    await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ }).fill(mobile);
    await page.getByRole('button', { name: /next|التالي/i }).click();
    await page.locator('#register-profile-card-MERCHANT').waitFor({ state: 'visible', timeout: 30000 });
    return mobile;
}

/** What POST /register/profile-registration-type answers for a brand-new application (all progress flags false). */
export const NEW_APPLICATION_STATE = {
    profileCode: 'BIL-0000000001',
    isProductAssigned: false,
    isContractAccepted: false,
    isGetNafathRandomNumberCompleted: false,
    isGetNafathStatusCompleted: false,
    isCompletedForm: false,
    nafathRandomNumber: null as string | null,
};

/**
 * Mobile → Business Info → Financial & Business with no real OTP and no real backend identity:
 * the OTP step is bypassed and the Business Info submit is answered with `state`
 * (defaults to a brand-new application, which the app resolves to the Financial step).
 * Never calls markResidentAssetUsed — the server is mocked, so no pool identity is consumed.
 */
export async function goToFinancialStepMocked(page: Page, state: Record<string, unknown> = NEW_APPLICATION_STATE): Promise<void> {
    await mockProfileType(page, 201, state);
    await goToInfoStepMocked(page);
    const info = new RegistrationInfoPage(page);
    await fillBusinessInfo(info, RESIDENT_ASSETS[0]);
    await info.nextButton.click();
    await new RegistrationFinancialPage(page).monthlyBillsInput.waitFor({ state: 'visible', timeout: 30000 });
}

/** As goToFinancialStepMocked, then fills Financial & Business and advances to Verification & Uploads. */
export async function goToVerificationStepMocked(page: Page): Promise<void> {
    await goToFinancialStepMocked(page);
    await fillFinancialForm(page);
    await new RegistrationFinancialPage(page).next();
    await new RegistrationVerificationPage(page).waitForLoad();
}

/** Progress flags for an application that has finished Nafath and Products — the wizard resumes at Contract. */
export const AT_CONTRACT_STATE = { ...NEW_APPLICATION_STATE, isGetNafathRandomNumberCompleted: true, isGetNafathStatusCompleted: true, isProductAssigned: true };

/** The Contract step's "Submit and finish" call. */
export const CONTRACT_ACCEPT = '**/emi-profile/api/v1/register/contract/accept';

/** Mobile → Business Info → Contract with no real OTP and no pool identity (Business Info answered with `AT_CONTRACT_STATE`). */
export async function goToContractStepMocked(page: Page): Promise<void> {
    await mockProfileType(page, 201, AT_CONTRACT_STATE);
    await goToInfoStepMocked(page);
    const info = new RegistrationInfoPage(page);
    await fillBusinessInfo(info, RESIDENT_ASSETS[0]);
    await info.nextButton.click();
    await new RegistrationContractPage(page).waitForLoad();
}

/**
 * As goToContractStepMocked, then ticks the agreement and submits with the accept call answered 200,
 * ending on the Confirmation screen. The response body is not inspected by the app's happy path (unconfirmed — empty object).
 */
export async function goToConfirmationStepMocked(page: Page): Promise<void> {
    await page.route(CONTRACT_ACCEPT, route => json(route, 200, {}));
    await goToContractStepMocked(page);
    const contract = new RegistrationContractPage(page);
    await contract.agreeCheckbox.check();
    await contract.submitButton.click();
    await new RegistrationConfirmationPage(page).waitForLoad();
}

/** Mobile → OTP dialog (mocked OTP requirement, see mockOtpRequired). */
export async function goToOtpDialogMocked(page: Page, mobile: string = generateKSAMobile()): Promise<string> {
    await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ }).fill(mobile);
    await page.getByRole('button', { name: /next|التالي/i }).click();
    await page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i }).waitFor({ state: 'visible', timeout: 20000 });
    return mobile;
}

// ── Sprint 71 feature mocks ──────────────────────────────────────────────────
/**
 * Route-mocking helpers for the Sprint 71 registration items (section 13 of
 * the test-case doc): auto-approval/auto-activation (EMI-5748), fixed-Merchant
 * sign-up mode (EMI-5768), and activation email (EMI-5777).
 *
 * None of these endpoints are given verbatim in the ticket text (unlike the
 * PoS section), so the paths below are best-effort guesses following this
 * app's existing `/emi-profile/api/v1/...` convention — reconcile against the
 * real network tab on first live run, same caveat as RegistrationProductsPage.ts.
 */

/** Toggles the EMI-5768 fixed-Merchant sign-up mode config the registration
 *  wizard is expected to read before rendering the profile-type step. */
export async function mockFixedMerchantMode(page: Page, enabled: boolean): Promise<void> {
    await page.route('**/*registration*settings*', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ fixedMerchantMode: enabled }) })
    );
}

/** Mocks the final registration submission so the response reflects
 *  auto-approval + auto-activation (EMI-5748) instead of a "pending review"
 *  status, and includes an activation-email-sent flag (EMI-5777). */
export async function mockAutoApprovedRegistration(page: Page): Promise<void> {
    await page.route('**/emi-profile/api/v1/register/**', route => {
        if (route.request().method() !== 'POST') return route.continue();
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'ACTIVE', approvalStatus: 'APPROVED', activationEmailSent: true }),
        });
    });
}
