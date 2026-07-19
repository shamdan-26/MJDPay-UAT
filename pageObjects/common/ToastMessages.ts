import { Page, Locator, expect } from '@playwright/test';

export class ToastMessages {
    readonly page: Page;
    readonly insufficientFundToastMsg: Locator;

    constructor(page: Page) {
        this.page = page;

        // Map toast message using data-testid
        this.insufficientFundToastMsg = page.getByTestId('toast-message');
    }

    /**
     * Verifies that the toast for Insufficient Funds is displayed and contains correct text.
     */
    async verifyInsufficientFundMessageDisplayed() {
        console.log("Verifying Insufficient Fund toast message is displayed...");

        // Wait and assert that the toast container is visible and contains expected text case-insensitively
        await expect(this.insufficientFundToastMsg).toBeVisible({ timeout: 40000 });

        const text = await this.insufficientFundToastMsg.textContent() ?? "";
        if (text.trim().startsWith('{') && text.includes('"error"')) {
            expect(text).toContain("INSUFFICIENT_FUNDS");
        } else {
            await expect(this.insufficientFundToastMsg).toContainText("You have insufficient funds to complete this transaction. Please check your balance and try again.", { ignoreCase: true });
        }

        const actualText = await this.insufficientFundToastMsg.textContent();
        console.log(`[PASS] Insufficient fund toast message is displayed: [${actualText?.trim()}]`);
    }
}
