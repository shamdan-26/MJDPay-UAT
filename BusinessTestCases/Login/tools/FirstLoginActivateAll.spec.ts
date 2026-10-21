import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../shared/fixtures.ts';
import testAccounts from '../../../data/testAccounts.json';
import { FirstLoginPasswordPage } from '../../pageElements/Login/FirstLoginPasswordPage';
import { LoginPage } from '../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../pageElements/Shared/OtpPage';
import { FIRST_LOGIN_DEFAULT_PASSWORD, LOGIN_URL, VALID_OTP } from '../helpers/LoginHelper.ts';
import { NEW_PASSWORD, RESET_PASSWORD_URL } from '../helpers/firstLogin';

// First login for EVERY registration-created account, once. Opt-in (FIRST_LOGIN_ACTIVATE_ALL=1).
//
// Per account: ONE sign-in with the first-login default password (so the 3-attempt lockout is never approached).
//   - forced reset screen  → set the shared password (testAccounts.defaultPassword)  → labelled "first-login"
//   - sign-in rejected / straight to home → the account already had its own password → labelled "used"
//   - anything else → labelled "unknown" (reason in the report)
// The labels are written to data/testAccounts.json → accountStatus (keyed by company).
//
// This CONSUMES the first-login state of every account, including testAccounts.firstLoginAccounts: FirstLoginUi and
// FirstLoginEndToEnd skip/fail afterwards until new accounts are registered and added to firstLoginAccounts.

type Account = { company: string; mobile: string };
type Status = 'first-login' | 'used' | 'unknown';

const ACCOUNTS_FILE = path.resolve(__dirname, '../../../data/testAccounts.json');

test.describe('Login — First login — activate all created accounts (opt-in)', { tag: ['@login', '@functional', '@first-login'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.skip(!process.env['FIRST_LOGIN_ACTIVATE_ALL'], 'Set FIRST_LOGIN_ACTIVATE_ALL=1 — changes the password of every created account that is still in first-login state');
    test.describe.configure({ mode: 'serial' });

    test('LG-FIRST-30: first login + password update for all created accounts, labelled first-login / used', async ({ browser }, testInfo) => {
        test.setTimeout(30 * 60_000);
        const accounts: Account[] = testAccounts.createdAccounts;
        const results = new Map<string, { status: Status; note: string }>();

        const activate = async (a: Account): Promise<{ status: Status; note: string }> => {
            const context = await browser.newContext();
            const page = await context.newPage();
            try {
                let signinStatus = 0;
                page.on('response', res => { if (res.request().method() === 'POST' && /\/auth\/signin$/.test(res.url())) signinStatus = res.status(); });

                const loginPage = new LoginPage(page);
                await loginPage.goto(LOGIN_URL);
                await loginPage.fillAndSubmit(a.company, a.mobile, FIRST_LOGIN_DEFAULT_PASSWORD);

                const otp = new OtpPage(page);
                const reachedOtp = await otp.heading.waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false);
                if (!reachedOtp) {
                    if (signinStatus >= 400) return { status: 'used', note: `default password rejected (${signinStatus})` };
                    return { status: 'unknown', note: `no OTP screen, sign-in status ${signinStatus || 'none'}, url ${page.url()}` };
                }

                await otp.fillAndVerify(VALID_OTP);
                const landed = await page.waitForURL(u => RESET_PASSWORD_URL.test(u.toString()) || /\/business\/main\/home/.test(u.toString()), { timeout: 20000 }).then(() => true, () => false);
                if (!landed) return { status: 'unknown', note: `after OTP stayed on ${page.url()}` };
                if (!RESET_PASSWORD_URL.test(page.url())) return { status: 'used', note: 'default password accepted, no forced reset' };

                const reset = new FirstLoginPasswordPage(page);
                await reset.fill(FIRST_LOGIN_DEFAULT_PASSWORD, NEW_PASSWORD);
                await expect(reset.submitButton).toBeEnabled();
                await reset.submit();
                await expect(page).not.toHaveURL(RESET_PASSWORD_URL, { timeout: 20000 });
                return { status: 'first-login', note: 'password updated' };
            } catch (e) {
                return { status: 'unknown', note: String(e instanceof Error ? e.message : e).split('\n')[0].slice(0, 160) };
            } finally {
                await context.close();
            }
        };

        for (const a of accounts) results.set(a.company, await activate(a));

        // Write the labels back without touching any other key.
        const json = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
        json.accountStatus = { ...(json.accountStatus ?? {}), ...Object.fromEntries([...results].map(([company, r]) => [company, r.status])) };
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(json, null, 2) + '\n');

        const table = ['company\tmobile\tstatus\tnote', ...accounts.map(a => `${a.company}\t${a.mobile}\t${results.get(a.company)!.status}\t${results.get(a.company)!.note}`)].join('\n');
        console.log(`\nFirst-login activation (${accounts.length} accounts):\n${table}\n`);
        await testInfo.attach('first-login-activation.tsv', { body: table, contentType: 'text/tab-separated-values' });

        const unknown = accounts.filter(a => results.get(a.company)!.status === 'unknown').map(a => a.company);
        expect(unknown, `accounts with an unexpected outcome (see the table): ${unknown.join(', ')}`).toEqual([]);
    });
});
