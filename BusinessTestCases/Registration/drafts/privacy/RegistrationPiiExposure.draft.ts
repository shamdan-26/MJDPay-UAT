// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/security/.
//
// Privacy / PII exposure: the applicant's mobile number, National ID/Iqama, CRN and email must not leak into places they
// do not belong — URLs, referrers, console, analytics/Firebase payloads, or persistent browser storage — while the wizard
// is used. Relevant to data-protection (PDPL) and AML/KYC handling.
//
// Prerequisites : none (mock-driven wizard up to Business Info/Financial; no OTP or pool identity consumed).
// Assumptions   : third-party hosts that must not receive PII are matched by the THIRD_PARTY regex (Firebase, Google
//                 analytics/tag manager); storage keys are not known in advance, so whole stores are scanned.
import { test, expect, Page } from '@playwright/test';
import { goToInfoStepMocked, mockProfileType, NEW_APPLICATION_STATE, RESIDENT_ASSETS, generateEmail, generateKSAMobile } from '../../helpers/RegistrationHelper';
import { RegistrationInfoPage } from '../../../pageElements/Registration/RegistrationInfoPage';

const THIRD_PARTY = /firebase|googleapis|google-analytics|googletagmanager|doubleclick|facebook|hotjar|segment|mixpanel|sentry/i;
const asset = RESIDENT_ASSETS[0];

interface Capture { urls: string[]; thirdPartyBodies: string[]; console: string[]; referers: string[] }

function capture(page: Page): Capture {
    const c: Capture = { urls: [], thirdPartyBodies: [], console: [], referers: [] };
    page.on('request', r => {
        c.urls.push(r.url());
        const ref = r.headers()['referer'];
        if (ref) c.referers.push(ref);
        if (THIRD_PARTY.test(r.url())) c.thirdPartyBodies.push(`${r.url()} ${r.postData() ?? ''}`);
    });
    page.on('console', m => c.console.push(m.text()));
    return c;
}

async function runWizardToFinancial(page: Page, mobile: string) {
    await mockProfileType(page, 201, NEW_APPLICATION_STATE);
    await goToInfoStepMocked(page, mobile);
    const info = new RegistrationInfoPage(page);
    await info.profileTypeGroup.getByRole('radio').first().click();
    await info.crnInput.fill(asset.crn);
    await info.idInput.fill(asset.nationalId);
    await info.emailInput.fill(generateEmail());
    await info.nextButton.click();
    await page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }).waitFor({ state: 'visible', timeout: 30000 });
}

test.describe('Registration – PII exposure (DRAFT)', { tag: ['@registration', '@security', '@privacy'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'security' }] }, () => {
    const mobile = generateKSAMobile();
    const secrets = () => [mobile, asset.crn, asset.nationalId, generateEmail()];

    test('no PII appears in any request URL or Referer header', async ({ page }) => {
        test.setTimeout(120_000);
        const c = capture(page);
        await runWizardToFinancial(page, mobile);
        for (const s of secrets()) {
            expect(c.urls.filter(u => u.includes(s) || u.includes(encodeURIComponent(s))), `"${s}" in a URL`).toEqual([]);
            expect(c.referers.filter(u => u.includes(s)), `"${s}" in a Referer`).toEqual([]);
        }
    });

    test('no PII is sent to third-party analytics/crash-reporting hosts', async ({ page }) => {
        test.setTimeout(120_000);
        const c = capture(page);
        await runWizardToFinancial(page, mobile);
        for (const s of secrets()) expect(c.thirdPartyBodies.filter(b => b.includes(s)), `"${s}" sent to a third party`).toEqual([]);
    });

    test('no PII is written to the browser console', async ({ page }) => {
        test.setTimeout(120_000);
        const c = capture(page);
        await runWizardToFinancial(page, mobile);
        for (const s of secrets()) expect(c.console.filter(l => l.includes(s)), `"${s}" logged to console`).toEqual([]);
    });

    test('identity numbers and the email are not persisted in localStorage / sessionStorage', async ({ page }) => {
        test.setTimeout(120_000);
        await runWizardToFinancial(page, mobile);
        const dump = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } }));
        for (const s of [asset.crn, asset.nationalId, generateEmail()]) expect(dump.includes(s), `"${s}" persisted in web storage`).toBe(false);
    });

    test('the session token is not stored in localStorage (prefer memory or HttpOnly cookie)', async ({ page }) => {
        test.setTimeout(120_000);
        await runWizardToFinancial(page, mobile);
        const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => /token|jwt|session|auth/i.test(k)));
        expect(keys, 'token-like keys in localStorage').toEqual([]);
    });

    test('identity inputs are not autofilled or cached by the browser (autocomplete off for CRN / National ID)', async ({ page }) => {
        await goToInfoStepMocked(page);
        const info = new RegistrationInfoPage(page);
        for (const field of [info.crnInput, info.idInput]) {
            const ac = await field.getAttribute('autocomplete');
            expect(['off', 'one-time-code', 'new-password', 'nope'], `autocomplete="${ac}"`).toContain(ac ?? 'off');
        }
    });

    test('the National ID is masked or not echoed back in plain text after the step is completed', async ({ page }) => {
        test.setTimeout(120_000);
        await runWizardToFinancial(page, mobile);
        const body = await page.locator('body').innerText();
        expect(body.includes(asset.nationalId), 'full National ID visible on a later step').toBe(false);
    });
});
