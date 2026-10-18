import { test, expect, Page } from '@playwright/test';
import { REGISTER_URL, generateKSAMobile, goToInfoStepMocked, goToFinancialStepMocked, mockProfileType, apiError, NEW_APPLICATION_STATE, RESIDENT_ASSETS, generateEmail } from '../../helpers/RegistrationHelper';
import { RegistrationInfoPage } from '../../../pageElements/Registration/RegistrationInfoPage';
import { RegistrationMobilePage } from '../../../pageElements/Registration/RegistrationMobilePage';

// ─────────────────────────────────────────────────────────────────────────────
// Resilience — the wizard under network failure, session loss and navigation abuse. Backend replies are mocked,
// so nothing here consumes a pool identity or needs a real OTP. Assertions are structural (no advance, no crash,
// input retained, control usable again) because the exact error wording is not specified.
// ─────────────────────────────────────────────────────────────────────────────
const asset = RESIDENT_ASSETS[0];
const SEND_OTP = '**/emi-profile/api/v1/register/mobile/otp';
const PROFILE_TYPE = '**/emi-profile/api/v1/register/profile-registration-type';

async function fillInfoAndNext(page: Page) {
    const info = new RegistrationInfoPage(page);
    await info.profileTypeGroup.getByRole('radio').first().click();
    await info.crnInput.fill(asset.crn);
    await info.idInput.fill(asset.nationalId);
    await info.emailInput.fill(generateEmail());
    await info.nextButton.click();
    return info;
}

test.describe('Registration – Resilience', { tag: ['@registration', '@journey', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.beforeEach(() => { test.setTimeout(120_000); });

    test.describe('Mobile step', () => {
        test('should stay on the mobile step and keep the number when the request times out', { annotation: [{ type: 'testcase', description: "RG-RES-01: Should stay on the mobile step and keep the number when the request times out" }] }, async ({ page }) => {
            await page.route(SEND_OTP, route => route.abort('timedout'));
            await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded' });
            const mobile = generateKSAMobile();
            const mobilePage = new RegistrationMobilePage(page);
            await mobilePage.mobileInput.fill(mobile);
            await mobilePage.nextButton.click();
            await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).toHaveCount(0);
            await expect(mobilePage.mobileInput).toHaveValue(mobile);
        });

        test('should recover and continue once the network is back after an offline attempt', { annotation: [{ type: 'testcase', description: "RG-RES-02: Should recover and continue once the network is back after an offline attempt" }] }, async ({ page, context }) => {
            await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded' });
            const mobilePage = new RegistrationMobilePage(page);
            await mobilePage.mobileInput.fill(generateKSAMobile());
            await context.setOffline(true);
            await mobilePage.nextButton.click();
            await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).toHaveCount(0);
            await context.setOffline(false);
            await page.route(SEND_OTP, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requestId: 'r', otpRequired: true, sessionToken: null, refreshToken: null }) }));
            await mobilePage.nextButton.click();
            await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).toBeVisible({ timeout: 20000 });
        });
    });

    test.describe('Business Info step', () => {
        test('should not advance and should re-enable Next when the submit times out', { annotation: [{ type: 'testcase', description: "RG-RES-03: Should not advance and should re-enable Next when the submit times out" }] }, async ({ page }) => {
            await goToInfoStepMocked(page);
            await page.route(PROFILE_TYPE, route => (route.request().method() === 'POST' ? route.abort('timedout') : route.continue()));
            const info = await fillInfoAndNext(page);
            await expect(info.crnInput).toBeVisible();
            await expect(info.nextButton).toBeEnabled({ timeout: 20000 });
        });

        test('should not advance when the registration session has expired (401 SESSION_INVALID)', { annotation: [{ type: 'testcase', description: "RG-RES-04: Should not advance when the registration session has expired (401 SESSION_INVALID)" }] }, async ({ page }) => {
            await goToInfoStepMocked(page);
            const err = apiError(401, 'SESSION_INVALID');
            await mockProfileType(page, err.status, err.body);
            await fillInfoAndNext(page);
            await expect(page.getByRole('textbox', { name: /Monthly expected number|العدد الشهري المتوقع للفواتير/i })).toHaveCount(0);
        });

        test('should return to a usable wizard after a page refresh on Business Info', { annotation: [{ type: 'testcase', description: "RG-RES-05: Should return to a usable wizard after a page refresh on Business Info" }] }, async ({ page }) => {
            await goToInfoStepMocked(page);
            await page.reload({ waitUntil: 'domcontentloaded' });
            await expect(page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ }).or(page.locator('#register-profile-card-MERCHANT'))).toBeVisible({ timeout: 30000 });
        });

        test('should not break the wizard when the browser Back and Forward buttons are used', { annotation: [{ type: 'testcase', description: "RG-RES-06: Should not break the wizard when the browser Back and Forward buttons are used" }] }, async ({ page }) => {
            const pageErrors: string[] = [];
            page.on('pageerror', e => pageErrors.push(e.message));
            await goToInfoStepMocked(page);
            await page.goBack().catch(() => {});
            await page.goForward().catch(() => {});
            await expect(page.locator('body')).toBeVisible();
            expect(pageErrors).toHaveLength(0);
        });

        test('should send one request per submit when the connection is slow', { annotation: [{ type: 'testcase', description: "RG-RES-07: Should send one request per submit when the connection is slow" }] }, async ({ page }) => {
            await goToInfoStepMocked(page);
            let calls = 0;
            await page.route(PROFILE_TYPE, async route => {
                if (route.request().method() !== 'POST') return route.continue();
                calls++;
                await new Promise(r => setTimeout(r, 4000));
                await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(NEW_APPLICATION_STATE) });
            });
            const info = await fillInfoAndNext(page);
            await info.nextButton.click({ force: true, timeout: 1000 }).catch(() => {});
            await expect(page.getByRole('textbox', { name: /Monthly expected number|العدد الشهري المتوقع للفواتير/i })).toBeVisible({ timeout: 30000 });
            expect(calls).toBe(1);
        });
    });

    test.describe('Financial step', () => {
        test('should keep the entered values when the browser goes offline and back online', { annotation: [{ type: 'testcase', description: "RG-RES-08: Should keep the entered values when the browser goes offline and back online" }] }, async ({ page, context }) => {
            await goToFinancialStepMocked(page);
            const bills = page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i });
            await bills.fill('1500');
            await context.setOffline(true);
            await context.setOffline(false);
            await expect(bills).toHaveValue(/1,?500/);
        });
    });

    test.describe('Two tabs', () => {
        test('should let two tabs start a registration for the same mobile without breaking either', { annotation: [{ type: 'testcase', description: "RG-RES-09: Should let two tabs start a registration for the same mobile without breaking either" }] }, async ({ context }) => {
            const mobile = generateKSAMobile();
            const a = await context.newPage();
            const b = await context.newPage();
            await Promise.all([goToInfoStepMocked(a, mobile), goToInfoStepMocked(b, mobile)]);
            await expect(a.locator('#register-profile-card-MERCHANT')).toBeVisible();
            await expect(b.locator('#register-profile-card-MERCHANT')).toBeVisible();
        });
    });
});
