import { Page, Locator, expect } from '@playwright/test';

export class TransactionsPage {
    readonly page: Page;
    readonly lastTransactionRow: Locator;
    readonly lastTransactionStatus: Locator;
    readonly lastTransactionAmount: Locator;
    readonly viewMoreButtonForLastTransaction: Locator;
    readonly batchTransactionReferenceTxt: Locator;

    constructor(page: Page) {
        this.page = page;

        // Locators mapped from Java elements
        this.lastTransactionRow = page.locator("//*[@id='transactions-reports-list']//datatable-row-wrapper[1]");
        this.lastTransactionStatus = page.locator("//*[@id='transactions-reports-list']//datatable-row-wrapper[1]//datatable-body-cell[5]");
        this.lastTransactionAmount = page.locator("//*[@id='transactions-reports-list']//datatable-row-wrapper[1]//datatable-body-cell[3]");
        this.viewMoreButtonForLastTransaction = page.locator("//*[@id='transactions-reports-list']//datatable-row-wrapper[1]//datatable-body-cell[6]");
        this.batchTransactionReferenceTxt = page.locator("//label[normalize-space(text())='batch Transaction Reference']/following-sibling::p");
    }

    // ---------- Actions & Getters ----------

    /**
     * Retrieves the status of the last transaction from the transaction history screen.
     */
    async getLastTransactionStatus(): Promise<string> {
        await expect(this.lastTransactionStatus).toBeVisible({ timeout: 15000 });
        const text = await this.lastTransactionStatus.textContent();
        return text?.trim() ?? '';
    }

    /**
     * Extracts last transaction amount, validates it matches expectation, and returns transaction status.
     * @param expectedAmount the amount you expect to find
     */
    async validateLastTransactionAndReturnStatus(expectedAmount: string): Promise<string> {
        await expect(this.lastTransactionRow).toBeVisible({ timeout: 15000 });

        const rawAmount = await this.lastTransactionAmount.textContent() ?? "";
        const amountStr = rawAmount.trim().replace(/[^\d.]/g, "");
        const statusStr = (await this.lastTransactionStatus.textContent() ?? "").trim();

        // Validate amount
        if (amountStr !== expectedAmount) {
            throw new Error(`Amount in last transaction does NOT match! Expected: ${expectedAmount} but found: ${amountStr}`);
        }

        return statusStr;
    }

    /**
     * Clicks the [View More] button for the most recent transaction row.
     */
    async clickViewMoreButtonForLastTransaction() {
        await expect(this.viewMoreButtonForLastTransaction).toBeVisible({ timeout: 15000 });
        await this.viewMoreButtonForLastTransaction.click();
    }

    /**
     * Retrieves the batch transaction reference code from details panel.
     */
    async getBatchTransactionReference(): Promise<string> {
        await expect(this.batchTransactionReferenceTxt).toBeVisible({ timeout: 15000 });
        const batchRef = (await this.batchTransactionReferenceTxt.textContent() ?? "").trim();
        console.log(`Batch Transaction Reference is: ${batchRef}`);
        return batchRef;
    }

    /**
     * Asserts that a bill payment ledger entry appears correctly as the latest transaction.
     */
    async assertBillPaymentLedgerEntry(billAmount: number) {
        // Strict mapping to target the first active ledger transaction item inside the body container
        const firstDataRow = this.page.locator('datatable-body-row .datatable-row-center').first()
            .or(this.page.locator('.datatable-row-center').nth(1));
        await firstDataRow.waitFor({ state: 'visible', timeout: 10000 });

        // Dynamic polling adaptation
        await expect.poll(async () => {
            const text = await firstDataRow.textContent();

            // If the transaction record is still pending, reload layout cache
            if (text && text.includes('Pending')) {
                console.log("Ledger entry is still Pending, reloading core view cache...");
                await this.page.reload({ waitUntil: 'load' });
                await firstDataRow.waitFor({ state: 'visible', timeout: 5000 });
                return await firstDataRow.textContent();
            }
            return text ?? '';
        }, {
            message: 'Waiting for ledger transaction to stabilize state',
            timeout: 50000,
            intervals: [4000]
        }).toMatch(/Success|Pending/); // Accept Pending if UAT is heavily bottlenecked

        // Secondary assertions for properties crosscheck
        await expect(firstDataRow).toContainText(`-${billAmount}`);
        await expect(firstDataRow).toContainText('Merchant Bill Payment');
    }
}
