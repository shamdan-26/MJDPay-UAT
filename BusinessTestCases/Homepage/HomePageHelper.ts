import { Browser, Locator, Page, test } from '@playwright/test';
import { getOtpFromDb, fillOTP } from '../Registration/RegistrationHelper';
import { waitForToastClear } from '../toastMessages';
import { DashboardPage } from '../pageElements/Shared/DashboardPage';
import { HomepageSidebarPage } from '../pageElements/Homepage/HomepageSidebarPage';
import { HomepageHeaderPage } from '../pageElements/Homepage/HomepageHeaderPage';
import { HomepageGreetingPage } from '../pageElements/Homepage/HomepageGreetingPage';
import { HomepageBalanceCardPage } from '../pageElements/Homepage/HomepageBalanceCardPage';
import { HomepageQuickActionsPage } from '../pageElements/Homepage/HomepageQuickActionsPage';
import { HomepageBillsOverviewPage } from '../pageElements/Homepage/HomepageBillsOverviewPage';
import { HomepageSubWalletsPage } from '../pageElements/Homepage/HomepageSubWalletsPage';
import { HomepageTransactionsPage } from '../pageElements/Homepage/HomepageTransactionsPage';
import testAccounts from '../../data/testAccounts.json';

export const BASE_URL = process.env['BASE_URL'] ?? 'https://uat.majdpay.com';
export const LOGIN_URL        = `${BASE_URL}/business/auth/login`;
export const HOME_URL         = `${BASE_URL}/business/main/home`;
export const HOME_URL_PATTERN = /\/business\/main\/home/;
export const BASE_ORIGIN      = BASE_URL;

/** Shared fallback password for all UAT test accounts below. */
const DEFAULT_TEST_PASSWORD = testAccounts.defaultPassword;

/** In ENV=dev the login button has no accessible "Log In" role name — same
 *  env split already established in pageElements/Login/LoginPage.ts. */
function loginButton(page: Page): Locator {
    const env = process.env['ENV'] ?? 'dev';
    return env === 'dev'
        ? page.locator('#btn_login')
        : page.getByRole('button', { name: 'Log In' });
}

export const VALID_COMPANY  = process.env['UAT_COMPANY'] ?? testAccounts.merchant.company;
export const VALID_MOBILE   = process.env['UAT_MOBILE']  ?? testAccounts.merchant.mobile;
export const VALID_PASSWORD = DEFAULT_TEST_PASSWORD;

/** Second merchant account — used to spread homepage spec files across two
 *  sessions so parallel workers don't collide on the same account. */
export const VALID_COMPANY_2  = process.env['UAT_COMPANY_2'] ?? testAccounts.merchant2.company;
export const VALID_MOBILE_2   = process.env['UAT_MOBILE_2']  ?? testAccounts.merchant2.mobile;
export const VALID_PASSWORD_2 = process.env['UAT_PASSWORD_2'] ?? DEFAULT_TEST_PASSWORD;

export const VALID_BILLER_COMPANY  = process.env['UAT_BILLER_COMPANY'] ?? testAccounts.biller.company;
export const VALID_BILLER_MOBILE   = process.env['UAT_BILLER_MOBILE']  ?? testAccounts.biller.mobile;
export const VALID_BILLER_PASSWORD = process.env['UAT_BILLER_PASSWORD'] ?? DEFAULT_TEST_PASSWORD;

/** Pre-authenticated storage states for the two homepage merchant accounts,
 *  generated once by support/global-setup.ts. Spec files restore these via
 *  `browser.newContext({ storageState: ... })` instead of logging in live —
 *  no OTP round-trip, and no risk of concurrent same-account login collisions. */
export const ACCOUNT_1_STORAGE_STATE = 'playwright/.auth/homepage-account1.json';
export const ACCOUNT_2_STORAGE_STATE = 'playwright/.auth/homepage-account2.json';

/** Pool of accounts homepage tests can be spread across, keyed so each parallel
 *  worker sticks to exactly one account for its whole run (no two workers ever
 *  share a session). Accounts 1 and 2 are always present; add a 3rd/4th/etc.
 *  by setting UAT_COMPANY_3/UAT_MOBILE_3/UAT_PASSWORD_3 (and so on) — the pool
 *  picks them up automatically, no code changes needed. Match playwright.config.ts's
 *  worker count with the number of accounts you provide to eliminate collisions
 *  entirely; with fewer accounts than workers, some sharing still happens but
 *  is now deterministic (same worker/account pairing every run) rather than
 *  the previous ad-hoc per-file assignment. */
export interface HomepageAccount {
    key: string;
    storageState: string;
    creds: MerchantCredentials;
}

export const homepageAccountPool: HomepageAccount[] = [
    { key: 'ACCOUNT_1', storageState: ACCOUNT_1_STORAGE_STATE, creds: { company: VALID_COMPANY, mobile: VALID_MOBILE, password: VALID_PASSWORD } },
    { key: 'ACCOUNT_2', storageState: ACCOUNT_2_STORAGE_STATE, creds: { company: VALID_COMPANY_2, mobile: VALID_MOBILE_2, password: VALID_PASSWORD_2 } },
];

