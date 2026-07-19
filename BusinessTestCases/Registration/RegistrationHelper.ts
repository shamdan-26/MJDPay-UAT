import { Page, Locator } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };
import { MongoClient } from 'mongodb';
import { waitForToastClear } from '../toastMessages';
import { RegistrationMobilePage } from '../pageElements/RegistrationMobilePage';
import { RegistrationInfoPage } from '../pageElements/RegistrationInfoPage';
import { RegistrationFinancialPage } from '../pageElements/RegistrationFinancialPage';
import { RegistrationVerificationPage } from '../pageElements/RegistrationVerificationPage';
import registrationDefaults from '../../data/registrationDefaults.json';
import registrationAssets from '../../data/registrationAssets.json';

const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const LOGIN_URL    = `${BASE_URL}/business/auth/login`;
export const REGISTER_URL = `${BASE_URL}/business/auth/register`;

export const VALID_EMAIL = registrationDefaults.validEmail;

// Verification & Uploads step (Tab 3) — shared valid test data
export const VALID_IBAN       = registrationDefaults.validIban;
export const VALID_VAT_NUMBER = registrationDefaults.validVatNumber;

/** Minimal 1x1 PNG used as a stand-in upload file across registration file-upload tests. */
export const TEST_FILE_BUFFER = Buffer.from(registrationDefaults.testFileBase64, 'base64');

/** Generates a unique email for each test run to avoid duplicate-registration rejections. */
export function generateEmail(): string {
    return `test+${Date.now()}@dg-cash.com`;
}

// Pre-generated test assets (from Assets.xlsx) — see data/registrationAssets.json
// Citizen_IDs sheet: Saudi_CRN | Citizen_ID | Saudi_Mobile (strip leading 966)
const CITIZEN_ASSETS = registrationAssets.citizenAssets;

// Resident_IDs sheet: Resident_ID | CRN | Mobile (strip leading 966)
export const RESIDENT_ASSETS = registrationAssets.residentAssets;

// Primary defaults resident pool used for Business Info step
export const VALID_CRN    = RESIDENT_ASSETS[0].crn;
export const VALID_IQAMA  = RESIDENT_ASSETS[0].nationalId;
export const VALID_MOBILE = RESIDENT_ASSETS[0].mobile;

let _citizenIndex  = 0;
let _residentIndex = 0;

/** Returns the next citizen asset (CRN + National ID + mobile) in round-robin order. */
export function nextCitizenAsset() {
    return CITIZEN_ASSETS[_citizenIndex++ % CITIZEN_ASSETS.length];
}

/** Returns the next resident asset (CRN + Iqama + mobile) in round-robin order. */
export function nextResidentAsset() {
    return RESIDENT_ASSETS[_residentIndex++ % RESIDENT_ASSETS.length];
}

/** Picks a random mobile from the full pre-generated pool. */
export function generateKSAMobile(): string {
    const all = [...CITIZEN_ASSETS, ...RESIDENT_ASSETS];
    return all[Math.floor(Math.random() * all.length)].mobile;
}

// UAT test accounts from phone numbers.xlsx — Sheet1, uat-flagged rows — see data/registrationAssets.json
export const UAT_OTP_ASSETS = registrationAssets.uatOtpAssets;

let _uatOtpIndex = 0;

/** Returns the next UAT OTP test account in round-robin order (phone numbers.xlsx). */
export function nextUatOtpAsset() {
    return UAT_OTP_ASSETS[_uatOtpIndex++ % UAT_OTP_ASSETS.length];
}


/** Picks a UAT OTP test mobile from phone numbers.xlsx. */
export function generateFreshKSAMobile(): string {
    return UAT_OTP_ASSETS[Math.floor(Math.random() * UAT_OTP_ASSETS.length)].mobile;
}


const MONGO_DB  = 'notification-log';

