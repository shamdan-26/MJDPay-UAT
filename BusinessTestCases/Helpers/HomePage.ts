import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
    readonly page: Page;
    readonly profileIcon: Locator;
    readonly logoutButton: Locator;
    readonly TopupButton: Locator;
    readonly ManageUsers_NavButton: Locator;
    readonly Bills_NavButton: Locator;
    readonly BillPayment_NavButton: Locator;
    readonly BillReport_NavButton: Locator;
    readonly Transactions_NavButton: Locator;
    readonly transferButton: Locator;
    readonly W2WTransferButton: Locator;
    readonly Home_NavButton: Locator;
    readonly currentBalance: Locator;

    constructor(page: Page) {
        this.page = page;

        this.Home_NavButton = page.locator('#sideNav-menu-item-0');

        // Locators mapped from Java FindBy elements - updated to handle release/v6.0.0 layout changes
        this.profileIcon = page.locator("button#userSettings-image-container")
            .or(page.locator("#userSettings-image-container"))
            .or(page.locator("//*[@id='ddl_profile']/img"));

        this.logoutButton = page.locator("button#logout")
            .or(page.locator("#btn_profile_logout"));

        this.TopupButton = page.locator("#quick-topup")
            .or(page.locator("#btn_top_up"))
            .or(page.getByRole('link', { name: /top up/i }))
            .or(page.getByText(/top up/i));

        this.ManageUsers_NavButton = page.getByRole('button', { name: /manage accounts/i })
            .or(page.getByText(/manage accounts/i))
            .or(page.locator("(//span[@class='icon'])[4]"));

        this.Bills_NavButton = page.getByRole('button', { name: /^bills$/i })
            .or(page.getByText(/^bills$/i))
            .or(page.locator("(//span[@class='icon'])[5]"));

        this.BillPayment_NavButton = page.getByRole('link', { name: /bill payment/i })
            .or(page.getByText(/bill payment/i))
            .or(page.locator("(//span[@class='mdc-list-item__content'])[11]"));

        this.BillReport_NavButton = page.getByRole('link', { name: /bill reports?/i })
            .or(page.getByText(/bill reports?/i))
            .or(page.locator("(//span[@class='mdc-list-item__content'])[12]"));

        this.Transactions_NavButton = page.locator('#sideNav-menu-item-1');

        this.transferButton = page.locator("#quick-bank");
        this.W2WTransferButton = page.locator('#quick-transfer')
            .or(page.getByRole('button', { name: /wallet transfer/i }));

        this.currentBalance = page.locator(".mp-bal-amount").or(page.locator("//div[@class='price']//span[@id='balance-amount']"));
    }

    // ---------- Actions ----------

    async clickTopupButton() {
        await expect(this.TopupButton).toBeEnabled({ timeout: 30000 });
        await this.TopupButton.click();
    }

    async clickTransferButton() {
        await expect(this.transferButton).toBeEnabled({ timeout: 30000 });
        await this.transferButton.click();
    }

    async clickW2WTransferButton() {
        await expect(this.W2WTransferButton).toBeEnabled({ timeout: 30000 });
        await this.W2WTransferButton.click();
    }

    async clickManageUsers_NavButton() {
        await expect(this.ManageUsers_NavButton).toBeEnabled({ timeout: 30000 });
        await this.ManageUsers_NavButton.click();
    }

    async clicBills_NavButton() {
        await expect(this.Bills_NavButton).toBeEnabled({ timeout: 30000 });
        await this.Bills_NavButton.click();
    }

    async clickBillPayment_NavButton() {
        await expect(this.BillPayment_NavButton).toBeEnabled({ timeout: 30000 });
        await this.BillPayment_NavButton.click();
    }

    async clicBillReport_NavButton() {
        // Handle intermediate wait for the parent element's visibility if needed
        const intermediate = this.page.locator("(//span[@class='mdc-list-item__content'])[10]");
        await expect(intermediate).toBeVisible({ timeout: 30000 });

        await expect(this.BillReport_NavButton).toBeEnabled({ timeout: 30000 });
        await this.BillReport_NavButton.click();
    }

    async clicTransactions_NavButton() {
        await expect(this.Transactions_NavButton).toBeVisible({ timeout: 30000 });
        await expect(this.Transactions_NavButton).toBeEnabled({ timeout: 30000 });
        await this.Transactions_NavButton.click();
    }

    async clickHome_NavButton() {
        await expect(this.Home_NavButton).toBeVisible({ timeout: 30000 });
        await expect(this.Home_NavButton).toBeEnabled({ timeout: 30000 });
        await this.Home_NavButton.click();
    }

    async getWalletBalance(): Promise<number> {
        // Wait until wallet balance text is populated (contains a digit)
        await expect(this.currentBalance).toContainText(/\d/, { timeout: 30000 });

        // Retrieve and parse the balance
        const balanceText = (await this.currentBalance.textContent())?.trim() ?? "";
        console.log(`Raw wallet balance text: [${balanceText}]`);

        const cleanedText = balanceText.replace(/[^\d.]/g, "");
        if (cleanedText === "") {
            throw new Error(`Wallet balance text is empty or not numeric: ${balanceText}`);
        }

        const walletBalance = parseFloat(cleanedText);
        console.log(`Wallet Balance: ${walletBalance}`);
        return walletBalance;
    }
}
