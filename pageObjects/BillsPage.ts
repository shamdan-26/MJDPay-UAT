import { Page, Locator, expect } from '@playwright/test';

export class BillsPage {
    readonly page: Page;
    readonly billsMenuItem: Locator;
    readonly receivedBillsTab: Locator;
    readonly summaryPayButton: Locator;
    readonly confirmPayButton: Locator;
    readonly successPopupTitle: Locator;
    readonly goToHomeModalButton: Locator;

    constructor(page: Page) {
        this.page = page;
        // Scope to side navigation to avoid matching the "Bills" page title.
        this.billsMenuItem = page
            .getByRole('navigation')
            .getByRole('link', { name: /^bills$/i });
        this.receivedBillsTab = page
            .getByRole('tab', { name: /received bills/i })
            .or(page.getByText(/received bills/i));

        this.summaryPayButton = page.locator('#btn_submit_summary');
        this.confirmPayButton = page.locator('#submit_btn_confirm');
        this.successPopupTitle = page.locator('.my-modal-title', { hasText: /Bill paid successfully/i });
        this.goToHomeModalButton = page.getByTestId('bill-payment-success-cancel-btn');
    }

    async MapsToReceivedBills() {
        await this.billsMenuItem.click();
        await expect(this.receivedBillsTab).toBeVisible();
        await this.receivedBillsTab.click();
    }

    async initiateQuickPayment(status = 'Approved'): Promise<number> {
        // Robust alternative: Wait for at least one bill card element to be attached to the DOM
        await this.page.locator('article.bill-mobile-card').first().waitFor({ state: 'attached', timeout: 15000 });

        // Locate the card with the specific status and click the pay button within it
        const billCard = this.page.locator('article.bill-mobile-card').filter({ has: this.page.locator('.grid-item-data', { hasText: new RegExp(status, 'i') }) }).first();

        try {
            await expect(billCard).toBeVisible({ timeout: 5000 });
        } catch (error) {
            throw new Error(`Data Warning: Failed to find any "${status}" bills. The active Merchant account might have zero dynamic "${status}" bills in this environment. Please ensure the data setup is correct.`);
        }

        // Extract bill amount
        const amountText = await billCard.locator('.money-amount').textContent() ?? '0';
        const billAmount = parseFloat(amountText.replace(/[^\d.]/g, ''));
        console.log(`Extracted Bill Amount to pay: ${billAmount}`);

        await billCard.getByRole('button', { name: /^pay$/i }).click();

        return billAmount;
    }

    async confirmPayment() {
        // Click pay button in Payment Summary
        await expect(this.summaryPayButton).toBeVisible();
        await this.summaryPayButton.click();

        // Click Confirm button in Confirm Payment popup
        await expect(this.confirmPayButton).toBeVisible();
        await this.confirmPayButton.click();

        // Assertion: appear Bill paid successfully popup
        await expect(this.successPopupTitle).toBeVisible({ timeout: 15000 });

        // Dismiss the modal by clicking 'Go to Home' so subsequent side nav navigation is not blocked
        await expect(this.goToHomeModalButton).toBeVisible({ timeout: 10000 });
        await this.goToHomeModalButton.click();
    }
}
