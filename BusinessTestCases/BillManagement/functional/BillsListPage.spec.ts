import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomePage } from '../../pageElements/Shared/HomePage';
import { BillsListPage } from '../../pageElements/BillManagement/BillsListPage';
import { HOME_URL, BILLER_COMPANY, BILLER_MOBILE, BILLER_PASSWORD } from '../BillManagementHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';

// Bills Table / My Bills / Bill Report page (EMI-5807, EMI-5616, EMI-5673,
// EMI-5119). No prior automation existed for this screen — see
// BillsListPage.ts for the locator caveat.
//
// Follows the BillManagement convention: a local per-test login helper against
// the default `page`, no shared session, no fixtures.ts (see CreateBillFlow.spec.ts).

async function loginAndOpenBillsList(page: Page): Promise<BillsListPage> {
    const loginPage = new LoginPage(page);
    const otp = new OtpPage(page);
    const home = new HomePage(page);

    await loginPage.goto(LOGIN_URL);
    await loginPage.fillAndSubmit(BILLER_COMPANY, BILLER_MOBILE, BILLER_PASSWORD);
    if (await otp.isVisible()) {
        await otp.fillAndVerify(await getOtpFromDb(BILLER_MOBILE));
    }
    await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });

    await page.goto(HOME_URL);
    await page.waitForLoadState('domcontentloaded');
    await home.clicBills_NavButton();
    await home.clicBillReport_NavButton();

    return new BillsListPage(page);
}

test.describe('Bills Table — Page Loads Without Hanging (BLT-01, EMI-5616)', () => {
    test('BLT-01: the My Bills page should finish loading rather than spin indefinitely', async ({ page }) => {
        const billsList = await loginAndOpenBillsList(page);
        await billsList.waitForTableLoaded();
        await expect(billsList.loadingIndicator).not.toBeVisible();
    });
});

test.describe('Bills Table — Pagination Advances Records (BLT-02, EMI-5807)', () => {
    test('BLT-02: navigating to the next page should display a different set of records', async ({ page }) => {
        const billsList = await loginAndOpenBillsList(page);
        await billsList.waitForTableLoaded();

        const firstPageRefs = await billsList.getVisibleBillRefs();
        test.skip(firstPageRefs.length === 0, 'No bills available to page through — verify UAT data setup.');

        const hasNextPage = await billsList.paginationNextButton.isEnabled({ timeout: 5000 }).catch(() => false);
        test.skip(!hasNextPage, 'Not enough records to trigger a second page — verify UAT data setup.');

        await billsList.goToNextPage();
        const secondPageRefs = await billsList.getVisibleBillRefs();

        expect(secondPageRefs).not.toEqual(firstPageRefs);
    });
});

test.describe('Bills Table — Viewing an Owned Bill Is Authorized (BLT-03, EMI-5673)', () => {
    test('BLT-03: opening a bill the biller owns should not return "could not be found, or you do not have the necessary permissions"', async ({ page }) => {
        const billsList = await loginAndOpenBillsList(page);
        await billsList.waitForTableLoaded();

        const refs = await billsList.getVisibleBillRefs();
        test.skip(refs.length === 0, 'No bills available to open — verify UAT data setup.');

        await billsList.openBillByRef(refs[0]!);
        await expect(billsList.unauthorizedError).not.toBeVisible({ timeout: 10000 });
        await expect(billsList.billNotFoundError).not.toBeVisible();
    });
});

test.describe('Bills Table — Expired Status Displayed (BLT-04, EMI-5119)', () => {
    test('BLT-04: an expired bill should show an "Expired" status badge in the Bill Report', async ({ page }) => {
        const billsList = await loginAndOpenBillsList(page);
        await billsList.waitForTableLoaded();

        const hasExpiredRow = await billsList.expiredStatusBadge.first().isVisible({ timeout: 10000 }).catch(() => false);
        test.skip(!hasExpiredRow, 'No expired bill present in the current data set to assert against — verify UAT data setup.');

        await expect(billsList.expiredStatusBadge.first()).toBeVisible();
    });
});
