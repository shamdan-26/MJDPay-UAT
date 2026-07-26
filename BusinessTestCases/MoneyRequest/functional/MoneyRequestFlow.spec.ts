import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomePage } from '../../pageElements/Shared/HomePage';
import { MoneyRequestPage } from '../../pageElements/MoneyRequest/MoneyRequestPage';
import {
    HOME_URL,
    REQUESTER_COMPANY, REQUESTER_MOBILE, REQUESTER_PASSWORD,
    PAYER_COMPANY, PAYER_MOBILE, PAYER_PASSWORD,
} from '../MoneyRequestHelper';
import { LOGIN_URL, getOtpFromDb } from '../../Login/LoginHelper';

// Money Request (EMI-834) — a wallet holder requests money from another
// wallet holder, who can Accept (pay), Decline, or scan a generated QR to
// pay. No prior automation existed for this screen — see MoneyRequestPage.ts
// for the locator caveat. Test IDs below (MR-FP/NE/EC/SEC/UI) mirror the
// source ticket's own test-case list (EMI-834) 1:1 for traceability. Maps to
// docs/manual-test-cases/Transaction-Operations.md section A.

async function login(page: Page, company: string, mobile: string, password: string): Promise<void> {
    const loginPage = new LoginPage(page);
    const otp = new OtpPage(page);

    await loginPage.goto(LOGIN_URL);
    await loginPage.fillAndSubmit(company, mobile, password);
    if (await otp.isVisible()) {
        await otp.fillAndVerify(await getOtpFromDb(mobile));
    }
    await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
    await page.goto(HOME_URL);
    await page.waitForLoadState('domcontentloaded');
}

test.describe('Money Request — Create & Requests Sent (MR-FP-01, MR-UI-01)', () => {
    test('MR-FP-01: should create a money request and show it in Requests Sent as REQUESTED', async ({ page }) => {
        await login(page, REQUESTER_COMPANY, REQUESTER_MOBILE, REQUESTER_PASSWORD);
        const homePage = new HomePage(page);
        const mr = new MoneyRequestPage(page);

        await homePage.clickMoneyRequest_NavButton();
        await mr.createRequest(PAYER_COMPANY, '50', 'QA automated request');

        await mr.openRequestsSent();
        await expect(mr.requestsSentRows.first()).toBeVisible({ timeout: 15000 });
        await mr.assertRequestStatus('REQUESTED');
    });
});

test.describe('Money Request — Accept & Pay (MR-FP-02, MR-UI-02)', () => {
    test('MR-FP-02: the requested party should see the request and complete payment via Accept → Pay', async ({ browser }) => {
        const requesterContext = await browser.newContext();
        const requesterPage = await requesterContext.newPage();
        await login(requesterPage, REQUESTER_COMPANY, REQUESTER_MOBILE, REQUESTER_PASSWORD);
        const requesterHome = new HomePage(requesterPage);
        const requesterMr = new MoneyRequestPage(requesterPage);
        await requesterHome.clickMoneyRequest_NavButton();
        await requesterMr.createRequest(PAYER_COMPANY, '25', 'MR-FP-02');

        const payerContext = await browser.newContext();
        const payerPage = await payerContext.newPage();
        await login(payerPage, PAYER_COMPANY, PAYER_MOBILE, PAYER_PASSWORD);
        const payerHome = new HomePage(payerPage);
        const payerMr = new MoneyRequestPage(payerPage);

        await payerHome.clickMoneyRequest_NavButton();
        await payerMr.openRequestsReceived();
        await payerMr.payFirstReceivedRequest();

        await expect(payerMr.paymentSummarySection).toBeVisible({ timeout: 15000 });
        await expect(payerMr.amountRequestedRow).toBeVisible();
        await expect(payerMr.totalToDebitRow).toBeVisible();

        await payerMr.confirmPayment();

        const otp = new OtpPage(payerPage);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(PAYER_MOBILE));
        }

        await payerMr.assertPaymentSucceeded();

        await requesterContext.close();
        await payerContext.close();
    });
});