for (let n = 3; ; n++) {
    const company = process.env[`UAT_COMPANY_${n}`];
    const mobile  = process.env[`UAT_MOBILE_${n}`];
    if (!company || !mobile) break;
    homepageAccountPool.push({
        key: `ACCOUNT_${n}`,
        storageState: `playwright/.auth/homepage-account${n}.json`,
        creds: { company, mobile, password: process.env[`UAT_PASSWORD_${n}`] ?? DEFAULT_TEST_PASSWORD },
    });
}

/** Deterministically maps a Playwright worker index to one pool account, so
 *  the same worker always uses the same account across a run. */
export function homepageAccountForWorker(workerIndex: number): HomepageAccount {
    return homepageAccountPool[workerIndex % homepageAccountPool.length];
}

/** Shared timing constants for homepage specs — keep every spec's post-navigation
 *  settle/toast-clear/assertion waits in sync instead of hardcoding them per call site. */
export const POST_NAV_SETTLE_MS    = 2500;
export const TOAST_APPEAR_TIMEOUT_MS = 800;
export const TOAST_CLEAR_TIMEOUT_MS  = 5000;
export const ASSERTION_TIMEOUT_MS    = 10000;

export interface MerchantCredentials {
    company:  string;
    mobile:   string;
    password: string;
}

/** Watches for a failing response on the auth gateway's sign-in call while a
 *  login attempt is in flight, so a login timeout can be attributed to a
 *  backend/env outage instead of looking like a flaky UI wait. Call the
 *  returned function once the attempt is done (success or failure) to detach
 *  the listener and read back the captured status, if any. */
export function watchAuthGatewayFailure(page: Page): () => number | undefined {
    let failedStatus: number | undefined;
    const onResponse = (res: import('@playwright/test').Response) => {
        if (res.url().includes('/auth/signin') && res.status() >= 400) {
            failedStatus = res.status();
        }
    };
    page.on('response', onResponse);
    return () => {
        page.off('response', onResponse);
        return failedStatus;
    };
}

/** Formats an annotation naming the auth gateway's failing status, when
 *  watchAuthGatewayFailure() caught one — empty string otherwise. */
export function formatGatewayNote(gatewayStatus: number | undefined): string {
    return gatewayStatus
        ? ` Auth gateway returned ${gatewayStatus} for /auth/signin — likely a backend/env outage, not a test issue.`
        : '';
}

function describeLoginTimeout(page: Page, gatewayStatus: number | undefined, err: unknown, prefix = ''): string {
    return `${prefix}login did not reach home or OTP screen within 20 s. Current URL: ${page.url()}.${formatGatewayNote(gatewayStatus)}\nCause: ${err}`;
}

export interface HomepageSession {
    page: Page;
    dashboard: DashboardPage;
    sidebar: HomepageSidebarPage;
    header: HomepageHeaderPage;
    greeting: HomepageGreetingPage;
    balanceCard: HomepageBalanceCardPage;
    quickActions: HomepageQuickActionsPage;
    billsOverview: HomepageBillsOverviewPage;
    subWallets: HomepageSubWalletsPage;
    transactions: HomepageTransactionsPage;
}

/** Full login flow for a biller: credentials → OTP (fetched from MongoDB) → home page.
 *  Requires UAT_BILLER_COMPANY and UAT_BILLER_MOBILE env vars to be set.
 *  Note (AMB-HP-01): assumes biller uses the same /business/auth/login endpoint as merchant.
 */
export async function loginAsBiller(page: Page): Promise<void> {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('textbox', { name: /Company number|رقم الشركة/ }).fill(VALID_BILLER_COMPANY);
    await page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ }).fill(VALID_BILLER_MOBILE);
    await page.locator('input[aria-label="Password"], input[aria-label="كلمة المرور"]').fill(VALID_BILLER_PASSWORD);
    const stopWatchingGateway = watchAuthGatewayFailure(page);
    await loginButton(page).click();

    const otpHeading = page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i });
    let landed: 'home' | 'otp';
    try {
        landed = await Promise.race([
            page.waitForURL(HOME_URL_PATTERN, { timeout: 20000 }).then(() => 'home' as const),
            otpHeading.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'otp' as const),
        ]);
    } catch (err) {
        throw new Error(describeLoginTimeout(page, stopWatchingGateway(), err, 'Biller '));
    }
    stopWatchingGateway();

    if (landed === 'otp') {
        await page.getByRole('textbox', { name: 'One time password input' }).first()
            .waitFor({ state: 'visible', timeout: 10000 });
        const otp = await getOtpFromDb(VALID_BILLER_MOBILE);
        await fillOTP(page, otp);
        const verifyBtn = page.getByRole('button', { name: /Verify|تحقق/i });
        if (await verifyBtn.isVisible().catch(() => false)) {
            await verifyBtn.click();
        }
        await page.waitForURL(HOME_URL_PATTERN, { timeout: 30000 });
    }
    await waitForToastClear(page);
}

