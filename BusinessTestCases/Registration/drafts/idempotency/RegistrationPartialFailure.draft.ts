// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/functional/journeys/.
//
// Idempotency and partial failure: registration crosses several services (profile, wallet, emails, Nafath). When one
// call fails or the response is lost, retrying must not create duplicate or orphaned records.
//
// Two layers:
//   A. UI + route fault injection (mocked, safe, no DB): the second attempt after a lost response sends a sane request
//      and the UI recovers.
//   B. Live + DB (needs an OTP source and a pool identity): abort the *response* of the final contract/accept call
//      (the server processed it, the browser never saw it), retry, then count rows via registrationDb.ts.
//
// Prerequisites for B: working OTP, SQL access (MSSQL_HOST). Assumptions: contract/accept is the last mutating call;
// countProfilesByMobileFromSql / countActivationNotificationsFromMongo behave as documented in registrationDb.ts.
import { test, expect } from '@playwright/test';
import {
    goToInfoStepMocked, mockProfileType, NEW_APPLICATION_STATE, RESIDENT_ASSETS, generateEmail,
    goToContractStep, countProfilesByMobileFromSql, getFullRegistrationDetailByMobileFromSql, countActivationNotificationsFromMongo,
} from '../../helpers/RegistrationHelper';
import { RegistrationInfoPage } from '../../../pageElements/Registration/RegistrationInfoPage';
import { RegistrationContractPage } from '../../../pageElements/Registration/RegistrationContractPage';

const asset = RESIDENT_ASSETS[0];
const PROFILE_TYPE = '**/emi-profile/api/v1/register/profile-registration-type';

test.describe('Registration – partial failure & idempotency (DRAFT)', { tag: ['@registration', '@functional', '@resilience'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test('A1: a lost Business Info response followed by a retry sends the same identity and then advances', async ({ page }) => {
        test.setTimeout(120_000);
        await goToInfoStepMocked(page);
        const bodies: Record<string, unknown>[] = [];
        let n = 0;
        await page.route(PROFILE_TYPE, route => {
            if (route.request().method() !== 'POST') return route.continue();
            bodies.push(route.request().postDataJSON());
            n++;
            return n === 1 ? route.abort('connectionreset')
                : route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(NEW_APPLICATION_STATE) });
        });
        const info = new RegistrationInfoPage(page);
        await info.profileTypeGroup.getByRole('radio').first().click();
        await info.crnInput.fill(asset.crn);
        await info.idInput.fill(asset.nationalId);
        await info.emailInput.fill(generateEmail());
        await info.nextButton.click();
        await expect(info.nextButton).toBeEnabled({ timeout: 20000 });
        await info.nextButton.click();
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toBeVisible({ timeout: 30000 });
        expect(bodies).toHaveLength(2);
        expect(bodies[1]).toEqual(bodies[0]);   // retry is the same request, nothing mutated client-side
    });

    test('A2: a 409 "already exists" on retry is treated as resume, not as a hard error', async ({ page }) => {
        test.setTimeout(120_000);
        await goToInfoStepMocked(page);
        // The server already holds the application from the lost first attempt and answers with the resume state.
        await mockProfileType(page, 201, { ...NEW_APPLICATION_STATE, isGetNafathRandomNumberCompleted: true, nafathRandomNumber: '42' });
        const info = new RegistrationInfoPage(page);
        await info.profileTypeGroup.getByRole('radio').first().click();
        await info.crnInput.fill(asset.crn);
        await info.idInput.fill(asset.nationalId);
        await info.emailInput.fill(generateEmail());
        await info.nextButton.click();
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toHaveCount(0, { timeout: 15000 });
    });

    test('B1 (live+DB): losing the contract/accept response and clicking Submit again creates one profile and two emails', async ({ browser }) => {
        test.setTimeout(900_000);
        const context = await browser.newContext();
        const page = await context.newPage();
        const mobile = await goToContractStep(page);
        const contract = new RegistrationContractPage(page);
        let seen = 0;
        await page.route('**/register/contract/accept', async route => {
            seen++;
            if (seen === 1) {
                await route.fetch();           // server processes it...
                await route.abort('connectionreset'); // ...but the browser never gets the answer
            } else {
                await route.continue();
            }
        });
        await contract.agreeCheckbox.check();
        await contract.submitButton.click();
        await page.waitForTimeout(3000);
        if (await contract.submitButton.isEnabled().catch(() => false)) await contract.submitButton.click();

        await expect.poll(() => countProfilesByMobileFromSql(mobile), { timeout: 60000 }).toBe(1);
        const detail = await getFullRegistrationDetailByMobileFromSql(mobile);
        expect(detail?.profile_code).toBeTruthy();
        await expect.poll(() => countActivationNotificationsFromMongo(detail!.profile_code), { timeout: 120000 }).toBe(2);
        await context.close();
    });
});
