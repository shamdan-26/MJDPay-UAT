import { Page, expect } from '@playwright/test';

export const LOGIN_URL    = 'https://dev.majdpay.com/business/auth/login';
export const REGISTER_URL = 'https://dev.majdpay.com/business/auth/register';

export const VALID_EMAIL = 's.hamdan@dg-cash.com';

// ── Pre-generated test assets (from Assets.xlsx) ──────────────────────────────
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
const RESIDENT_ASSETS = [
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

// Primary defaults (first citizen row)
export const VALID_CRN    = CITIZEN_ASSETS[0].crn;
export const VALID_IQAMA  = CITIZEN_ASSETS[0].nationalId;
export const VALID_MOBILE = CITIZEN_ASSETS[0].mobile;

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

export async function fillOTP(page: Page) {
    const inputs = page.getByRole('textbox', { name: 'One time password input' });
    const count  = await inputs.count();
    for (let i = 0; i < count; i++) {
        await inputs.nth(i).click();
        await inputs.nth(i).pressSequentially('0');
    }
}

export async function goToInfoStep(page: Page): Promise<void> {
    await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: 'Mobile number' }).fill(generateKSAMobile());
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'next' }).click();
    await page.waitForTimeout(5000);
    await page.getByRole('heading', { name: 'Enter OTP' }).waitFor({ state: 'visible', timeout: 20000 });
    await page.getByRole('textbox', { name: 'One time password input' }).first()
        .waitFor({ state: 'visible', timeout: 10000 });
    await fillOTP(page);
    const verifyBtn = page.getByRole('button', { name: 'Verify' });
    await expect(verifyBtn).toBeEnabled({ timeout: 10000 });
    await verifyBtn.click();
    await page.waitForTimeout(3000);
    await page.getByText('Tell us about your business').waitFor({ state: 'visible', timeout: 20000 });
}

export async function goToFinancialStep(page: Page): Promise<void> {
    await goToInfoStep(page);
    const asset = nextCitizenAsset();
    await page.getByRole('radiogroup', { name: 'Profile Type' }).getByRole('radio').first().click();
    await page.getByRole('textbox', { name: 'unified number' }).fill(asset.crn);
    await page.getByRole('textbox', { name: 'National ID/Iqama' }).fill(asset.nationalId);
    await page.getByRole('textbox', { name: /Email/i }).fill(VALID_EMAIL);
    await page.getByRole('button', { name: 'next' }).click();
    // Wait for server-side CRN/Iqama validation to resolve before asserting the next step
    await page.getByRole('button', { name: 'Loading' })
        .waitFor({ state: 'hidden', timeout: 20000 });
    await page.getByRole('textbox', { name: /monthly expected number/i })
        .waitFor({ state: 'visible', timeout: 15000 });
}

export async function goToVerificationStep(page: Page): Promise<void> {
    await goToFinancialStep(page);
    await page.getByRole('textbox', { name: /monthly expected number/i }).fill('1500');
    await page.getByRole('textbox', { name: /monthly expected sum/i }).fill('50000');
    await page.getByRole('textbox', { name: /monthly withdrawal/i }).fill('10000');
    await page.getByRole('textbox', { name: /monthly deposit/i }).fill('20000');
    await selectRandomOption(page, page.getByRole('combobox', { name: /banks/i }));
    await selectRandomOption(page, page.getByRole('combobox', { name: /industries/i }));
    await selectRandomOption(page, page.getByRole('combobox', { name: /annual income/i }));
    await page.getByRole('button', { name: 'next' }).click();
    await page.getByRole('button', { name: 'Loading' })
        .waitFor({ state: 'hidden', timeout: 20000 });
    await page.getByRole('textbox', { name: /iban/i })
        .waitFor({ state: 'visible', timeout: 15000 });
}

export async function selectRandomOption(page: Page, dropdownLocator: any) {
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
