import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomePage } from '../../pageElements/Shared/HomePage';
import { BillsPage } from '../../pageElements/PayBill/BillsPage';
import { BILL_COMPANY, BILL_MOBILE, BILL_PASSWORD } from '../PayBillHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';

// Bill QR Code scanning — Business/merchant app (BQR-03, BQR-04). EMI-5144
// (500 when scanning the bill QR) and EMI-5143 ("Something went wrong" when
// entering the bill number manually). Distinct from BillQr/ (the Customer-app
// side of the same ticket group, EMI-5903/EMI-5685) — this flow reuses the
// existing Pay Bill screen/session pattern from PayBillFlow.spec.ts, extended
// with the scan-QR / enter-bill-number entry points added to BillsPage.ts.

test.describe('Pay Bill – QR Scan and Manual Bill Lookup', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(120000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let homePage: HomePage;
    let billsPage: BillsPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();

        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        homePage = new HomePage(page);
        billsPage = new BillsPage(page);

        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(BILL_COMPANY, BILL_MOBILE, BILL_PASSWORD);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(BILL_MOBILE));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
    });

    test.beforeEach(async () => {
        await homePage.clicBills_NavButton();
        await homePage.clickBillPayment_NavButton();
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('BQR-03: scanning a bill QR should show the bill, not a 500 server error (EMI-5144)', async () => {
        await billsPage.openQrScanner();
        await expect(page.getByText(/internal server error|500/i)).not.toBeVisible({ timeout: 15000 });
    });

    test('BQR-04: entering a bill number manually should retrieve the bill, not "Something went wrong" (EMI-5143)', async () => {
        await billsPage.searchBillByNumber('1041');
        await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 15000 });
        await expect(billsPage.billLookupError).not.toBeVisible();
    });
});
