import { Page, Locator, expect } from '@playwright/test';
import { HomePage } from './HomePage';
import { TransactionsPage } from './TransactionsPage';

export class W2WTransferPage {
    readonly page: Page;

    // ---------- Balance Tracking Variables ----------
    private balanceBeforeW2W_MerchantVar = 0;
    private balanceBeforeW2W_BillerVar = 0;

    constructor(page: Page) {
        this.page = page;
    }

    // ============================================================
    // ---------- Locator Getters (Dynamic — auto-resolve page) ----------
    // ============================================================

    /**
     * CRN input field — matches the UAT `floating-text-unified-number-4` element.
     * Mirrored from Java: @FindBy(xpath = "//input[@id='floating-text-unified-number-4']")
     */
    get inputCRN(): Locator {
        return this.page.locator(
            '#w2w-unified-number, input#floating-text-unified-number-4, input[id*="crn"], input[id*="unified-number"]'
        ).first();
    }

    /**
     * Amount input field.
     * Mirrored from Java: @FindBy(xpath = "//input[@id='input_set_amount']")
     */
    get inputAmount(): Locator {
        return this.page.locator('#input_set_amount');
    }

    /**
     * Check Recipient button.
     * Mirrored from Java: //*[@id='sa_button']//button[@class='col-3 p-0 btn recipient-button ...']
     */
    get checkRecipientButton(): Locator {
        return this.page.locator('.mp-recipient-form__button')
            .or(this.page.locator('#sa_button button.recipient-button'))
            .or(this.page.locator('#sa_button button[class*="recipient-button"]'));
    }

    /**
     * Purpose of Transfer dropdown trigger.
     * Mirrored from Java: @FindBy(xpath = "//div[@id='mat-select-value-0']")
     */
    get purposeOfTransferDropdown(): Locator {
        return this.page.locator('mat-select[id^="floating-dropdown-purpose-of-transfer"]');
    }

    /**
     * Proceed button — case-insensitive match to handle copy changes.
     * Mirrored from Java: @FindBy(xpath = "//div/button[contains(text(), ' proceed ')]")
     */
    get proceedButton(): Locator {
        return this.page.locator('button.mp-btn-cta:has-text("proceed")')
            .or(this.page.locator('button:has-text("proceed")'))
            .or(this.page.getByRole('button', { name: /proceed/i }));
    }

    /**
     * Transfer / Submit button on the summary screen.
     * Mirrored from Java: @FindBy(xpath = "//button[@id='btn_submit_summary']")
     */
    get transferButton(): Locator {
        return this.page.locator('button.btn-primary').filter({ hasText: /^\s*transfer\s*$/i });
    }

    /**
     * Ok button on the success message screen.
     */
    get okButton(): Locator {
        return this.page.locator('button.mp-btn-wide:has-text("Ok")')
            .or(this.page.getByRole('button', { name: /^Ok$/i }));
    }

    /**
     * Company name div revealed after a valid CRN lookup.
     * Mirrored from Java: @FindBy(xpath = "//div[contains(@class,'d-flex justify-content-center pt-3')]")
     */
    get companyNameDiv(): Locator {
        return this.page.locator("div.d-flex.justify-content-center.pt-3");
    }

    /**
     * Toast / snack-bar error message for insufficient fund scenarios.
     */
    get toastErrorMessage(): Locator {
        return this.page.locator('.toast-snackbar__detail')
            .or(this.page.locator('[data-pc-section="detail"]'))
            .or(this.page.locator('.p-toast-detail'));
    }

    /**
     * Predefined amount chips.
     */
    get predefinedAmountChips(): Locator {
        return this.page.locator('.mp-amount-quick-chips .mp-amount-chip');
    }

    // ============================================================
    // ---------- Balance Helper: Read current balance from HomePage ----------
    // ============================================================

