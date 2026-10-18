import { test, expect, Page } from '@playwright/test';
import { goToInfoStepMocked, mockProfileType, apiError, RESIDENT_ASSETS, generateEmail } from '../../helpers/RegistrationHelper';
import { RegistrationInfoPage } from '../../../pageElements/Registration/RegistrationInfoPage';

// ─────────────────────────────────────────────────────────────────────────────
// Business Info — how the wizard reacts when the server rejects the identity. Each business rule is a scripted
// gateway reply (the message codes below are the expected contract; align them with the backend's real codes
// if they differ), so no pool identity or OTP is consumed. Common expectation: the applicant stays on Business Info,
// keeps what they typed, sees feedback, and can correct and resubmit.
// ─────────────────────────────────────────────────────────────────────────────
const asset = RESIDENT_ASSETS[0];
const FEEDBACK = '[role="alert"], .text-danger, mat-snack-bar-container, [class*="toast"], [class*="error"]';

const REJECTIONS: { rule: string; status: number; code: string }[] = [
    { rule: 'the CRN belongs to a different ID holder than the one entered', status: 400, code: 'CRN_NATIONAL_ID_MISMATCH' },
    { rule: 'the CRN is already registered by another mobile (duplicate business)', status: 409, code: 'COMMERCIAL_REGISTRATION_ALREADY_EXISTS' },
    { rule: 'the email is already used by another business', status: 409, code: 'EMAIL_ALREADY_EXISTS' },
    { rule: 'the National ID is not a valid Saudi ID or Iqama', status: 400, code: 'INVALID_NATIONAL_ID' },
    { rule: 'the CRN is expired or inactive in the registry', status: 400, code: 'CRN_NOT_ACTIVE' },
    { rule: 'the identity is blocked or sanctioned', status: 403, code: 'AML_BLOCKED' },
];

async function fill(page: Page): Promise<RegistrationInfoPage> {
    const info = new RegistrationInfoPage(page);
    await info.profileTypeGroup.getByRole('radio').first().click();
    await info.crnInput.fill(asset.crn);
    await info.idInput.fill(asset.nationalId);
    await info.emailInput.fill(generateEmail());
    return info;
}

test.describe('Registration – Business Info server-side rejections', { tag: ['@registration', '@business-info', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.beforeEach(() => { test.setTimeout(120_000); });

    for (const r of REJECTIONS) {
        test(`should stay on Business Info with feedback when ${r.rule}`, { annotation: [{ type: 'testcase', description: "RG-SRV-01: Should stay on Business Info with feedback when …" }] }, async ({ page }) => {
            await goToInfoStepMocked(page);
            const err = apiError(r.status, r.code);
            await mockProfileType(page, err.status, err.body);
            const info = await fill(page);
            await info.nextButton.click();
            await expect(page.locator(FEEDBACK).filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: 10000 });
            await expect(info.crnInput).toHaveValue(asset.crn);
            await expect(info.idInput).toHaveValue(asset.nationalId);
            await expect(info.emailInput).toHaveValue(generateEmail());
            await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toHaveCount(0);
        });
    }

    test('should accept a corrected resubmission after a rejection', { annotation: [{ type: 'testcase', description: "RG-SRV-02: Should accept a corrected resubmission after a rejection" }] }, async ({ page }) => {
        await goToInfoStepMocked(page);
        let attempt = 0;
        await page.route('**/emi-profile/api/v1/register/profile-registration-type', route => {
            if (route.request().method() !== 'POST') return route.continue();
            attempt++;
            const err = apiError(400, 'CRN_NATIONAL_ID_MISMATCH');
            return attempt === 1
                ? route.fulfill({ status: err.status, contentType: 'application/json', body: JSON.stringify(err.body) })
                : route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ profileCode: 'BIL-0000000001', isProductAssigned: false, isContractAccepted: false, isGetNafathRandomNumberCompleted: false, isGetNafathStatusCompleted: false, isCompletedForm: false, nafathRandomNumber: null }) });
        });
        const info = await fill(page);
        await info.nextButton.click();
        await expect(info.nextButton).toBeEnabled({ timeout: 15000 });
        await info.idInput.fill(RESIDENT_ASSETS[1].nationalId);
        await info.nextButton.click();
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toBeVisible({ timeout: 30000 });
        expect(attempt).toBe(2);
    });
});