export async function getOtpFromDb(mobile: string, maxAttempts = 10, delayMs = 2000): Promise<string> {
    if ((process.env['ENV'] ?? 'dev') === 'dev') return '';
    const MONGO_URI = process.env['MONGO_URI'] ?? (() => { throw new Error('MONGO_URI env var is not set'); })();
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const col = client.db(MONGO_DB).collection('notifications');
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const doc = await col.findOne(
                {
                    recipient: { $in: [mobile, `966${mobile}`, `+966${mobile}`, `0${mobile}`] },
                    message: { $regex: /Use this OTP/i },
                },
                { sort: { createdAt: -1 } }
            );
            if (doc) {
                const match = (doc.message as string).match(/Use this OTP\s*:\s*(\d+)/i);
                if (match) return match[1];
            }
            if (attempt < maxAttempts) await new Promise(r => setTimeout(r, delayMs));
        }
        throw new Error(`No OTP notification found for mobile ${mobile} after ${maxAttempts} attempts`);
    } finally {
        await client.close();
    }
}

export async function fillOTP(page: Page, otp?: string) {
    const inputs = page.getByRole('textbox', { name: 'One time password input' });
    await inputs.first().waitFor({ state: 'visible', timeout: 10000 });
    const count  = await inputs.count();
    for (let i = 0; i < count; i++) {
        await inputs.nth(i).pressSequentially(otp?.[i] ?? '0', { delay: 50 });
    }
}

export async function goToInfoStep(page: Page, mobile?: string): Promise<void> {
    const usedMobile = mobile ?? generateKSAMobile();
    const mobilePage = new RegistrationMobilePage(page);
    await mobilePage.goto(REGISTER_URL);
    await mobilePage.fillMobile(usedMobile);
    await mobilePage.submitMobile();
    const otpVisible = await page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })
        .waitFor({ state: 'visible', timeout: 20000 })
        .then(() => true)
        .catch(() => false);
    if (otpVisible) {
        await page.getByRole('textbox', { name: 'One time password input' }).first()
            .waitFor({ state: 'visible', timeout: 10000 });
        // Only the dedicated UAT_OTP_ASSETS pool always accepts an all-zero OTP;
        // CITIZEN_ASSETS/RESIDENT_ASSETS mobiles (used here by default) require
        // the real code — getOtpFromDb() returns '' in dev, where zeros do work.
        const otp = await getOtpFromDb(usedMobile);
        await fillOTP(page, otp);
        const verifyBtn = page.getByRole('button', { name: /Verify|تحقق/i });
        if (await verifyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await verifyBtn.click();
        }
    }
    await page.getByText(/Tell us about your business|أخبرنا عن نشاطك التجاري/i).waitFor({ state: 'visible', timeout: 60000 });
    await waitForToastClear(page);
}

export interface FinancialStepCredentials {
    mobile?: string;
    crn?: string;
    nationalId?: string;
    profileType?: 'individual' | 'merchant';
    email?: string;
}

/**
 * True when the page shows a "this identity is already registered" style
 * rejection. The CRN/National ID pools in this file are shared and reused
 * (round-robin) across every test run, so an asset ending up already
 * registered — because a prior run completed a full sign-up with it — is
 * expected steady-state, not a failure.
 */
export function isAlreadyRegisteredMessage(text: string | null | undefined): boolean {
    if (!text) return false;
    return /already\s*(registered|exists|have an account|in use|associated)|duplicate\s*(registration|account|profile)?/i.test(text);
}

export async function goToFinancialStep(page: Page, credentials?: FinancialStepCredentials): Promise<void> {
    // Only the default round-robin pool is safe to retry across — an explicit
    // crn/nationalId means the caller is deliberately testing a specific
    // (often intentionally invalid) identity and must not be silently swapped.
    const usingDefaultIdentity = !credentials?.crn && !credentials?.nationalId;
    const maxAttempts = usingDefaultIdentity ? RESIDENT_ASSETS.length : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const asset = nextResidentAsset();
        const mobile     = credentials?.mobile     ?? asset.mobile;
        const crn        = credentials?.crn        ?? asset.crn;
        const nationalId = credentials?.nationalId ?? asset.nationalId;
        const profileType = credentials?.profileType ?? 'individual';

        await goToInfoStep(page, mobile);

        const infoPage = new RegistrationInfoPage(page);
        const radioGroup = page.getByRole('radiogroup', { name: /Profile Type|نوع الملف التجاري/i });
        if (profileType === 'merchant') {
            const merchantRadio = radioGroup.getByRole('radio', { name: /merchant/i });
            if (await merchantRadio.count() > 0) {
                await merchantRadio.click();
            } else {
                await radioGroup.getByRole('radio').last().click();
            }
        } else {
            await radioGroup.getByRole('radio').first().click();
        }

        await infoPage.crnInput.fill(crn);
        await infoPage.idInput.fill(nationalId);
        await infoPage.emailInput.fill(credentials?.email ?? generateEmail());
        await infoPage.nextButton.click();

        const financialPage = new RegistrationFinancialPage(page);
        await financialPage.loadingButton.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
        const advanced = await financialPage.monthlyBillsInput.waitFor({ state: 'visible', timeout: 20000 })
            .then(() => true)
            .catch(() => false);
        if (advanced) return;

        const errorMsg = await page.evaluate(() => document.body.innerText).catch(() => '(unknown)');

        if (usingDefaultIdentity && isAlreadyRegisteredMessage(errorMsg) && attempt < maxAttempts) {
            // Valid, expected outcome for a shared/reused pool asset — try the next one.
            continue;
        }

        throw new Error(
            `Business Info step was rejected by the backend` +
            (usingDefaultIdentity ? ` after ${attempt} attempt(s)` : '') + `.\n` +
            `CRN=${crn}, ID=${nationalId}, Mobile=${mobile}.\n` +
            `Page text: ${errorMsg?.slice(0, 300)}`
        );
    }
}



