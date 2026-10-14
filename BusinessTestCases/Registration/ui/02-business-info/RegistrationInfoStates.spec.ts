import { test, expect } from '@playwright/test';
import { goToInfoStepMocked, mockProfileType, apiError, NEW_APPLICATION_STATE, RESIDENT_ASSETS, generateEmail } from '../../RegistrationHelper';
import { RegistrationInfoPage } from '../../../pageElements/Registration/RegistrationInfoPage';

// Business Info — interaction states, keyboard operation and error presentation, reached through the mocked
// OTP bypass (no real OTP, no pool identity). Submits are answered by mockProfileType.
const asset = RESIDENT_ASSETS[0];

test.describe('Registration – Business Info states', { tag: ['@registration', '@business-info', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    let info: RegistrationInfoPage;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(90_000);
        info = new RegistrationInfoPage(page);
        await goToInfoStepMocked(page);
    });

    async function fillValid() {
        await info.profileTypeGroup.getByRole('radio').first().click();
        await info.crnInput.fill(asset.crn);
        await info.idInput.fill(asset.nationalId);
        await info.emailInput.fill(generateEmail());
    }

    test('should show exactly one profile type as selected after a click', { annotation: [{ type: 'testcase', description: "RG-INFOST-01: Should show exactly one profile type as selected after a click" }] }, async () => {
        const radios = info.profileTypeGroup.getByRole('radio');
        await radios.first().click();
        await expect(radios.first()).toBeChecked();
        expect(await radios.evaluateAll(els => els.filter(e => (e as HTMLInputElement).checked).length)).toBe(1);
    });

    test('should let a profile type be chosen with the keyboard', { annotation: [{ type: 'testcase', description: "RG-INFOST-02: Should let a profile type be chosen with the keyboard" }] }, async ({ page }) => {
        const radios = info.profileTypeGroup.getByRole('radio');
        await radios.first().focus();
        await page.keyboard.press('Space');
        await expect(radios.first()).toBeChecked();
    });

    test('should keep Next disabled until every field is valid and enable it after', { annotation: [{ type: 'testcase', description: "RG-INFOST-03: Should keep Next disabled until every field is valid and enable it after" }] }, async () => {
        await expect(info.nextButton).toBeDisabled();
        await fillValid();
        await expect(info.nextButton).toBeEnabled();
    });

    test('should mark the email field invalid and show an error for a malformed address', { annotation: [{ type: 'testcase', description: "RG-INFOST-04: Should mark the email field invalid and show an error for a malformed address" }] }, async () => {
        await info.emailInput.fill('not-an-email');
        await info.emailInput.blur();
        await expect(info.emailError).toBeVisible();
        await expect(info.emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('should clear the email error once the address is corrected', { annotation: [{ type: 'testcase', description: "RI-91: Clear the email error when a valid email replaces an invalid one" }] }, async () => {
        await info.emailInput.fill('not-an-email');
        await info.emailInput.blur();
        await expect(info.emailError).toBeVisible();
        await info.emailInput.fill(generateEmail());
        await info.emailInput.blur();
        await expect(info.emailError).toBeHidden();
    });

    for (const [label, value] of [['uppercase', generateEmail().toUpperCase()], ['plus-addressed', generateEmail().replace('@', '+qa@')], ['with surrounding spaces', `  ${generateEmail()}  `]] as const) {
        test(`should accept a ${label} email address`, { annotation: [{ type: 'testcase', description: "RG-INFOST-05: Should accept a … email address" }] }, async () => {
            await info.emailInput.fill(value);
            await info.emailInput.blur();
            await expect(info.emailError).toBeHidden();
        });
    }

    test('should not overflow the layout with a very long email address', { annotation: [{ type: 'testcase', description: "RG-INFOST-06: Should not overflow the layout with a very long email address" }] }, async ({ page }) => {
        await info.emailInput.fill(`${'a'.repeat(60)}@${'b'.repeat(60)}.example.com`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
    });

    test('should submit when Enter is pressed in the last field of a valid form', { annotation: [{ type: 'testcase', description: "RG-INFOST-07: Should submit when Enter is pressed in the last field of a valid form" }] }, async ({ page }) => {
        const submitted = await mockProfileType(page, 201, NEW_APPLICATION_STATE);
        await fillValid();
        await info.emailInput.press('Enter');
        await expect.poll(() => submitted.calls.length).toBe(1);
    });

    test('should send the chosen profile type, CRN, National ID and email to the server', { annotation: [{ type: 'testcase', description: "RG-INFOST-08: Should send the chosen profile type, CRN, National ID and email to the server" }] }, async () => {
        // route registered per-test so the payload can be inspected
        const submitted = await mockProfileType(info.page, 201, NEW_APPLICATION_STATE);
        await fillValid();
        await info.nextButton.click();
        await expect.poll(() => submitted.calls.length).toBe(1);
        expect(submitted.calls[0]).toMatchObject({ unifiedNumber: asset.crn, nationalId: asset.nationalId });
        expect(String(submitted.calls[0]['email']).toLowerCase()).toBe(generateEmail().toLowerCase());
    });

    test('should stay on Business Info and keep the entered values when the server answers 500', { annotation: [{ type: 'testcase', description: "RG-INFOST-09: Should stay on Business Info and keep the entered values when the server answers 500" }] }, async ({ page }) => {
        const err = apiError(500, 'INTERNAL_ERROR');
        await mockProfileType(page, err.status, err.body);
        await fillValid();
        await info.nextButton.click();
        await expect(info.crnInput).toHaveValue(asset.crn);
        await expect(info.idInput).toHaveValue(asset.nationalId);
        await expect(info.emailInput).toHaveValue(generateEmail());
        await expect(info.nextButton).toBeEnabled({ timeout: 15000 });
    });

    test('should not allow a second submit while the first is in flight', { annotation: [{ type: 'testcase', description: "RG-INFOST-10: Should not allow a second submit while the first is in flight" }] }, async ({ page }) => {
        let calls = 0;
        await page.route('**/emi-profile/api/v1/register/profile-registration-type', async route => {
            if (route.request().method() !== 'POST') return route.continue();
            calls++;
            await new Promise(r => setTimeout(r, 1500));
            await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(NEW_APPLICATION_STATE) });
        });
        await fillValid();
        await info.nextButton.click();
        await info.nextButton.click({ force: true, timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(2000);
        expect(calls).toBe(1);
    });

    test('should show the server error when the identity is already registered', { annotation: [{ type: 'testcase', description: "RG-INFOST-11: Should show the server error when the identity is already registered" }] }, async ({ page }) => {
        const err = apiError(409, 'PROFILE_ALREADY_EXISTS');
        await mockProfileType(page, err.status, err.body);
        await fillValid();
        await info.nextButton.click();
        await expect(info.crnInput).toBeVisible();
        await expect(page.locator('[role="alert"], .text-danger, mat-snack-bar-container, [class*="toast"]').filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: 10000 });
    });
});
