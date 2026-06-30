import type { Page } from '@playwright/test';

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
    const toast = page.locator('mat-snack-bar-container, [class*="snack"], [class*="toast"]').first();
    await toast.waitFor({ state: 'visible', timeout: appearTimeout }).catch(() => null);
    if (await toast.isVisible().catch(() => false)) {
        await toast.waitFor({ state: 'hidden', timeout: clearTimeout }).catch(() => {});
    }
}
