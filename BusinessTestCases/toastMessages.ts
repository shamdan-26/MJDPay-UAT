import { type Page, expect } from '@playwright/test';

/**
 * Waits up to `appearTimeout` ms for an API-triggered error toast/snackbar to
 * appear, then waits up to `clearTimeout` ms for it to dismiss itself.
 * Silently no-ops when no toast appears (the normal case).
 *
 * Call this after any page navigation where background API calls could produce
 * transient error banners (Angular mat-snack-bar-container, generic toast/snack
 * classes) before your test's own assertions begin.
 */
export async function waitForToastClear(
    page: Page,
    appearTimeout = 3000,
    clearTimeout  = 8000,
): Promise<void> {
    // `toast` is the QA-DATA-TESTID-HANDOFF.md §3 shared-component testid,
    // kept alongside the original CSS-class locator as a fallback since not
    // every screen using this helper has been confirmed to render it yet.
    const toast = page.getByTestId('toast')
        .or(page.locator('mat-snack-bar-container, [class*="snack"], [class*="toast"]')).first();
    await toast.waitFor({ state: 'visible', timeout: appearTimeout }).catch(() => null);
    if (await toast.isVisible().catch(() => false)) {
        await toast.waitFor({ state: 'hidden', timeout: clearTimeout }).catch(() => {});
    }
}

/**
 * Asserts that the Angular toast snackbar is visible and optionally contains
 * the expected message text. Use this in every negative-scenario test that
 * expects an error/warning toast from the API.
 *
 * @param page - Playwright Page
 * @param expectedText - optional substring the toast detail must contain
 * @param timeout - ms to wait for the toast to appear (default 10 000)
 */
export async function assertToast(
    page: Page,
    expectedText?: string,
    timeout = 10000,
): Promise<void> {
    // `toast-message` is the QA-DATA-TESTID-HANDOFF.md §3 shared-component
    // testid — it explicitly replaces `.toast-snackbar__detail`, kept here as
    // a fallback for any screen not yet confirmed to render the new testid.
    const detail = page.getByTestId('toast-message').or(page.locator('.toast-snackbar__detail'));
    await expect(detail).toBeVisible({ timeout });
    if (expectedText) {
        await expect(detail).toContainText(expectedText, { ignoreCase: true });
    }
}