    /**
     * Reads the current wallet balance displayed on the home page.
     * Equivalent to the Java wait.until + getText + replaceAll pattern.
     */
    private async readCurrentBalance(): Promise<number> {
        const hp = new HomePage(this.page);
        // Wait for the balance element to be visible and contain a numeric value
        await expect(hp.currentBalance).toBeVisible({ timeout: 20000 });
        await expect(hp.currentBalance).toContainText(/\d/, { timeout: 20000 });

        const rawText = (await hp.currentBalance.textContent())?.trim() ?? '';
        console.log(`      Raw balance text: [${rawText}]`);

        const numericStr = rawText.replace(/[^\d.]/g, '');
        if (numericStr === '') {
            throw new Error(`Balance element is visible but contains no numeric value: "${rawText}"`);
        }
        return parseFloat(numericStr);
    }

    // ============================================================
    // ---------- Balance Capture BEFORE W2W ----------
    // ============================================================

    /**
     * Captures the Merchant wallet balance BEFORE performing a W2W transfer.
     * Mirrored from Java: getBalanceBeforeW2W_Merchant()
     * @returns the captured balance as a number
     */
    async captureBalanceBeforeTransfer_Merchant(): Promise<number> {
        this.balanceBeforeW2W_MerchantVar = await this.readCurrentBalance();
        console.log(`   [Merchant] Balance BEFORE W2W transfer: ${this.balanceBeforeW2W_MerchantVar}`);
        return this.balanceBeforeW2W_MerchantVar;
    }

    /**
     * Captures the Biller wallet balance BEFORE the W2W transfer credit lands.
     * Mirrored from Java: getBalanceBeforeW2W_Biller()
     */
    async captureBalanceBeforeTransfer_Biller(): Promise<number> {
        this.balanceBeforeW2W_BillerVar = await this.readCurrentBalance();
        console.log(`   [Biller]   Balance BEFORE W2W transfer: ${this.balanceBeforeW2W_BillerVar}`);
        return this.balanceBeforeW2W_BillerVar;
    }

    // ============================================================
    // ---------- Balance Capture AFTER W2W ----------
    // ============================================================

    /**
     * Reads the Merchant wallet balance AFTER a W2W transfer with retry-polling logic.
     * Mirrored from Java: getBalanceAfterW2W_Merchant()
     */
    async readBalanceAfterTransfer_Merchant(): Promise<number> {
        let currentBalance = await this.readCurrentBalance();
        let retries = 3;

        while (currentBalance === this.balanceBeforeW2W_MerchantVar && retries > 0) {
            console.log(`   [Merchant] Balance unchanged at ${this.balanceBeforeW2W_MerchantVar}. Retrying reload in 4s... (${retries} left)`);
            await this.page.waitForTimeout(4000);
            await this.page.reload({ waitUntil: 'networkidle' }).catch(() => null);
            currentBalance = await this.readCurrentBalance();
            retries--;
        }

        console.log(`   [Merchant] Balance AFTER W2W transfer (polled): ${currentBalance}`);
        return currentBalance;
    }

    /**
     * Reads the Biller wallet balance AFTER the W2W credit is reflected.
     * Mirrored from Java: getBalanceAfterW2W_Biller()
     */
    async readBalanceAfterTransfer_Biller(): Promise<number> {
        let currentBalance = await this.readCurrentBalance();
        let retries = 3;

        while (currentBalance === this.balanceBeforeW2W_BillerVar && retries > 0) {
            console.log(`   [Biller]   Balance unchanged at ${this.balanceBeforeW2W_BillerVar}. Retrying reload in 4s... (${retries} left)`);
            await this.page.waitForTimeout(4000);
            await this.page.reload({ waitUntil: 'networkidle' }).catch(() => null);
            currentBalance = await this.readCurrentBalance();
            retries--;
        }

        console.log(`   [Biller]   Balance AFTER W2W transfer (polled): ${currentBalance}`);
        return currentBalance;
    }

    // ============================================================
    // ---------- Expected Balance Calculations ----------
    // ============================================================

