import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { HomepageSidebarPage } from '../../pageElements/Shared/HomepageSidebarPage';
import { DashboardPage } from '../../pageElements/Shared/DashboardPage';
import { TopupPage } from '../../pageElements/Topup/TopupPage';
import { HOME_URL } from '../TopupHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Element-presence assertions for the Topup "Summary" step — the screen shown
// after Proceed is clicked on the amount page (mp-page-hero "Top Up Summary").
// Covers both the app shell (logo, sidebar, account widget, top nav, profile
// dropdown) and the page-specific balance/transaction-breakdown cards. Whether
// the commission/VAT math itself is correct is a business-logic question and
// lives in functional/, not here.

/**
 * Mirrors BankTransfer's proceedToConfirmation — the Next button occasionally
 * doesn't register the summary transition on a slow/loaded dev backend, so
 * poll rather than wait a fixed amount of time.
 */
async function proceedToSummary(page: Page, topup: TopupPage): Promise<void> {
    await topup.clickProceedButton();

    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
        if (await topup.summaryNextButton.isVisible().catch(() => false)) return;
        await page.waitForTimeout(2000);
        if (await topup.proceedButton.isEnabled().catch(() => false)) {
            await topup.proceedButton.click().catch(() => {});
        }
    }
    await expect(topup.summaryNextButton).toBeVisible({ timeout: 5000 });
}

