import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/LoginPage';
import { OtpPage } from '../../pageElements/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/HomepageQuickActionsPage';
import { HomepageSidebarPage } from '../../pageElements/HomepageSidebarPage';
import { TopupPage } from '../../pageElements/TopupPage';
import { HOME_URL } from '../TopupHelper';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/LoginHelper';

// Element-presence assertions for the Topup page only. Amount-field
// validation, payment-method selection, and preset-override behavior are
// interactions, not presence checks — they live in the functional/ files.
//
// Topup is only reachable once logged in, then either via the "Topup" side
// menu link or the "Add money via card" quick-action card on the home page.
// The suite below runs against both entry points to make sure the page
// renders identically regardless of how the user got there.

test.describe('Topup – Page Elements', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let sidebar: HomepageSidebarPage;
    let topup: TopupPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();

        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        quickActions = new HomepageQuickActionsPage(page);
        sidebar = new HomepageSidebarPage(page);
        topup = new TopupPage(page);

        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
    });

    test.afterAll(async () => {
        await page.close();
    });

    const entryPoints: { name: string; navigate: () => Promise<void> }[] = [
        { name: 'home page quick action', navigate: async () => { await quickActions.quickActionTopupCard.click(); } },
        { name: 'side menu link', navigate: async () => { await sidebar.topupSidebarLink.click(); } },
    ];

    for (const entry of entryPoints) {
        test.describe(`reached via ${entry.name}`, () => {
            test.describe.configure({ mode: 'serial' });

            test.beforeEach(async () => {
                await page.goto(HOME_URL);
                await page.waitForLoadState('domcontentloaded');
                await entry.navigate();
                await expect(topup.inputAmount).toBeVisible({ timeout: 15000 });
            });

            // ── Page hero ──────────────────────────────────────────────────────────────

            test('should display the "Top up" page title and its description', async () => {
                await expect(topup.pageTitle).toHaveText(/top ?up/i);
                await expect(topup.pageSubtitle).toHaveText(/add funds to your business wallet using a card or wallet supported in saudi arabia/i);
            });

            // ── Balance card ───────────────────────────────────────────────────────────

            test('should display the Current Balance label and a numeric balance amount', async () => {
                await expect(topup.balanceCardLabel).toHaveText(/current balance/i);
                await expect(topup.balanceAmount).toBeVisible();
                await expect(topup.balanceAmount).toContainText(/\d/);
            });

            test('should display the wallet code next to the balance', async () => {
                await expect(topup.balanceWalletCode).toHaveText(/wallet code\s+[A-Z0-9-]+/i);
            });

            test('should display the generate QR Code and wallet settings buttons on the balance card', async () => {
                await expect(topup.balanceQrButton).toBeVisible();
                await expect(topup.balanceSettingsButton).toBeVisible();
            });

            // ── Payment methods ──────────────────────────────────────────────────────────

            test('should display the "Payment Methods" label', async () => {
                await expect(topup.paymentMethodsLabel).toBeVisible();
            });

            test('should display MADA, VISA, and MASTER as payment method options', async () => {
                await expect(topup.madaOption).toBeVisible();
                await expect(topup.visaOption).toBeVisible();
                await expect(topup.masterOption).toBeVisible();
            });

            test('should have exactly 3 payment method options', async () => {
                await expect(topup.paymentMethodOptions).toHaveCount(3);
            });

            // ── Amount field ───────────────────────────────────────────────────────────

            test('should display the "0.00" placeholder in the amount input with a currency icon', async () => {
                await expect(topup.inputAmount).toHaveAttribute('placeholder', '0.00');
                await expect(topup.amountCurrencyIcon).toBeVisible();
            });

            test('should keep Proceed disabled while the amount field is empty', async () => {
                await expect(topup.inputAmount).toHaveValue('');
                await expect(topup.proceedButton).toBeDisabled();
            });

            // ── Preset amount chips ──────────────────────────────────────────────────────

            test('should display the "Or select amount" label and all 5 preset amount chips', async () => {
                await expect(topup.quickAmountLabel).toHaveText(/or select amount/i);
                await expect(topup.presetAmountChips).toHaveCount(5);

                const expected = ['500', '1000', '2000', '5000', '10000'];
                const texts = (await topup.presetAmountChips.allTextContents()).map(t => t.trim());
                expect(texts).toEqual(expected);
            });

            // ── Disclaimer ───────────────────────────────────────────────────────────────

            test('should display the Hyper Pay disclaimer text', async () => {
                await expect(topup.disclaimerText).toBeVisible();
                await expect(topup.disclaimerText).toContainText(/hyper pay/i);
                await expect(topup.disclaimerText).toContainText(/do not store any information/i);
            });

            // ── Proceed button ───────────────────────────────────────────────────────────

            test('should display the Proceed button with its arrow icon', async () => {
                await expect(topup.proceedButton).toBeVisible();
                await expect(topup.proceedButton).toHaveText(/proceed/i);
                await expect(topup.proceedButton.locator('svg')).toBeVisible();
            });
        });
    }
});
