import { expect, Page, Browser, BrowserContext } from '@playwright/test';
import { goToInfoStep, goToInfoStepMocked, REGISTER_URL, RESIDENT_ASSETS, generateEmail } from './RegistrationHelper';
import { RegistrationInfoPage } from '../../pageElements/Registration/RegistrationInfoPage';

// ── Selectors ─────────────────────────────────────────────────────────────────
export const PROFILE_MERCHANT   = '#register-profile-card-MERCHANT';
export const PROFILE_BILLER     = '#register-profile-card-BILLER';
export const PROFILE_CUSTOMER   = '#register-profile-card-CUSTOMER';
export const PROFILE_FREELANCER = '#register-profile-card-FREELANCER';
export const CRN_INPUT          = '#register-unifiedNumber-group input[type="text"]';
export const ID_INPUT           = '#register-id-group input[type="text"]';
export const EMAIL_INPUT        = 'input[type="email"]';
export const EMAIL_ERROR        = '#error_email.text-danger';
export const NEXT_BTN           = '#register-next-button';
export const ACTIVE_STEP        = '.mp-step.is-active';
export const FORM_TITLE         = '#register-form-title';
export const FINANCIAL_FIELD    = 'textbox';

// Locale-robust text/name matchers — the app's UI language on load is not
// guaranteed to be English, so these match both languages (same convention
// used by pageElements/Registration/RegistrationInfoPage.ts and RegistrationFinancialPage.ts).
export const CLEAR_BTN_NAME       = /Clear|مسح/i;
export const BUSINESS_INFO_TEXT   = /Business Info|بيانات النشاط/i;
export const FINANCIAL_TITLE_TEXT = /financial|البيانات المالية/i;
export const MONTHLY_EXPECTED_NUMBER = /monthly expected number|العدد الشهري المتوقع للفواتير/i;
export const NAFATH_TEXT          = /NAFATH|نَفاذ|نفاذ/i;
export const NEXT_BTN_NAME        = /next|التالي/i;
export const BACK_BTN_NAME        = /back|رجوع/i;
// Info icon carries tooltipClass="field-hint-tooltip" container="body" triggers="hover focus" —
// container="body" means the tooltip popup renders outside the field group, appended to <body>,
// and tooltipClass puts "field-hint-tooltip" on that popup, so it's a reliable, locale-independent target.
export const CRN_TOOLTIP_INFO_BTN       = '#register-unifiedNumber-group .field-hint-label__info';
export const ID_TOOLTIP_INFO_BTN        = '#register-id-group .field-hint-label__info';
export const FIELD_HINT_TOOLTIP_POPUP   = '.field-hint-tooltip';
export const TERMS_TEXT           = /terms|الشروط والأحكام|الشروط/i;
export const PRIVACY_TEXT         = /privacy|سياسة الخصوصية|الخصوصية/i;

export type Asset = typeof RESIDENT_ASSETS[number];

// ── Shared navigation helpers ─────────────────────────────────────────────────

export async function gotoTab1(page: Page, context: BrowserContext, asset: Asset): Promise<void> {
    const origin = new URL(REGISTER_URL).origin;
    await goToInfoStep(page, asset.mobile);
    await page.locator(EMAIL_INPUT).waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[class*="snack"], [class*="toast"], mat-snack-bar-container')
        .first()
        .waitFor({ state: 'hidden', timeout: 8000 })
        .catch(() => {});
    await page.locator(PROFILE_MERCHANT).waitFor({ state: 'visible', timeout: 10000 });
}

export async function fillTab1(page: Page, asset: Asset, profile = PROFILE_MERCHANT): Promise<void> {
    await page.locator(profile).click();
    await page.locator(CRN_INPUT).fill(asset.crn);
    await page.locator(ID_INPUT).fill(asset.nationalId);
    await page.locator(EMAIL_INPUT).fill(generateEmail());
    await expect(page.locator(NEXT_BTN)).toBeEnabled({ timeout: 10000 });
}

export async function fillTab1AndAdvance(page: Page, asset: Asset, profile = PROFILE_MERCHANT): Promise<void> {
    await fillTab1(page, asset, profile);
    await page.locator(NEXT_BTN).click();
    await page.getByRole('button', { name: /Loading|جاري التحميل/i })
        .waitFor({ state: 'hidden', timeout: 20000 })
        .catch(() => {});
    await page.getByRole(FINANCIAL_FIELD, { name: MONTHLY_EXPECTED_NUMBER })
        .waitFor({ state: 'visible', timeout: 30000 });
}

export interface InfoNav { page: Page; infoPage: RegistrationInfoPage }

/** Fresh context on the Business Info step via the mocked OTP bypass (read-only checks, no pool identity burned). */
export async function navigateToInfoStep(browser: Browser, workerIndex: number): Promise<InfoNav> {
    const context = await browser.newContext();
    const page: Page = await context.newPage();
    const asset = RESIDENT_ASSETS[workerIndex % RESIDENT_ASSETS.length];
    await goToInfoStepMocked(page, asset.mobile);
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 });
    return { page, infoPage: new RegistrationInfoPage(page) };
}