    /**
     * Computes the expected Merchant balance after W2W deduction.
     * Mirrored from Java: expectedBalanceAfterW2W_Merchant(amount)
     */
    expected_BalanceAfter_Merchant(amountStr: string): number {
        const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''));
        return this.balanceBeforeW2W_MerchantVar - amount;
    }

    /**
     * Computes the expected Biller balance after W2W credit.
     * Mirrored from Java: expectedBalanceAfterW2W_Biller(amount)
     */
    expected_BalanceAfter_Biller(amountStr: string): number {
        const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''));
        return this.balanceBeforeW2W_BillerVar + amount;
    }

    // ============================================================
    // ---------- Safe Balance Assertions ----------
    // ============================================================

    /**
     * Asserts that the Merchant's balance has been correctly DEBITED after W2W.
     * Uses a ±0.1 tolerance to account for minor rounding, mirroring Java's BigDecimal logic.
     * Mirrored from Java: verifyBalanceAfterW2W_Merchant(amount)
     */
    async checkBalanceAfterTransfer_Safe_Merchant(amountStr: string) {
        const actualBalance = await this.readBalanceAfterTransfer_Merchant();
        const expectedBalance = this.expected_BalanceAfter_Merchant(amountStr);

        const actualRounded = Math.round(actualBalance * 100) / 100;
        const expectedRounded = Math.round(expectedBalance * 100) / 100;
        const difference = Math.abs(actualRounded - expectedRounded);
        const tolerance = 0.1;

        console.log(`   [Merchant] Expected Balance: ${expectedRounded} | Actual Balance: ${actualRounded} | Diff: ${difference}`);
        if (difference > tolerance) {
            throw new Error(
                `Merchant wallet balance did not DECREASE correctly after W2W transfer. Expected ≈${expectedRounded}, but found: ${actualRounded}`
            );
        }
        expect(difference).toBeLessThanOrEqual(tolerance);
    }

    /**
     * Asserts that the Biller's balance has been correctly CREDITED after W2W.
     * Uses a ±0.1 tolerance to account for minor rounding, mirroring Java's BigDecimal logic.
     * Mirrored from Java: verifyBalanceAfterW2W_Biller(amount)
     */
    async checkBalanceAfterTransfer_Safe_Biller(amountStr: string) {
        const actualBalance = await this.readBalanceAfterTransfer_Biller();
        const expectedBalance = this.expected_BalanceAfter_Biller(amountStr);

        const actualRounded = Math.round(actualBalance * 100) / 100;
        const expectedRounded = Math.round(expectedBalance * 100) / 100;
        const difference = Math.abs(actualRounded - expectedRounded);
        const tolerance = 0.1;

        console.log(`   [Biller]   Expected Balance: ${expectedRounded} | Actual Balance: ${actualRounded} | Diff: ${difference}`);
        if (difference > tolerance) {
            throw new Error(
                `Biller wallet balance did not INCREASE correctly after W2W transfer. Expected ≈${expectedRounded}, but found: ${actualRounded}`
            );
        }
        expect(difference).toBeLessThanOrEqual(tolerance);
    }

    // ============================================================
    // ---------- W2W Form Action Methods ----------
    // ============================================================

    /**
     * Enters the receiver CRN (Unified Number) into the CRN input field.
     * Mirrored from Java: enterCRN(String crn)
     */
    async enterCRN(crn: string) {
        await expect(this.inputCRN).toBeVisible({ timeout: 15000 });
        await this.inputCRN.clear();
        await this.inputCRN.fill(crn);
    }

    /**
     * Enters the transfer amount into the amount field.
     * Mirrored from Java: enterAmount(String amount) — uses pressSequentially to trigger field-level validation events.
     */
    async enterAmount(amount: string) {
        await expect(this.inputAmount).toBeVisible({ timeout: 15000 });
        await this.inputAmount.clear();
        await this.inputAmount.pressSequentially(amount);
    }

    /**
     * Selects a random predefined amount chip.
     */
    async selectRandomPredefinedAmount() {
        await expect(this.predefinedAmountChips.first()).toBeVisible({ timeout: 15000 });

        const count = await this.predefinedAmountChips.count();
        if (count === 0) {
            throw new Error('No predefined amounts found.');
        }

        const randomIndex = Math.floor(Math.random() * count);
        const chosen = this.predefinedAmountChips.nth(randomIndex);

        const selectedText = (await chosen.textContent())?.trim() ?? '';
        console.log(`   Selected predefined amount: "${selectedText}"`);

        await chosen.click();
    }

    /**
     * Clicks the Check Recipient button to trigger CRN validation lookup.
     * Mirrored from Java: clickCheckRecipient()
     */
    async clickCheckRecipient() {
        await expect(this.checkRecipientButton).toBeEnabled({ timeout: 15000 });
        await this.checkRecipientButton.click();
    }

    /**
     * Opens the Purpose of Transfer dropdown.
     * Mirrored from Java: openPurposeOfTransferDropdown()
     */
    async openPurposeOfTransferDropdown() {
        await expect(this.purposeOfTransferDropdown).toBeVisible({ timeout: 15000 });
        await this.purposeOfTransferDropdown.click();
    }

    /**
     * Selects a random visible option from the Purpose of Transfer dropdown.
     * Mirrored from Java: selectRandomPurposeOfTransfer() with JavascriptExecutor fallback.
     */
    async selectRandomPurposeOfTransfer() {
        await this.openPurposeOfTransferDropdown();
        console.log('   PurposeOfTransfer dropdown opened');

        // Wait for the dropdown panel options to be visible
        const optionsLocator = this.page.locator(
            '[id*="floating-dropdown-purpose-of-transfer"][id*="panel"] [role="option"],' +
            ' [id*="purpose-of-transfer-panel"] [role="option"],' +
            ' mat-option'
        );

        await expect(optionsLocator.first()).toBeVisible({ timeout: 10000 });

        const count = await optionsLocator.count();
        if (count === 0) {
            throw new Error('No Purpose of Transfer options found in the dropdown panel.');
        }

        // Filter to only visible options
        const visibleIndices: number[] = [];
        for (let i = 0; i < count; i++) {
            if (await optionsLocator.nth(i).isVisible()) {
                visibleIndices.push(i);
            }
        }

        if (visibleIndices.length === 0) {
            throw new Error('All dropdown options are hidden — none are visible to select.');
        }

        // Log available options
        console.log('   Available Purpose of Transfer options:');
        for (const idx of visibleIndices) {
            const text = (await optionsLocator.nth(idx).textContent())?.trim() ?? '';
            console.log(`      ${idx} - ${text}`);
        }

        const randomIndex = visibleIndices[Math.floor(Math.random() * visibleIndices.length)];
        const chosen = optionsLocator.nth(randomIndex);

        // Scroll into view and click — use JS force-click as fallback (mirrors Java ElementClickInterceptedException handling)
        await chosen.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(300);

        try {
            await chosen.click({ timeout: 5000 });
        } catch {
            console.log('   Standard click intercepted — attempting force click via JS');
            await chosen.evaluate((el: HTMLElement) => el.click());
        }

        const selectedText = (await chosen.textContent())?.trim() ?? '';
        console.log(`   Selected Purpose of Transfer: "${selectedText}"`);
    }

    /**
     * Clicks the amount input to trigger any blur/focus validation events.
     * Mirrored from Java: clickAmountInput()
     */
    async clickAmountInput() {
        await expect(this.inputAmount).toBeVisible({ timeout: 10000 });
        await this.inputAmount.click();
    }

    /**
     * Clicks the Proceed button to advance to the transfer summary screen.
     * Mirrored from Java: clickProceedButton()transferButton
     */
    async clickProceedButton() {
        await expect(this.proceedButton).toBeVisible({ timeout: 15000 });
        await expect(this.proceedButton).toBeEnabled({ timeout: 15000 });
        await this.proceedButton.click();
    }

    /**
     * Clicks the final Transfer / Submit button to confirm and execute the W2W transfer.
     * Mirrored from Java: clickTransferButton()
     */
    async clickTransferButton() {
        await expect(this.transferButton).toBeVisible({ timeout: 15000 });
        await expect(this.transferButton).toBeEnabled({ timeout: 15000 });
        await this.transferButton.click();
    }

    /**
     * Clicks the Ok button on the success message screen.
     */
    async clickOkButton() {
        await expect(this.okButton).toBeVisible({ timeout: 15000 });
        await expect(this.okButton).toBeEnabled({ timeout: 15000 });
        await this.okButton.click();
    }

    // ============================================================
    // ---------- Assertions ----------
    // ============================================================

    /**
     * Asserts the W2W transaction status in the Transaction Table is "success".
     * Mirrored from Java: assertW2WTransactionIsSuccess(String status)
     */
    assertW2WTransactionIsSuccess(status: string) {
        if (status.toLowerCase() !== 'success') {
            throw new Error(
                `W2W transaction did NOT appear as SUCCESS in the transaction table! Found: "${status}"`
            );
        }
        expect(status.toLowerCase()).toBe('success');
        console.log(`   Assertion Passed: Transaction status is "${status.toUpperCase()}" ✔`);
    }

    /**
     * Asserts the company name div is EMPTY after an invalid CRN lookup.
     * An empty div confirms the system correctly rejected the unrecognised CRN.
     * Mirrored from Java: assertCompanyNameIsEmpty()
     */
    async assertCompanyNameIsEmpty() {
        await expect(this.companyNameDiv).toBeVisible({ timeout: 15000 });
        const text = ((await this.companyNameDiv.textContent()) ?? '').trim();
        console.log(`   Company name div text: "${text}"`);
        if (text !== '') {
            throw new Error(
                `Expected company name div to be EMPTY for invalid CRN, but found: "${text}"`
            );
        }
        expect(text).toBe('');
        console.log('   Assertion Passed: Company name div is empty — invalid CRN correctly rejected ✔');
    }

    /**
     * Retrieves the current value of the amount input field.
     * Mirrored from Java: getAmountValue()
     */
    async getAmountValue(): Promise<string> {
        try {
            await this.inputAmount.waitFor({ state: 'visible', timeout: 5000 });
            return (await this.inputAmount.inputValue()).trim();
        } catch {
            console.log('   Amount input field not found or not visible.');
            return '';
        }
    }

    /**
     * Asserts that an invalid amount was NOT accepted by the field-level UI filter.
     * Mirrored from Java: assertInvalidAmountNotAccepted(String Amount, String AmountValidation)
     */
    async assertInvalidAmountNotAccepted(amount: string, amountValidation: string) {
        console.log(`   [Negative Flow] Testing input: "${amount}" | Type: ${amountValidation}`);
        const enteredAmount = await this.getAmountValue();
        // The UI should strip or block the invalid value — it must NOT be an exact match
        if (enteredAmount === amount) {
            throw new Error(
                `Invalid amount was accepted by the field: "${amount}" (Type: ${amountValidation}). The system should reject zero, negative, character, or special character inputs.`
            );
        }
        expect(enteredAmount).not.toBe(amount);
        console.log(`   Passed: UI filter blocked the input. Field currently holds: [${enteredAmount}] ✔`);
    }

    /**
     * Asserts that the Check Recipient button is DISABLED when an invalid amount is entered.
     * Mirrored from Java: assertCheckRecipientButtonIsDisabled()
     */
    async assertCheckRecipientButtonIsDisabled() {
        console.log('   Verifying that Check Recipient button is DISABLED...');
        await expect(this.checkRecipientButton).toBeDisabled({ timeout: 10000 });
        console.log('   Assertion Passed: Check Recipient button is correctly DISABLED ✔');
    }

    /**
     * Asserts the insufficient fund toast error is visible on screen.
     * Mirrored from Java: ToastMessages.verifyInsufficientFundMessageDisplayed()
     */
    async assertInsufficientFundToastDisplayed() {
        await expect(this.toastErrorMessage).toBeVisible({ timeout: 15000 });
        const toastText = ((await this.toastErrorMessage.textContent()) ?? '').toLowerCase();
        console.log(`   Toast message text: "${toastText}"`);
        expect(
            toastText.includes('insufficient') || toastText.includes('balance') || toastText.includes('fund'),
            `Expected an insufficient fund error toast, but toast reads: "${toastText}"`
        ).toBeTruthy();
        console.log('   Assertion Passed: Insufficient fund toast error is displayed ✔');
    }

    /**
     * Asserts the "No recipient found" toast error is visible on screen.
     */
    async assertNoRecipientFoundToast() {
        await expect(this.toastErrorMessage).toBeVisible({ timeout: 15000 });
        const toastText = ((await this.toastErrorMessage.textContent()) ?? '').toLowerCase();
        console.log(`   Toast message text: "${toastText}"`);
        if (!toastText.includes('no recipient found')) {
            throw new Error(`Expected a 'No recipient found' toast, but toast reads: "${toastText}"`);
        }
        console.log('   Assertion Passed: "No recipient found" toast error is displayed ✔');
    }
}
