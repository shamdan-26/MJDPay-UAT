import { Page, Locator } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };
import { MongoClient } from 'mongodb';
import { waitForToastClear } from '../shared';
import { RegistrationMobilePage } from '../pageElements/registration/RegistrationMobilePage';
import { RegistrationInfoPage } from '../pageElements/registration/RegistrationInfoPage';
import { RegistrationFinancialPage } from '../pageElements/registration/RegistrationFinancialPage';
import { RegistrationVerificationPage } from '../pageElements/registration/RegistrationVerificationPage';

const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const LOGIN_URL    = `${BASE_URL}/business/auth/login`;
export const REGISTER_URL = `${BASE_URL}/business/auth/register`;

export const VALID_EMAIL = 's.hamdan@dg-cash.com';

/** Generates a unique email for each test run to avoid duplicate-registration rejections. */
export function generateEmail(): string {
    return `test+${Date.now()}@dg-cash.com`;
}

// Pre-generated test assets (from Assets.xlsx)
// Citizen_IDs sheet: Saudi_CRN | Citizen_ID | Saudi_Mobile (strip leading 966)
const CITIZEN_ASSETS = [
    { crn: '1010006068', nationalId: '1497430312', mobile: '500021788' },
    { crn: '1010016097', nationalId: '1418257208', mobile: '500062901' },
    { crn: '1010036467', nationalId: '1167272762', mobile: '500064975' },
    { crn: '1010051690', nationalId: '1618667578', mobile: '500083440' },
    { crn: '1010077719', nationalId: '1982507954', mobile: '500318143' },
    { crn: '1010091086', nationalId: '1480826062', mobile: '500474285' },
    { crn: '1010094219', nationalId: '1687726933', mobile: '500528763' },
    { crn: '1010108246', nationalId: '1754664454', mobile: '500622883' },
    { crn: '1010117673', nationalId: '1237547706', mobile: '500664869' },
    { crn: '1010121708', nationalId: '1572609475', mobile: '500802581' },
];

// Resident_IDs sheet: Resident_ID | CRN | Mobile (strip leading 966)
export const RESIDENT_ASSETS = [
    { crn: '1000659746', nationalId: '2959795515', mobile: '599000000' },
    { crn: '1002382941', nationalId: '2258981709', mobile: '599000001' },
    { crn: '1005135478', nationalId: '2447227568', mobile: '599000002' },
    { crn: '1005720915', nationalId: '2012260838', mobile: '599000003' },
    { crn: '1006122426', nationalId: '2874935543', mobile: '599000004' },
    { crn: '1006666281', nationalId: '2191277199', mobile: '599000005' },
    { crn: '1007027103', nationalId: '2521396180', mobile: '599000006' },
    { crn: '1008274647', nationalId: '2452854447', mobile: '599000007' },
    { crn: '1010265815', nationalId: '2355079696', mobile: '599000008' },
    { crn: '1010627980', nationalId: '2218615066', mobile: '599000009' },
];

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

// UAT test accounts from phone numbers.xlsx — Sheet1, uat-flagged rows
export const UAT_OTP_ASSETS = [
    { id: '1000000008', crn: '1100000008', mobile: '510203001' },
    { id: '1000000016', crn: '1200000016', mobile: '510203002' },
    { id: '1000000032', crn: '1400000032', mobile: '510203004' },
    { id: '1000000040', crn: '1500000040', mobile: '510203005' },
    { id: '1000000057', crn: '1600000057', mobile: '510203006' },
    { id: '1000000065', crn: '1700000065', mobile: '510203007' },
    { id: '1000000073', crn: '1800000073', mobile: '510203008' },
    { id: '1000000081', crn: '1900000081', mobile: '510203009' },
    { id: '1000000230', crn: '1240000230', mobile: '510203024' },
    { id: '2000000048', crn: '1300000048', mobile: '510203030' },
    { id: '2000000154', crn: '1410000154', mobile: '510203041' },
    { id: '2000000162', crn: '1420000162', mobile: '510203042' },
    { id: '2000000238', crn: '1490000238', mobile: '510203049' },
    { id: '2000000246', crn: '1500000246', mobile: '510203050' },
];

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
    const otpVisible = await page.getByRole('heading', { name: 'Enter OTP' })
        .waitFor({ state: 'visible', timeout: 20000 })
        .then(() => true)
        .catch(() => false);
    if (otpVisible) {
        await page.getByRole('textbox', { name: 'One time password input' }).first()
            .waitFor({ state: 'visible', timeout: 10000 });
        // dev/UAT test accounts always accept all-zero OTP; no mongo needed
        await fillOTP(page);
        const verifyBtn = page.getByRole('button', { name: 'Verify' });
        if (await verifyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await verifyBtn.click();
        }
    }
    await page.getByText('Tell us about your business').waitFor({ state: 'visible', timeout: 60000 });
    await waitForToastClear(page);
}

export interface FinancialStepCredentials {
    mobile?: string;
    crn?: string;
    nationalId?: string;
    profileType?: 'individual' | 'merchant';
    email?: string;
}

export async function goToFinancialStep(page: Page, credentials?: FinancialStepCredentials): Promise<void> {
    const asset = nextResidentAsset();
    const mobile     = credentials?.mobile     ?? asset.mobile;
    const crn        = credentials?.crn        ?? asset.crn;
    const nationalId = credentials?.nationalId ?? asset.nationalId;
    const profileType = credentials?.profileType ?? 'individual';

    await goToInfoStep(page, mobile);

    const infoPage = new RegistrationInfoPage(page);
    const radioGroup = page.getByRole('radiogroup', { name: 'Profile Type' });
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
    const advanced = await financialPage.monthlyBillsInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (!advanced) {
        const errorMsg = await page.evaluate(() => document.body.innerText).catch(() => '(unknown)');
        throw new Error(
            `Business Info step was rejected by the backend.\n` +
            `CRN=${crn}, ID=${nationalId}, Mobile=${mobile}.\n` +
            `Page text: ${errorMsg?.slice(0, 300)}`
        );
    }
}



export async function goToVerificationStep(page: Page): Promise<void> {
    await goToFinancialStep(page);
    const financialPage = new RegistrationFinancialPage(page);
    await financialPage.fill('1500', '50000', '10000', '20000');
    await selectRandomOption(page, page.locator('#mat-select-value-0'));
    await selectRandomOption(page, page.locator('#mat-select-value-1'));
    await selectRandomOption(page, page.locator('#mat-select-value-2'));
    await financialPage.next();
    const verificationPage = new RegistrationVerificationPage(page);
    await verificationPage.waitForLoad();
}

export async function fillFinancialForm(page: Page): Promise<void> {
    const financialPage = new RegistrationFinancialPage(page);
    await financialPage.fill('1500', '50000', '10000', '20000');
    await selectRandomOption(page, page.locator('#mat-select-value-0'));
    await selectRandomOption(page, page.locator('#mat-select-value-1'));
    await selectRandomOption(page, page.locator('#mat-select-value-2'));
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
        const items = page.locator('[role="option"]:visible, .dropdown-item:visible, .ng-option:visible');
        await items.first().waitFor({ state: 'visible', timeout: 5000 });
        const count = await items.count();
        await items.nth(Math.floor(Math.random() * count)).click();
    }
}
