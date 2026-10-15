import { test, expect, type Page } from '@playwright/test';
import { DashboardPage } from '../../pageElements/Shared/DashboardPage';
import { HomePage } from '../../pageElements/Shared/HomePage';
import { W2WTransferPage } from '../../pageElements/W2WTransfer/W2WTransferPage';
import { performLogin, type W2WTestData } from '../W2WTransferHelper';
import w2wData from '../../../data/w2wTransferData.json';

const dataSets = w2wData as W2WTestData[];
const baseData = dataSets.find(d => d.execute) ?? dataSets[0]!;

// Arabic-locale checks for the W2W Transfer flow — no prior coverage existed
// for this here despite BankTransfer having its own (ui/BankTransferLocalization.spec.ts).
// Per QA-DATA-TESTID-HANDOFF.md, the frontend replaced text-based locators
// with `data-testid` specifically so these controls resolve identically in
// English and Arabic; this file verifies that promise for the CRN entry,
// Check Recipient, and Proceed controls the same way BankTransfer's does.
test.describe('W2WTransfer — Arabic Localization', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(90000);

    let page: Page;
    let dashboard: DashboardPage;
    let homePage: HomePage;
    let w2w: W2WTransferPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await performLogin(page, baseData.companyNumber, baseData.mobileNumber, baseData.password, baseData.otpCode ?? '0000');

        dashboard = new DashboardPage(page);
        homePage = new HomePage(page);
        w2w = new W2WTransferPage(page);

        await dashboard.switchLanguage('ar');
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await homePage.clickW2WTransferButton();
        await expect(w2w.inputCRN).toBeVisible({ timeout: 15000 });
    });

    test('should render the page in right-to-left direction', async () => {
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });

    test('should resolve the CRN input and Check Recipient button via testid locators in Arabic', async () => {
        await w2w.enterCRN(baseData.receiverCRN);
        await expect(w2w.checkRecipientButton).toBeEnabled({ timeout: 5000 });
    });

    test('should display the Proceed button label in Arabic once the form is valid', async () => {
        await w2w.enterCRN(baseData.receiverCRN);
        await w2w.clickCheckRecipient();
        await w2w.waitForRecipientCheckToSettle();
        await w2w.enterAmount('10');
        await w2w.selectRandomPurposeOfTransfer();
        await expect(w2w.proceedButton).toHaveText(/متابعة/);
    });
});
