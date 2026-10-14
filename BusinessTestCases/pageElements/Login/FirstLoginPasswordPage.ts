import type { Locator, Page } from '@playwright/test';

/**
 * The forced "Reset password" screen (/business/auth/reset-password) a Business user lands on after the OTP when they
 * signed in with the default password. Locators use the page's data-testids (found on dev, 2026-10-14; not yet in
 * QA-DATA-TESTID-HANDOFF.md). The submit button stays disabled until all three fields pass the policy.
 */
export class FirstLoginPasswordPage {
    readonly page: Page;

    readonly currentInput: Locator;
    readonly newInput: Locator;
    readonly confirmInput: Locator;
    readonly currentToggle: Locator;
    readonly newToggle: Locator;
    readonly confirmToggle: Locator;
    readonly submitButton: Locator;

    /** Shown under the new-password field while it breaks the policy (8–20 chars, lower, upper, digit, special). */
    readonly policyError: Locator;
    /** "New password and its confirmation do not match". */
    readonly mismatchError: Locator;

    constructor(page: Page) {
        this.page = page;
        this.currentInput  = page.getByTestId('reset-password-current');
        this.newInput      = page.getByTestId('reset-password-new');
        this.confirmInput  = page.getByTestId('reset-password-confirm');
        this.currentToggle = page.getByTestId('reset-password-current-toggle-visibility');
        this.newToggle     = page.getByTestId('reset-password-new-toggle-visibility');
        this.confirmToggle = page.getByTestId('reset-password-confirm-toggle-visibility');
        this.submitButton  = page.getByTestId('reset-password-submit-btn');
        this.policyError   = page.locator('#error_content-newPassword');
        this.mismatchError = page.locator('#error_passwordsNotMatch');
    }

    async fill(current: string, next: string, confirm: string = next): Promise<void> {
        await this.currentInput.fill(current);
        await this.newInput.fill(next);
        await this.confirmInput.fill(confirm);
    }

    async submit(): Promise<void> {
        await this.submitButton.click();
    }
}
