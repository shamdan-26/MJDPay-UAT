import { test, expect, Page } from '@playwright/test';
import { goToInfoStepMocked, mockProfileType, NEW_APPLICATION_STATE, RESIDENT_ASSETS, generateEmail } from '../../helpers/RegistrationHelper';
import { RegistrationInfoPage } from '../../../pageElements/Registration/RegistrationInfoPage';
import { RegistrationFinancialPage } from '../../../pageElements/Registration/RegistrationFinancialPage';
import { RegistrationNafathPage } from '../../../pageElements/Registration/RegistrationNafathPage';
import { RegistrationProductsPage } from '../../../pageElements/Registration/RegistrationProductsPage';
import { RegistrationContractPage } from '../../../pageElements/Registration/RegistrationContractPage';

// ─────────────────────────────────────────────────────────────────────────────
// Resume state table — POST /register/profile-registration-type answers with progress flags
// (isGetNafathRandomNumberCompleted, isGetNafathStatusCompleted, isProductAssigned, isContractAccepted, isCompletedForm)
// and the wizard must land on the step they describe. The response is mocked row by row, so the whole table runs
// without a real OTP or identity. Rows follow the cross-checks already asserted live in RI-136 (EMI-5666):
//   isProductAssigned && !isContractAccepted           -> Contract
//   !isProductAssigned && isGetNafathStatusCompleted   -> Products
// The Nafath row is the remaining step between Financial and Products.
// ─────────────────────────────────────────────────────────────────────────────

type Step = 'financial' | 'nafath' | 'products' | 'contract';
type Flags = Partial<typeof NEW_APPLICATION_STATE>;

const TABLE: { label: string; flags: Flags; expect: Step }[] = [
    { label: 'a brand-new application (all flags false)',                         flags: {},                                                                              expect: 'financial' },
    { label: 'Nafath random number issued but not yet verified',                 flags: { isGetNafathRandomNumberCompleted: true, nafathRandomNumber: '42' },              expect: 'nafath' },
    { label: 'Nafath verified, no product assigned yet',                          flags: { isGetNafathRandomNumberCompleted: true, isGetNafathStatusCompleted: true },      expect: 'products' },
    { label: 'products assigned, contract not accepted',                          flags: { isGetNafathRandomNumberCompleted: true, isGetNafathStatusCompleted: true, isProductAssigned: true }, expect: 'contract' },
];

const asset = RESIDENT_ASSETS[0];

async function landedOn(page: Page): Promise<Step | 'none'> {
    const financial = new RegistrationFinancialPage(page).monthlyBillsInput;
    const nafath = new RegistrationNafathPage(page).nafathHeading;
    const products = new RegistrationProductsPage(page).productCards.first();
    const contract = new RegistrationContractPage(page).agreeCheckbox;
    return Promise.race([
        financial.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'financial' as const),
        nafath.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'nafath' as const),
        products.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'products' as const),
        contract.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'contract' as const),
    ]).catch(() => 'none' as const);
}

test.describe('Registration – Resume state table (profile-registration-type flags → step)', { tag: ['@registration', '@journey', '@functional'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    test.beforeEach(() => { test.setTimeout(120_000); });

    for (const row of TABLE) {
        test(`should land on ${row.expect} for ${row.label}`, { annotation: [{ type: 'testcase', description: "RG-RESUME-01: Should land on … for …" }] }, async ({ page }) => {
            await mockProfileType(page, 201, { ...NEW_APPLICATION_STATE, ...row.flags });
            await goToInfoStepMocked(page);
            const info = new RegistrationInfoPage(page);
            await info.profileTypeGroup.getByRole('radio').first().click();
            await info.crnInput.fill(asset.crn);
            await info.idInput.fill(asset.nationalId);
            await info.emailInput.fill(generateEmail());
            await info.nextButton.click();
            const landed = await landedOn(page);
            expect(landed, `flags ${JSON.stringify(row.flags)} should resume at ${row.expect}`).toBe(row.expect);
        });
    }

    test('should never land past Contract for an application that is already complete', { annotation: [{ type: 'testcase', description: "RG-RESUME-02: Should never land past Contract for an application that is already complete" }] }, async ({ page }) => {
        await mockProfileType(page, 201, { ...NEW_APPLICATION_STATE, isCompletedForm: true, isProductAssigned: true, isContractAccepted: true, isGetNafathStatusCompleted: true, isGetNafathRandomNumberCompleted: true });
        await goToInfoStepMocked(page);
        const info = new RegistrationInfoPage(page);
        await info.profileTypeGroup.getByRole('radio').first().click();
        await info.crnInput.fill(asset.crn);
        await info.idInput.fill(asset.nationalId);
        await info.emailInput.fill(generateEmail());
        await info.nextButton.click();
        // A finished application must not re-open an editable wizard step.
        await expect(new RegistrationFinancialPage(page).monthlyBillsInput).toHaveCount(0, { timeout: 15000 });
    });
});
