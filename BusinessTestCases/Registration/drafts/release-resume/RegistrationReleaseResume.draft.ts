// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/functional/02-business-info/.
//
// Release-upgrade resume: an applicant who started registering before a deployment must land on the same step after it.
// Every released build is exercised with the SAME recorded `profile-registration-type` responses; if a front-end change
// alters how flags map to steps, this fails before users are stranded.
//
// How it works : fixtures live in data/registrationFixtures/resume/<release-tag>/*.json, one file per recorded resume
//                state, each `{ "name": ..., "response": {...}, "expectedStep": "financial|nafath|products|contract" }`.
//                Add a new folder when a release changes the response contract; never edit old ones.
// Prerequisites: capture at least one fixture folder (e.g. from RegistrationResumeStateTable.spec.ts rows once confirmed).
// Assumptions  : same landing landmarks as RegistrationResumeStateTable.spec.ts.
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { goToInfoStepMocked, mockProfileType, RESIDENT_ASSETS, generateEmail } from '../../helpers/RegistrationHelper';
import { RegistrationInfoPage } from '../../../pageElements/Registration/RegistrationInfoPage';
import { RegistrationFinancialPage } from '../../../pageElements/Registration/RegistrationFinancialPage';
import { RegistrationNafathPage } from '../../../pageElements/Registration/RegistrationNafathPage';
import { RegistrationProductsPage } from '../../../pageElements/Registration/RegistrationProductsPage';
import { RegistrationContractPage } from '../../../pageElements/Registration/RegistrationContractPage';

type Step = 'financial' | 'nafath' | 'products' | 'contract';
interface Fixture { name: string; response: Record<string, unknown>; expectedStep: Step }

const ROOT = path.resolve(__dirname, '../../../../data/registrationFixtures/resume');
const releases = fs.existsSync(ROOT) ? fs.readdirSync(ROOT).filter(d => fs.statSync(path.join(ROOT, d)).isDirectory()) : [];
const asset = RESIDENT_ASSETS[0];

async function landedOn(page: Page): Promise<Step | 'none'> {
    return Promise.race([
        new RegistrationFinancialPage(page).monthlyBillsInput.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'financial' as const),
        new RegistrationNafathPage(page).nafathHeading.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'nafath' as const),
        new RegistrationProductsPage(page).productCards.first().waitFor({ state: 'visible', timeout: 30000 }).then(() => 'products' as const),
        new RegistrationContractPage(page).agreeCheckbox.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'contract' as const),
    ]).catch(() => 'none' as const);
}

test.describe('Registration – resume across releases (DRAFT)', { tag: ['@registration', '@functional', '@regression'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test('at least one recorded release fixture exists', async () => {
        expect(releases.length, `No fixtures under ${ROOT}`).toBeGreaterThan(0);
    });

    for (const release of releases) {
        const dir = path.join(ROOT, release);
        for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
            const fixture = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as Fixture;
            test(`[${release}] ${fixture.name} resumes at ${fixture.expectedStep}`, async ({ page }) => {
                test.setTimeout(120_000);
                await mockProfileType(page, 201, fixture.response);
                await goToInfoStepMocked(page);
                const info = new RegistrationInfoPage(page);
                await info.profileTypeGroup.getByRole('radio').first().click();
                await info.crnInput.fill(asset.crn);
                await info.idInput.fill(asset.nationalId);
                await info.emailInput.fill(generateEmail());
                await info.nextButton.click();
                expect(await landedOn(page)).toBe(fixture.expectedStep);
            });
        }
    }
});
