import { test as base, expect } from '@playwright/test';

import { BankTransferPage } from './pageElements/BankTransferPage';
import { BillsPage } from './pageElements/BillsPage';
import { DashboardPage } from './pageElements/DashboardPage';
import { ForgotPasswordPage } from './pageElements/ForgotPasswordPage';
import { HomePage } from './pageElements/HomePage';
import { HomepageBalanceCardPage } from './pageElements/HomepageBalanceCardPage';
import { HomepageBillsOverviewPage } from './pageElements/HomepageBillsOverviewPage';
import { HomepageGreetingPage } from './pageElements/HomepageGreetingPage';
import { HomepageHeaderPage } from './pageElements/HomepageHeaderPage';
import { HomepageQuickActionsPage } from './pageElements/HomepageQuickActionsPage';
import { HomepageSidebarPage } from './pageElements/HomepageSidebarPage';
import { HomepageSubWalletsPage } from './pageElements/HomepageSubWalletsPage';
import { HomepageTransactionsPage } from './pageElements/HomepageTransactionsPage';
import { LoginPage } from './pageElements/LoginPage';
import { OtpPage } from './pageElements/OtpPage';
import { PaymentLinkPage } from './pageElements/PaymentLinkPage';
import { ProductsManagementPage } from './pageElements/ProductsManagementPage';
import { RegistrationFinancialPage } from './pageElements/RegistrationFinancialPage';
import { RegistrationInfoPage } from './pageElements/RegistrationInfoPage';
import { RegistrationMobilePage } from './pageElements/RegistrationMobilePage';
import { RegistrationNafathPage } from './pageElements/RegistrationNafathPage';
import { RegistrationProductsPage } from './pageElements/RegistrationProductsPage';
import { RegistrationVerificationPage } from './pageElements/RegistrationVerificationPage';
import { TopupPage } from './pageElements/TopupPage';
import { TransactionsPage } from './pageElements/TransactionsPage';
import { W2WTransferPage } from './pageElements/W2WTransferPage';

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
    homepageSubWallets: HomepageSubWalletsPage;
    homepageTransactions: HomepageTransactionsPage;
    loginPage: LoginPage;
    otp: OtpPage;
    paymentLink: PaymentLinkPage;
    productsManagement: ProductsManagementPage;
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
    homepageSubWallets: async ({ page }, use) => { await use(new HomepageSubWalletsPage(page)); },
    homepageTransactions: async ({ page }, use) => { await use(new HomepageTransactionsPage(page)); },
    loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
    otp: async ({ page }, use) => { await use(new OtpPage(page)); },
    paymentLink: async ({ page }, use) => { await use(new PaymentLinkPage(page)); },
    productsManagement: async ({ page }, use) => { await use(new ProductsManagementPage(page)); },
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
