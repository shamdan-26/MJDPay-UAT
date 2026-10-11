import { Page, Locator } from '@playwright/test';
import { RegistrationProductsPage } from '../../pageElements/Registration/RegistrationProductsPage';

/**
 * From the Products step (after goToProductsStep resolves true), expands the
 * PoS Terminals card and reports whether its inline "Request devices now" /
 * "Skip - set up later" sub-flow is available. A citizen asset that already
 * completed the PoS sub-flow in a prior run (shared CITIZEN_ASSETS pool)
 * advances straight to Contract instead of expanding — that's expected
 * steady-state, not a failure, so this returns false rather than throwing.
 * Returns false without clicking anything if the "POS" card isn't found at all.
 */
export async function expandPosCard(page: Page): Promise<boolean> {
    const products = new RegistrationProductsPage(page);
    const posCard = products.productCard('POS');
    const posCardFound = await posCard
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false);
    if (!posCardFound) return false;

    await posCard.click({ timeout: 10000 });
    const contractStep = products.activeStep.filter({ hasText: 'العقد' });
    return await Promise.race([
        products.requestDevicesNowButton.waitFor({ state: 'visible', timeout: 8000 }).then(() => true),
        contractStep.waitFor({ state: 'visible', timeout: 8000 }).then(() => false),
    ]).catch(() => false);
}

/**
 * Drives the inline PoS "Request devices now" sub-flow (from an expanded
 * card confirmed via expandPosCard()) through to a submittable Devices &
 * Delivery form: checks Request-now, continues past the card, fills device
 * count and contact fields, then waits for the Wathiq national address to
 * finish resolving before returning.
 *
 * That last wait matters: pos-delivery-editor-wathiq-refresh-btn-0 only
 * renders once the address fetch completes, and submitting
 * (register-pos-delivery-submit-btn) while it's still resolving silently
 * no-ops instead of advancing to Review — confirmed live via probe. The
 * caller still needs to click devicesDeliveryNextButton itself; this only
 * gets the form into a submittable state.
 */
export async function fillPosDevicesDeliveryForm(
    page: Page,
    options?: { deviceCount?: string; contactName?: string; contactMobile?: string }
): Promise<void> {
    const products = new RegistrationProductsPage(page);
    await products.requestDevicesNowButton.click();
    await products.skipSetupLaterButton.click();
    await products.deviceCountInput.waitFor({ state: 'visible', timeout: 10000 });

    await products.deviceCountInput.fill(options?.deviceCount ?? '1');
    await products.updateWathiqAddressButton.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    await products.contactNameInput.fill(options?.contactName ?? 'Test Contact');
    await products.contactMobileInput.fill(options?.contactMobile ?? '512345678');
}

/**
 * Route-mocking helpers for the Sprint 71 registration items (section 13 of
 * the test-case doc): auto-approval/auto-activation (EMI-5748), fixed-Merchant
 * sign-up mode (EMI-5768), and activation email (EMI-5777).
 *
 * None of these endpoints are given verbatim in the ticket text (unlike the
 * PoS section), so the paths below are best-effort guesses following this
 * app's existing `/emi-profile/api/v1/...` convention — reconcile against the
 * real network tab on first live run, same caveat as RegistrationProductsPage.ts.
 */

/** Toggles the EMI-5768 fixed-Merchant sign-up mode config the registration
 *  wizard is expected to read before rendering the profile-type step. */
export async function mockFixedMerchantMode(page: Page, enabled: boolean): Promise<void> {
    await page.route('**/*registration*settings*', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ fixedMerchantMode: enabled }) })
    );
}

/** Mocks the final registration submission so the response reflects
 *  auto-approval + auto-activation (EMI-5748) instead of a "pending review"
 *  status, and includes an activation-email-sent flag (EMI-5777). */
export async function mockAutoApprovedRegistration(page: Page): Promise<void> {
    await page.route('**/emi-profile/api/v1/register/**', route => {
        if (route.request().method() !== 'POST') return route.continue();
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'ACTIVE', approvalStatus: 'APPROVED', activationEmailSent: true }),
        });
    });
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
        const items = page.locator(
            '[role="option"]:visible:not([aria-disabled="true"]):not([disabled]), ' +
            '.dropdown-item:visible:not([aria-disabled="true"]):not([disabled]), ' +
            '.ng-option:visible:not([aria-disabled="true"]):not([disabled])'
        );
        await items.first().waitFor({ state: 'visible', timeout: 5000 });
        const count = await items.count();
        await items.nth(Math.floor(Math.random() * count)).click();
    }
}