export async function goToVerificationStep(page: Page): Promise<void> {
    await goToFinancialStep(page);
    const financialPage = new RegistrationFinancialPage(page);
    await financialPage.fill('1500', '50000', '10000', '20000');

    // Only Industries (index 0) and Annual Income (index 1) render on this
    // step — there is no separate Banks select to fill.
    await selectRandomOption(page, page.locator('#mat-select-value-0'));
    await selectRandomOption(page, page.locator('#mat-select-value-1'));

    await financialPage.next();
    const verificationPage = new RegistrationVerificationPage(page);
    await verificationPage.waitForLoad();
}

export async function fillFinancialForm(page: Page): Promise<void> {
    const financialPage = new RegistrationFinancialPage(page);
    await financialPage.fill('1500', '50000', '10000', '20000');

    // Only Industries (index 0) and Annual Income (index 1) render on this
    // step — there is no separate Banks select to fill.
    await selectRandomOption(page, page.locator('#mat-select-value-0'));
    await selectRandomOption(page, page.locator('#mat-select-value-1'));
}

/** Fills the Verification & Uploads step (Tab 3): bank, IBAN, VAT number, and
 *  every file-upload input on the panel. Does not submit — callers click
 *  signUpButton themselves once the form is filled. */
export async function fillVerificationForm(page: Page): Promise<void> {
    const verificationPage = new RegistrationVerificationPage(page);
    await verificationPage.waitForLoad();

    if (await verificationPage.bankDropdown.count() > 0) {
        await selectRandomOption(page, verificationPage.bankDropdown.first());
    }
    await verificationPage.ibanInput.fill(VALID_IBAN);
    await verificationPage.vatInput.fill(VALID_VAT_NUMBER);

    const fileInputs = page.locator('input[type="file"]');
    const fileInputCount = await fileInputs.count();
    for (let i = 0; i < fileInputCount; i++) {
        await fileInputs.nth(i)
            .setInputFiles({ name: `doc${i}.pdf`, mimeType: 'application/pdf', buffer: TEST_FILE_BUFFER })
            .catch(() => {});
    }
}

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

export async function selectRandomOption(page: Page, dropdownLocator: Locator) {
    const tag = await dropdownLocator.evaluate((el: Element) => el.tagName.toLowerCase());
    if (tag === 'select') {
        const options    = await dropdownLocator.locator('option').all();
        const selectable = options.slice(1);
        const pick       = selectable[Math.floor(Math.random() * selectable.length)];
        await dropdownLocator.selectOption(await pick.getAttribute('value'));
    } else {
        await dropdownLocator.click();
        const items = page.locator(
            '[role="option"]:visible:not([aria-disabled="true"]):not([disabled]), ' +
            '.dropdown-item:visible:not([aria-disabled="true"]):not([disabled]), ' +
            '.ng-option:visible:not([aria-disabled="true"]):not([disabled])'
        );
        await items.first().waitFor({ state: 'visible', timeout: 5000 });
        const count = await items.count();
        await items.nth(Math.floor(Math.random() * count)).click();
    }
}
