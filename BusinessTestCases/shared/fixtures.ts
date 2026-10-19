import { test as base, expect } from '@playwright/test';

import { BankTransferPage } from '../pageElements/Shared/BankTransferPage.ts';
import { BillsPage } from '../pageElements/PayBill/BillsPage.ts';
import { DashboardPage } from '../pageElements/Shared/DashboardPage.ts';
import { ForgotPasswordPage } from '../pageElements/ForgotPassword/ForgotPasswordPage.ts';
import { HomePage } from '../pageElements/Shared/HomePage.ts';
import { HomepageBalanceCardPage } from '../pageElements/Homepage/HomepageBalanceCardPage.ts';
import { HomepageBillsOverviewPage } from '../pageElements/Homepage/HomepageBillsOverviewPage.ts';
import { HomepageGreetingPage } from '../pageElements/Homepage/HomepageGreetingPage.ts';
import { HomepageHeaderPage } from '../pageElements/Homepage/HomepageHeaderPage.ts';
import { HomepageQuickActionsPage } from '../pageElements/Shared/HomepageQuickActionsPage.ts';
import { HomepageSidebarPage } from '../pageElements/Shared/HomepageSidebarPage.ts';
import { AppShellPage } from '../pageElements/Shared/AppShellPage.ts';
import { HomepageSubWalletsPage } from '../pageElements/Homepage/HomepageSubWalletsPage.ts';
import { HomepageTransactionsPage } from '../pageElements/Homepage/HomepageTransactionsPage.ts';
import { LoginPage } from '../pageElements/Shared/LoginPage.ts';
import { OtpPage } from '../pageElements/Shared/OtpPage.ts';
import { PaymentLinkPage } from '../pageElements/PaymentLinks/PaymentLinkPage.ts';
import { ProductsManagementPage } from '../pageElements/Products/ProductsManagementPage.ts';
import { RegistrationContractPage } from '../pageElements/Registration/RegistrationContractPage.ts';
import { RegistrationFinancialPage } from '../pageElements/Registration/RegistrationFinancialPage.ts';
import { RegistrationInfoPage } from '../pageElements/Registration/RegistrationInfoPage.ts';
import { RegistrationMobilePage } from '../pageElements/Registration/RegistrationMobilePage.ts';
import { RegistrationNafathPage } from '../pageElements/Registration/RegistrationNafathPage.ts';
import { RegistrationProductsPage } from '../pageElements/Registration/RegistrationProductsPage.ts';
import { RegistrationVerificationPage } from '../pageElements/Registration/RegistrationVerificationPage.ts';
import { TopupPage } from '../pageElements/Topup/TopupPage.ts';
import { TransactionsPage } from '../pageElements/Shared/TransactionsPage.ts';
import { W2WTransferPage } from '../pageElements/W2WTransfer/W2WTransferPage.ts';

/**
 * One lazy fixture per page object in `pageElements/`. Playwright only
 * constructs the ones a given test actually destructures, so bundling all
 * of them here costs nothing per-test. Spec files import `test`/`expect`
 * from this file instead of `@playwright/test` to get them injected.
 *
 * Homepage specs that share one session per worker use
 * `Homepage/HomepageFixtures.ts` instead (built on top of this file).
 */
type PageObjectFixtures = {
    bankTransfer: BankTransferPage;
    bills: BillsPage;
    dashboard: DashboardPage;
    forgotPassword: ForgotPasswordPage;
    homePage: HomePage;
    homepageBalanceCard: HomepageBalanceCardPage;
    homepageBillsOverview: HomepageBillsOverviewPage;
    homepageGreeting: HomepageGreetingPage;
    homepageHeader: HomepageHeaderPage;
    homepageQuickActions: HomepageQuickActionsPage;
    homepageSidebar: HomepageSidebarPage;
    appShell: AppShellPage;
    homepageSubWallets: HomepageSubWalletsPage;
    homepageTransactions: HomepageTransactionsPage;
    loginPage: LoginPage;
    otp: OtpPage;
    paymentLink: PaymentLinkPage;
    productsManagement: ProductsManagementPage;
    registrationContract: RegistrationContractPage;
    registrationFinancial: RegistrationFinancialPage;
    registrationInfo: RegistrationInfoPage;
    registrationMobile: RegistrationMobilePage;
    registrationNafath: RegistrationNafathPage;
    registrationProducts: RegistrationProductsPage;
    registrationVerification: RegistrationVerificationPage;
    topup: TopupPage;
    transactions: TransactionsPage;
    w2wTransfer: W2WTransferPage;
};

export const test = base.extend<PageObjectFixtures>({
    bankTransfer: async ({ page }, use) => { await use(new BankTransferPage(page)); },
    bills: async ({ page }, use) => { await use(new BillsPage(page)); },
    dashboard: async ({ page }, use) => { await use(new DashboardPage(page)); },
    forgotPassword: async ({ page }, use) => { await use(new ForgotPasswordPage(page)); },
    homePage: async ({ page }, use) => { await use(new HomePage(page)); },
    homepageBalanceCard: async ({ page }, use) => { await use(new HomepageBalanceCardPage(page)); },
    homepageBillsOverview: async ({ page }, use) => { await use(new HomepageBillsOverviewPage(page)); },
    homepageGreeting: async ({ page }, use) => { await use(new HomepageGreetingPage(page)); },
    homepageHeader: async ({ page }, use) => { await use(new HomepageHeaderPage(page)); },
    homepageQuickActions: async ({ page }, use) => { await use(new HomepageQuickActionsPage(page)); },
    homepageSidebar: async ({ page }, use) => { await use(new HomepageSidebarPage(page)); },
    appShell: async ({ page }, use) => { await use(new AppShellPage(page)); },
    homepageSubWallets: async ({ page }, use) => { await use(new HomepageSubWalletsPage(page)); },
    homepageTransactions: async ({ page }, use) => { await use(new HomepageTransactionsPage(page)); },
    loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
    otp: async ({ page }, use) => { await use(new OtpPage(page)); },
    paymentLink: async ({ page }, use) => { await use(new PaymentLinkPage(page)); },
    productsManagement: async ({ page }, use) => { await use(new ProductsManagementPage(page)); },
    registrationContract: async ({ page }, use) => { await use(new RegistrationContractPage(page)); },
    registrationFinancial: async ({ page }, use) => { await use(new RegistrationFinancialPage(page)); },
    registrationInfo: async ({ page }, use) => { await use(new RegistrationInfoPage(page)); },
    registrationMobile: async ({ page }, use) => { await use(new RegistrationMobilePage(page)); },
    registrationNafath: async ({ page }, use) => { await use(new RegistrationNafathPage(page)); },
    registrationProducts: async ({ page }, use) => { await use(new RegistrationProductsPage(page)); },
    registrationVerification: async ({ page }, use) => { await use(new RegistrationVerificationPage(page)); },
    topup: async ({ page }, use) => { await use(new TopupPage(page)); },
    transactions: async ({ page }, use) => { await use(new TransactionsPage(page)); },
    w2wTransfer: async ({ page }, use) => { await use(new W2WTransferPage(page)); },
});

// Re-export everything else from @playwright/test (Page, Browser, BrowserContext,
// expect, etc.) so spec files only need to swap their import source, not add a
// second import line for types. The explicit `test` export above wins over the
// star-exported one.
export * from '@playwright/test';