test.describe('Topup – Page Elements – Summary step', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let sidebar: HomepageSidebarPage;
    let dashboard: DashboardPage;
    let topup: TopupPage;

    test.beforeAll(async ({ browser }) => {
        test.setTimeout(150000);
        page = await browser.newPage();

        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        quickActions = new HomepageQuickActionsPage(page);
        sidebar = new HomepageSidebarPage(page);
        dashboard = new DashboardPage(page);
        topup = new TopupPage(page);

        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });

        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await quickActions.quickActionTopupCard.click();
        await expect(topup.inputAmount).toBeVisible({ timeout: 15000 });
        await topup.enterAmount('100');
        await topup.selectPaymentMethod('visa');
        await proceedToSummary(page, topup);
        await topup.waitForSummaryToSettle();
    });

    test.afterAll(async () => {
        await page.close();
    });

    // ── Header / Logo ────────────────────────────────────────────────────────

    test('should display two MajdPay logo images', async () => {
        await expect(dashboard.logoImages.first()).toBeVisible();
        await expect(dashboard.logoImages).toHaveCount(2);
    });

    // ── Main navigation sidebar ──────────────────────────────────────────────

    test('should display the Home and Transactions links', async () => {
        await expect.soft(dashboard.homeLink).toBeVisible();
        await expect.soft(dashboard.transactionsLink).toBeVisible();
    });

    test('should display the "Money" section label', async () => {
        await expect(sidebar.moneySectionLabel).toBeVisible();
    });

    test('should display the Topup link as the current page', async () => {
        await expect(sidebar.topupSidebarLink).toBeVisible();
    });

    test('should display the expandable Transfer item with its sub-links', async () => {
        await expect.soft(sidebar.transferSidebarItem).toBeVisible();
        await sidebar.transferSidebarItem.click();
        await expect.soft(sidebar.cashoutSidebarLink).toBeVisible();
        await expect.soft(sidebar.walletTransferSidebarLink).toBeVisible();
        await expect.soft(sidebar.internationalTransferSidebarLink).toBeVisible();
    });

    test('should display the International Transfer sub-link with a "Soon" tag', async () => {
        await expect(sidebar.internationalTransferSidebarLink).toContainText(/soon/i);
    });

    test('should display the Bills, Payment Links, and Sub-wallets links', async () => {
        await expect.soft(sidebar.billsSidebarLink).toBeVisible();
        await expect.soft(sidebar.paymentLinksLink).toBeVisible();
        await expect.soft(sidebar.subWalletsSidebarLink).toBeVisible();
    });

    test('should display the SADAD link with a "Soon" tag', async () => {
        await expect(sidebar.sadadSidebarLink).toBeVisible();
        await expect(sidebar.sadadSidebarLink).toContainText(/soon/i);
    });

    test('should display the "Manage" section label', async () => {
        await expect(sidebar.manageSectionLabel).toBeVisible();
    });

    test('should display the expandable Manage accounts item with its sub-links', async () => {
        await expect.soft(sidebar.accountsPanel).toBeVisible();
        await sidebar.accountsPanel.click();
        await expect.soft(sidebar.manageUsersSidebarLink).toBeVisible();
        await expect.soft(sidebar.manageBeneficiarySidebarLink).toBeVisible();
    });

    test('should display the Manage Products, Groups & Roles, and Card Management links', async () => {
        await expect.soft(sidebar.manageProductsLink).toBeVisible();
        await expect.soft(sidebar.groupsRolesLink).toBeVisible();
        await expect.soft(sidebar.cardManagementLink).toBeVisible();
    });

    // ── Account widget (bottom of sidebar) ───────────────────────────────────

    test('should display the account widget avatar and company name', async () => {
        await expect.soft(dashboard.accountWidgetAvatar).toBeVisible();
        await expect.soft(dashboard.brandName).toContainText(/شركة النقد الرقمي لتقنية المعلومات/);
    });

    test('should display the "Sign out" button in the account widget', async () => {
        await expect(dashboard.accountWidgetSignOutButton).toBeVisible();
    });

    // ── Top navigation bar ────────────────────────────────────────────────────

    test('should display the menu toggle button', async () => {
        await expect(dashboard.menuToggleButton).toBeVisible();
    });

    test('should display the "Topup" title in the top nav bar', async () => {
        await expect(dashboard.topNavTitle).toHaveText(/top ?up/i);
    });

    test('should display the profile dropdown trigger', async () => {
        await expect(dashboard.profileTrigger).toBeVisible();
    });

    // ── Profile dropdown contents ────────────────────────────────────────────

    test.describe('profile dropdown', () => {
        test.beforeEach(async () => {
            await dashboard.profileTrigger.click();
            await expect(dashboard.logoutItem).toBeVisible({ timeout: 10000 });
        });

        test('should display the initials and company name', async () => {
            await expect.soft(dashboard.profileMenuInitials).toBeVisible();
            await expect.soft(dashboard.profileMenuCompanyName).toContainText(/شركة النقد الرقمي لتقنية المعلومات/);
        });

        test('should display the email and phone number', async () => {
            await expect.soft(dashboard.profileMenuEmail).toContainText('m.shahin@dg-cash.com');
            await expect.soft(dashboard.profileMenuPhone).toContainText('+966500021788');
        });

        test('should display the Settings and Profile menu items', async () => {
            await expect.soft(dashboard.settingsMenuItem).toBeVisible();
            await expect.soft(dashboard.profileMenuItem).toBeVisible();
        });

        test('should display the Notifications toggle switched on', async () => {
            await expect(dashboard.notificationsToggle).toBeChecked();
        });

        test('should display the Dark mode toggle switched on', async () => {
            await expect(dashboard.darkModeToggle).toBeChecked();
        });

        test('should display the language selector showing "ENG"', async () => {
            await expect(dashboard.languageSelector).toContainText('ENG');
        });

        test('should display the Wallet configuration and FAQs items', async () => {
            await expect.soft(dashboard.walletConfigurationMenuItem).toBeVisible();
            await expect.soft(dashboard.faqsMenuItem).toBeVisible();
        });

        test('should display the Sign out button', async () => {
            await expect(dashboard.logoutItem).toBeVisible();
        });
    });

    // ── Main content — "Top Up Summary" heading ──────────────────────────────

    test('should display the "Top Up Summary" heading and its subtext', async () => {
        await expect(topup.pageTitle).toHaveText(/top up summary/i);
        await expect(topup.pageSubtitle).toHaveText(/review the breakdown before continuing to payment/i);
    });

    // ── Balance card ──────────────────────────────────────────────────────────

    test('should display the Current balance label and value', async () => {
        await expect(topup.balanceCardLabel).toHaveText(/current balance/i);
        await expect(topup.balanceAmount).toBeVisible();
        await expect(topup.balanceAmount).toContainText(/\d/);
    });

    test('should display the wallet code next to the balance', async () => {
        await expect(topup.balanceWalletCode).toHaveText(/wallet code\s+[A-Z0-9-]+/i);
    });

    test('should display the generate QR Code and wallet settings buttons', async () => {
        await expect.soft(topup.balanceQrButton).toBeVisible();
        await expect.soft(topup.balanceSettingsButton).toBeVisible();
    });

    // ── Transaction breakdown card ────────────────────────────────────────────

    test('should display the Transaction Type and Payment Method rows', async () => {
        await expect.soft(topup.getSummaryText('Transaction Type')).resolves.toMatch(/merchant top up/i);
        await expect.soft(topup.getSummaryText('Payment Method')).resolves.toMatch(/visa/i);
    });

    test('should display the Original Amount, Commission, VAT, and Total amount rows', async () => {
        await expect.soft(topup.getSummaryMoney('Original Amount')).resolves.not.toBeNaN();
        await expect.soft(topup.getSummaryMoney('Commission')).resolves.not.toBeNaN();
        await expect.soft(topup.getSummaryMoney('VAT')).resolves.not.toBeNaN();
        await expect.soft(topup.getSummaryMoney('Total amount to be sent')).resolves.not.toBeNaN();
    });

    test('should display the Cancel and Next buttons', async () => {
        await expect.soft(topup.summaryCancelButton).toBeVisible();
        await expect.soft(topup.summaryNextButton).toBeVisible();
    });
});