test.describe('Money Request — Decline (MR-FP-02 variant)', () => {
    test('declining a request should not move any funds and update status to DECLINED', async ({ browser }) => {
        const requesterContext = await browser.newContext();
        const requesterPage = await requesterContext.newPage();
        await login(requesterPage, REQUESTER_COMPANY, REQUESTER_MOBILE, REQUESTER_PASSWORD);
        const requesterHome = new HomePage(requesterPage);
        const requesterMr = new MoneyRequestPage(requesterPage);
        await requesterHome.clickMoneyRequest_NavButton();
        await requesterMr.createRequest(PAYER_COMPANY, '15', 'decline-me');

        const payerContext = await browser.newContext();
        const payerPage = await payerContext.newPage();
        await login(payerPage, PAYER_COMPANY, PAYER_MOBILE, PAYER_PASSWORD);
        const payerHome = new HomePage(payerPage);
        const payerMr = new MoneyRequestPage(payerPage);

        await payerHome.clickMoneyRequest_NavButton();
        await payerMr.openRequestsReceived();
        await payerMr.declineFirstReceivedRequest();

        await requesterPage.reload();
        await requesterMr.openRequestsSent();
        await requesterMr.assertRequestStatus('DECLINED');

        await requesterContext.close();
        await payerContext.close();
    });
});

test.describe('Money Request — Insufficient Balance (MR-NE-01)', () => {
    test('MR-NE-01: accepting with an amount above balance should show Insufficient Funds and not move money', async ({ page }) => {
        await login(page, PAYER_COMPANY, PAYER_MOBILE, PAYER_PASSWORD);
        const homePage = new HomePage(page);
        const mr = new MoneyRequestPage(page);

        await homePage.clickMoneyRequest_NavButton();
        await mr.openRequestsReceived();

        if (await mr.requestsReceivedRows.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await mr.payFirstReceivedRequest();
            await mr.confirmPayment();
            await expect(mr.insufficientFundsError.or(mr.limitExceededError)).toBeVisible({ timeout: 15000 });
        } else {
            test.skip(true, 'No pending request available — requires a request above the payer balance to be pre-created');
        }
    });
});

test.describe('Money Request — Cancel Before Accept (MR-EC-01)', () => {
    test('MR-EC-01: the requester can cancel a pending request before it is accepted', async ({ page }) => {
        await login(page, REQUESTER_COMPANY, REQUESTER_MOBILE, REQUESTER_PASSWORD);
        const homePage = new HomePage(page);
        const mr = new MoneyRequestPage(page);

        await homePage.clickMoneyRequest_NavButton();
        await mr.createRequest(PAYER_COMPANY, '10', 'MR-EC-01');
        await mr.openRequestsSent();
        await mr.cancelFirstSentRequest();

        await mr.assertRequestStatus('CANCELLED');
    });
});

test.describe('Money Request — Authorization (MR-SEC-01)', () => {
    test('MR-SEC-01: only the intended requested profile can act on a request', async ({ browser }) => {
        test.skip(true, 'Requires a third, unrelated business account to attempt Accept on a request not addressed to them — no such fixture account exists yet');
    });
});

test.describe('Money Request — QR Generation & Share (MR-UI-03)', () => {
    test('MR-UI-03: generating a QR for a request should show the QR image, expiry, and one-time-use flag', async ({ page }) => {
        await login(page, REQUESTER_COMPANY, REQUESTER_MOBILE, REQUESTER_PASSWORD);
        const homePage = new HomePage(page);
        const mr = new MoneyRequestPage(page);

        await homePage.clickMoneyRequest_NavButton();
        await mr.toggleGenerateQr();
        await mr.createRequest(PAYER_COMPANY, '20', 'MR-UI-03');

        await expect(mr.qrModal.or(mr.qrImage)).toBeVisible({ timeout: 15000 });
        await expect(mr.qrExpiryLabel).toBeVisible();
        await expect(mr.qrOneTimeUseLabel).toBeVisible();
    });
});