/** Full login flow: credentials → OTP (fetched from MongoDB) → home page.
 *  Defaults to the primary merchant account; pass `creds` to log in as a
 *  different account (e.g. VALID_COMPANY_2 / VALID_MOBILE_2 / VALID_PASSWORD_2).
 *
 *  Retries once on failure: when multiple spec files log into the same
 *  account concurrently (parallel workers sharing one of the two test
 *  accounts), the backend can invalidate one of the racing sessions. A
 *  short-delayed retry lets the other login finish first and self-heals. */
export async function loginAsMerchant(page: Page, creds?: MerchantCredentials): Promise<void> {
    const company  = creds?.company  ?? VALID_COMPANY;
    const mobile   = creds?.mobile   ?? VALID_MOBILE;
    const password = creds?.password ?? VALID_PASSWORD;

    const attemptLogin = async (): Promise<void> => {
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('textbox', { name: /Company number|رقم الشركة/ }).fill(company);
        await page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ }).fill(mobile);
        await page.locator('input[aria-label="Password"], input[aria-label="كلمة المرور"]').fill(password);
        const stopWatchingGateway = watchAuthGatewayFailure(page);
        await loginButton(page).click();

        const otpHeading = page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i });
        let landed: 'home' | 'otp';
        try {
            landed = await Promise.race([
                page.waitForURL(HOME_URL_PATTERN, { timeout: 20000 }).then(() => 'home' as const),
                otpHeading.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'otp' as const),
            ]);
        } catch (err) {
            throw new Error(describeLoginTimeout(page, stopWatchingGateway(), err));
        }
        stopWatchingGateway();

        if (landed === 'otp') {
            await page.getByRole('textbox', { name: 'One time password input' }).first()
                .waitFor({ state: 'visible', timeout: 10000 });
            const otp = await getOtpFromDb(mobile);
            await fillOTP(page, otp);
            const verifyBtn = page.getByRole('button', { name: /Verify|تحقق/i });
            if (await verifyBtn.isVisible().catch(() => false)) {
                await verifyBtn.click();
            }
            await page.waitForURL(HOME_URL_PATTERN, { timeout: 30000 });
        }
    };

    try {
        await attemptLogin();
    } catch (err) {
        console.warn(`[loginAsMerchant] first attempt failed for ${mobile}, retrying once. Cause: ${err}`);
        await new Promise(r => setTimeout(r, 3000));
        await attemptLogin();
    }
    await waitForToastClear(page);
}

/** Opens the profile dropdown and waits for the logout item to be visible. */
export async function openProfileMenu(page: Page): Promise<void> {
    const dashboard = new DashboardPage(page);
    await dashboard.openProfileMenu();
}

/** Restores a pre-authenticated homepage session and instantiates every
 *  homepage page object against it, so spec files get a one-line replacement
 *  for the browser.newContext → grantPermissions → newPage boilerplate that
 *  used to be copy-pasted into every file's beforeAll.
 *
 *  Omit `account` (recommended) to auto-select by worker index via
 *  homepageAccountForWorker() — this is what actually prevents parallel
 *  workers from colliding on the same account, since it guarantees the same
 *  worker always gets the same account for its entire run rather than
 *  depending on each spec file having manually picked a non-conflicting one.
 *  Pass an explicit key (e.g. 'ACCOUNT_1') only when a spec has a specific
 *  reason to require that exact account's data/state. */
export async function createHomepageSession(
    browser: Browser,
    account?: string,
    workerIndexOverride?: number
): Promise<HomepageSession> {
    const chosen = account
        ? homepageAccountPool.find(a => a.key === account) ?? homepageAccountPool[0]
        : homepageAccountForWorker(workerIndexOverride ?? test.info().parallelIndex);

    const context = await browser.newContext({ storageState: chosen.storageState });
    await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
    const page = await context.newPage();

    return {
        page,
        dashboard: new DashboardPage(page),
        sidebar: new HomepageSidebarPage(page),
        header: new HomepageHeaderPage(page),
        greeting: new HomepageGreetingPage(page),
        balanceCard: new HomepageBalanceCardPage(page),
        quickActions: new HomepageQuickActionsPage(page),
        billsOverview: new HomepageBillsOverviewPage(page),
        subWallets: new HomepageSubWalletsPage(page),
        transactions: new HomepageTransactionsPage(page),
    };
}

/** Re-navigates to the homepage and waits for the post-navigation settle +
 *  transient toast to clear — the standard beforeEach for homepage specs. */
export async function refreshHomepage(page: Page): Promise<void> {
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(POST_NAV_SETTLE_MS);
    await waitForToastClear(page, TOAST_APPEAR_TIMEOUT_MS, TOAST_CLEAR_TIMEOUT_MS);
}
