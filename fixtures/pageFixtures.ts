import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pageObjects/LoginPage';
import { HomePage } from '../pageObjects/HomePage';
import { BankTransferPage } from '../pageObjects/BankTransferPage';
import { BillsPage } from '../pageObjects/BillsPage';
import { CreateSingleBillPage } from '../pageObjects/CreateSingleBillPage';
import { TopupPage } from '../pageObjects/TopupPage';
import { TransactionsPage } from '../pageObjects/TransactionsPage';
import { W2WTransferPage } from '../pageObjects/W2WTransferPage';
import { ToastMessages } from '../pageObjects/common/ToastMessages';

// Define the custom fixtures type
type CustomFixtures = {
    loginPage: LoginPage;
    homePage: HomePage;
    bankTransferPage: BankTransferPage;
    billsPage: BillsPage;
    createSingleBillPage: CreateSingleBillPage;
    topupPage: TopupPage;
    transactionsPage: TransactionsPage;
    w2wTransferPage: W2WTransferPage;
    toastMessages: ToastMessages;
};

// Extend base test to include all POMs
export const test = base.extend<CustomFixtures>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    homePage: async ({ page }, use) => {
        await use(new HomePage(page));
    },
    bankTransferPage: async ({ page }, use) => {
        await use(new BankTransferPage(page));
    },
    billsPage: async ({ page }, use) => {
        await use(new BillsPage(page));
    },
    createSingleBillPage: async ({ page }, use) => {
        await use(new CreateSingleBillPage(page));
    },
    topupPage: async ({ page }, use) => {
        await use(new TopupPage(page));
    },
    transactionsPage: async ({ page }, use) => {
        await use(new TransactionsPage(page));
    },
    w2wTransferPage: async ({ page }, use) => {
        await use(new W2WTransferPage(page));
    },
    toastMessages: async ({ page }, use) => {
        await use(new ToastMessages(page));
    }
});

export { expect };

/*
TEMPLATE / GUIDE FOR ADDING NEW PAGE OBJECTS:
---------------------------------------------
If you create a new Page Object in the `pageObjects` directory, follow these steps to register it:

1. Import the new Page Object at the top of this file:
   import { NewPage } from '../pageObjects/NewPage';

2. Add the new page object fixture type to the `CustomFixtures` type definition:
   type CustomFixtures = {
       ...
       newPage: NewPage;
   };

3. Register the new fixture in the `base.extend<CustomFixtures>` call:
   newPage: async ({ page }, use) => {
       await use(new NewPage(page));
   }

Now you can inject `newPage` directly into your spec files:
test('example test', async ({ loginPage, newPage }) => {
    // Both page objects are automatically instantiated and ready to use
});
*/
