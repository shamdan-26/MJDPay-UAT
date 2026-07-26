import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomePage } from '../../pageElements/Shared/HomePage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { TopupSadadPage } from '../../pageElements/Topup/TopupSadadPage';
import { HOME_URL } from '../TopupHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';
import topupData from '../../../data/topupData.json';

// SADAD bill top-up (EMI-3564), status "To Do" in Jira when this was authored —
// this feature may not exist in UAT yet. See TopupSadadPage.ts for the locator
// caveat. Maps to docs/manual-test-cases/B2B-Transactions.md TU-09..TU-14.
//
// Unlike TopupFlow.spec.ts's card flow (real money movement, `describe.serial`
// per the Senior_QA_Automation_Expert.md conditional-isolation rule), bill
// *generation* is a standalone action per test — default (parallel-safe) mode.

type TopupTestData = { companyNumber: string; mobileNumber: string; password: string };
const loginData = (topupData as TopupTestData[]).find(d => d.companyNumber) as TopupTestData;

async function loginAndOpenTopup(page: Page): Promise<void> {
    const loginPage = new LoginPage(page);
    const otp = new OtpPage(page);

    await loginPage.goto(LOGIN_URL);
    await loginPage.fillAndSubmit(loginData.companyNumber, loginData.mobileNumber, loginData.password);
    if (await otp.isVisible()) {
        await otp.fillAndVerify(await getOtpFromDb(loginData.mobileNumber));
    }
    await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });

    await page.goto(HOME_URL);
    await page.waitForLoadState('domcontentloaded');
    const quickActions = new HomepageQuickActionsPage(page);
    await quickActions.quickActionTopupCard.click();
}

test.describe('Topup — SADAD Bill Generation (TU-09, TU-10)', () => {
    test('TU-09: should generate a SADAD top-up bill with reference, amount, and expiry', async ({ page }) => {
        await loginAndOpenTopup(page);

        const sadad = new TopupSadadPage(page);
        await sadad.selectSadad();
        await sadad.enterAmount('100');
        await sadad.clickGenerateBill();

        await sadad.assertBillGenerated();
    });

    test('TU-10: should offer download or copy-reference actions on a generated bill', async ({ page }) => {
        await loginAndOpenTopup(page);

        const sadad = new TopupSadadPage(page);
        await sadad.selectSadad();
        await sadad.enterAmount('50');
        await sadad.clickGenerateBill();
        await sadad.assertBillGenerated();

        await expect(sadad.downloadPdfButton.or(sadad.copyReferenceButton)).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Topup — SADAD Bill Listing (TU-11)', () => {
    test('TU-11: "My Sadad Bills" should list previously generated bills with reference/amount/date/status', async ({ page }) => {
        await loginAndOpenTopup(page);

        const sadad = new TopupSadadPage(page);
        await sadad.selectSadad();
        await sadad.enterAmount('75');
        await sadad.clickGenerateBill();
        await sadad.assertBillGenerated();

        await sadad.openMyBills();
        const count = await sadad.getBillRowCount();
        expect(count).toBeGreaterThan(0);
    });
});

test.describe('Topup — SADAD Error Handling (TU-13)', () => {
    test('TU-13: should show a user-friendly error when SADAD bill creation fails', async ({ page }) => {
        await page.route('**/sadad/**/create-bill', route =>
            route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: 'Sadad service unavailable' }) })
        );

        await loginAndOpenTopup(page);

        const sadad = new TopupSadadPage(page);
        await sadad.selectSadad();
        await sadad.enterAmount('40');
        await sadad.clickGenerateBill();

        await expect(sadad.billCreationError).toBeVisible({ timeout: 15000 });
    });
});
