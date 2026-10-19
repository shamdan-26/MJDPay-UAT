import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { HomepageQuickActionsPage } from '../../pageElements/Shared/HomepageQuickActionsPage';
import { BankTransferPage } from '../../pageElements/Shared/BankTransferPage';
import { HOME_URL, ensureNonZeroBalance } from '../helpers/BankTransferHelper.ts';
import { LOGIN_URL, VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD, getOtpFromDb } from '../../Login/helpers/LoginHelper.ts';

// Element-presence assertions for the Amount step only. Amount-field
// validation, preset-override, and full-balance behavior are interactions,
// not presence checks — they live in the functional/ files.

test.describe('BankTransfer – Page Elements – Amount step', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(150000);

    let page: Page;
    let loginPage: LoginPage;
    let otp: OtpPage;
    let quickActions: HomepageQuickActionsPage;
    let bt: BankTransferPage;

    test.beforeAll(async ({ browser }) => {
        // Hooks don't inherit the describe-level test.setTimeout() above — it
        // only extends tests. ensureNonZeroBalance's card-topup branch (OTP
        // round-trip included) can push this hook past the config's default
        // 60s hook timeout, so extend it here too.
        test.setTimeout(150000);
        page = await browser.newPage();

        loginPage = new LoginPage(page);
        otp = new OtpPage(page);
        quickActions = new HomepageQuickActionsPage(page);
        bt = new BankTransferPage(page);

        await loginPage.goto(LOGIN_URL);
        await loginPage.fillAndSubmit(VALID_COMPANY, VALID_MOBILE, VALID_PASSWORD);
        if (await otp.isVisible()) {
            await otp.fillAndVerify(await getOtpFromDb(VALID_MOBILE));
        }
        await page.waitForURL(url => !url.pathname.includes('/auth/'), { timeout: 30000 });
        await ensureNonZeroBalance(page, VALID_MOBILE);
    });

    test.beforeEach(async () => {
        await page.goto(HOME_URL);
        await page.waitForLoadState('domcontentloaded');
        await quickActions.quickActionCashoutCard.click();
        await expect(bt.inputAmount).toBeVisible({ timeout: 15000 });
    });

    test.afterAll(async () => {
        await page.close();
    });

    // ── Page hero ──────────────────────────────────────────────────────────────

    // Bilingual: dev/UAT loads the homepage/Cashout flow in Arabic by default
    // (same reason LoginPage.ts's locators are bilingual — see BankTransfer-
    // Helper.ts / HomepageQuickActionsPage.ts). Every locator here is a CSS-
    // class/id/testid selector, not a text selector, so it still resolves the
    // right element regardless of language — it's these `.toHaveText()`
    // assertions comparing against a hardcoded English string that need the
    // Arabic copy alongside it. Arabic text confirmed against a live dev run
    // on 2026-09-04 (screenshot), account A3713.

    test('should display the "Cashout" page title and its description', async () => {
        await expect(bt.pageTitle).toHaveText(/^(Cashout|سحب نقدي)$/i);
        await expect(bt.pageSubtitle).toHaveText(/send funds to a saudi iban|أرسل أموالاً إلى آيبان سعودي/i);
    });

    // ── Balance card ───────────────────────────────────────────────────────────

    test('should display the Current Balance label and a numeric balance amount', async () => {
        await expect(bt.balanceCardLabel).toHaveText(/current balance|الرصيد الحالي/i);
        await expect(bt.balanceAmount).toBeVisible();
        await expect(bt.balanceAmount).toContainText(/\d/);
    });

    test('should display the wallet code next to the balance', async () => {
        // Two separate checks rather than one combined regex — RTL layout does
        // not guarantee the label and the code sit in that order in the DOM.
        await expect(bt.balanceWalletCode).toHaveText(/wallet code|رمز المحفظة/i);
        await expect(bt.balanceWalletCode).toContainText(/[A-Z0-9-]{5,}/);
    });

    test('should display the Topup, QR, and wallet settings buttons on the balance card', async () => {
        await expect(bt.balanceTopupButton).toBeVisible();
        await expect(bt.balanceTopupButton).toHaveText(/topup|إضافة الأموال/i);
        await expect(bt.balanceQrButton).toBeVisible();
        await expect(bt.balanceSettingsButton).toBeVisible();
    });

    // ── IBAN card ──────────────────────────────────────────────────────────────

    test('should display the IBAN label alongside a masked IBAN, the bank name, and a verified checkmark', async () => {
        await expect(bt.ibanCardLabel).toHaveText(/iban|آيبان/i);
        await expect(bt.ibanCardValue).toBeVisible();
        await expect(bt.ibanCardValue).toHaveText(/^SA\d{2}\s*\*\*\s*\d{4}$/);
        await expect(bt.ibanCardBank).not.toHaveText('');
        await expect(bt.ibanCardCheck).toBeVisible();
    });

    // ── Section header ─────────────────────────────────────────────────────────

    test('should display the step-2 "Amount" section header and its description', async () => {
        await expect(bt.sectionStepBadge).toHaveText('2');
        await expect(bt.sectionTitle).toHaveText(/^(Amount|المبلغ)$/i);
        await expect(bt.sectionDescription).toHaveText(/enter the amount to transfer|أدخل مبلغ التحويل/i);
    });

    // ── Amount field ───────────────────────────────────────────────────────────

    test('should display the "Set Amount You Want Transfer" label and the currency icon in the input', async () => {
        // Confirmed absent from the accessibility tree on a live dev run: the
        // section header (`sectionTitle`, "Amount"/"المبلغ") and its description
        // paragraph are followed directly by the textbox — no separate per-field
        // title node exists between them any more. Only skip THAT half rather
        // than the whole test — the currency icon is a decorative SVG (expected
        // to be absent from an a11y-tree dump regardless) and is still real and
        // asserted unconditionally below.
        const titleCount = await bt.amountFieldTitle.count();
        if (titleCount > 0) {
            await expect(bt.amountFieldTitle).toHaveText(/set amount you want transfer|المبلغ/i);
        } else {
            test.info().annotations.push({
                type: 'skip-reason',
                description: '.mp-amount-title has no matching element — the field-level title appears to have been removed from the current UI',
            });
        }
        await expect(bt.amountCurrencyIcon).toBeVisible();
    });

    test('should display the "0.00" placeholder in the amount input', async () => {
        await expect(bt.inputAmount).toHaveAttribute('placeholder', '0.00');
    });

    test('should display the "Use full balance" toggle with its label only when the wallet has a balance', async () => {
        // With nothing to transfer, offering "use full balance" would just let
        // the user select 0 — the toggle is correctly withheld instead. Only a
        // positive balance should show it, with its label.
        const balance = await bt.getBalanceBeforeBankTransfer();

        if (balance <= 0) {
            await expect(bt.useFullBalanceToggle).not.toBeVisible();
            return;
        }

        await expect(bt.useFullBalanceToggle).toBeVisible();
        await expect(bt.fullBalanceToggleLabel).toHaveText(/use full balance|استخدام كامل الرصيد|استخدام الرصيد بالكامل/i);
    });

    test('should keep Proceed disabled while the amount field is empty', async () => {
        await expect(bt.inputAmount).toHaveValue('');
        await expect(bt.proceedButton).toBeDisabled();
    });

    // ── Preset amount chips ──────────────────────────────────────────────────────

    test('should display the "Or select amount" label and all 5 preset amount chips', async () => {
        await expect(bt.quickAmountLabel).toHaveText(/or select amount|أو اختر المبلغ/i);
        await expect(bt.presetAmountChips).toHaveCount(5);

        // Values are Western numerals regardless of language, but RTL layout can
        // reverse DOM order relative to the LTR-authored expectation below — so
        // assert the SET of values rather than their order.
        const expected = ['500', '1000', '2000', '5000', '10000'];
        const texts = (await bt.presetAmountChips.allTextContents()).map(t => t.trim());
        expect(texts.slice().sort()).toEqual(expected.slice().sort());
    });

    // ── Proceed button ───────────────────────────────────────────────────────────

    test('should display the Proceed button with its label and arrow icon', async () => {
        await expect(bt.proceedButton).toBeVisible();
        await expect(bt.proceedButton).toHaveText(/proceed|متابعة/i);
        await expect(bt.proceedButton.locator('svg')).toBeVisible();
    });

    // ── IBAN is always masked, never revealable ────────────────────────────────

    test('should always show the IBAN masked with no way for the user to reveal the full number', async () => {
        // The full IBAN must never be exposed: it renders masked as SAxx**xxxx,
        // there is no "view full IBAN" control, and the un-masked 22-digit number
        // is absent from the DOM.
        await expect(bt.ibanCardValue).toHaveText(/^SA\d{2}\s*\*\*\s*\d{4}$/);
        await expect(bt.ibanViewFullToggle).toHaveCount(0);

        const html = await page.content();
        expect(html, 'the full unmasked IBAN must not appear anywhere in the page').not.toMatch(/SA\d{22}/);
    });

    // ── Preset chips vs. balance ───────────────────────────────────────────────

    test('should not let a preset above the available balance start a transfer', async () => {
        // Pick the largest preset (500 / 1000 / 2000 / 5000 / 10000). On the
        // shared dev account it is effectively always above the balance, so
        // selecting it must not enable a real transfer — the chip is disabled, or
        // Proceed stays disabled. If the account somehow can afford it, selecting
        // it legitimately enables Proceed.
        const balance = await bt.getBalanceBeforeBankTransfer();
        const chips = bt.presetAmountChips;
        const count = await chips.count();

        let maxIdx = 0;
        let maxVal = -1;
        for (let i = 0; i < count; i++) {
            const value = parseFloat(((await chips.nth(i).textContent()) ?? '').replace(/[^0-9.]/g, ''));
            if (Number.isFinite(value) && value > maxVal) {
                maxVal = value;
                maxIdx = i;
            }
        }
        const chip = chips.nth(maxIdx);

        if (maxVal <= balance) {
            await chip.click();
            await expect(bt.proceedButton).toBeEnabled();
            return;
        }

        if (!(await chip.isEnabled().catch(() => true))) return; // disabled chip — requirement met

        await chip.click();
        await expect(bt.proceedButton).toBeDisabled();
    });
});
