import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../shared/fixtures.ts';
import testAccounts from '../../../data/testAccounts.json';
import { AdminOtpConfigPage, createAdminContext } from '../../pageElements/Shared/AdminOtpConfigPage';
import { AdminBusinessAccountsPage } from '../../pageElements/UserManagement/AdminBusinessAccountsPage';
import { FirstLoginPasswordPage } from '../../pageElements/Login/FirstLoginPasswordPage';
import { FIRST_LOGIN_DEFAULT_PASSWORD } from '../helpers/LoginHelper.ts';
import { NEW_PASSWORD, RESET_PASSWORD_URL, signInThroughOtp } from '../helpers/firstLogin';

// One-off repair of the accounts the Topup specs tried and may have locked by wrong-password attempts (opt-in: REPAIR_TRIED_ACCOUNTS=1).
//
// 1. UNLOCK / UNBLOCK all five accounts in the admin portal (Accounts > Business > details; block status and the Users tab),
//    only where the screen shows them locked or blocked. Nothing else about them is changed.
// 2. UPDATE THE PASSWORD of the one account that is not in firstLoginAccounts (H4218): ONE sign-in with the first-login default
//    password. A forced reset screen -> the shared password is set (label "first-login" in accountStatus). Rejected or no reset screen
//    -> label "used" / "unknown" with the reason; it is never tried again here.
//    The four first-login accounts keep their first-login state (FirstLoginUi / FirstLoginEndToEnd still need them): they are only unlocked.
// Admin credentials come from the ADMIN_* env vars already used by every admin spec. One admin login at a time: run with --workers=1.

type Account = { company: string; mobile: string };

const FIRST_LOGIN_COMPANIES = new Set(testAccounts.firstLoginAccounts.map(a => a.company));
const ACCOUNTS: Account[] = [
    testAccounts.moduleAccounts.payBill,                                                              // H4218: not a first-login account
    ...['T8477', 'X5017', 'U4875', 'X5998'].map(company => testAccounts.firstLoginAccounts.find(a => a.company === company)!),
];
const ACCOUNTS_FILE = path.resolve(__dirname, '../../../data/testAccounts.json');

test.describe('Login — repair the accounts the Topup specs tried (opt-in)', { tag: ['@login', '@functional', '@first-login'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.skip(!process.env['REPAIR_TRIED_ACCOUNTS'], 'Set REPAIR_TRIED_ACCOUNTS=1 — unlocks 5 shared dev accounts and sets the shared password on H4218');
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(15 * 60_000);

    const rows: Array<{ company: string; mobile: string; unlock: string; password: string }> = [];

    test('REPAIR-01: unlock or unblock each tried account in the admin portal', async ({ browser }) => {
        expect(ACCOUNTS.every(Boolean), 'every account listed in this spec exists in data/testAccounts.json').toBe(true);
        const context = await createAdminContext(browser);
        try {
            const admin = await context.newPage();
            await new AdminOtpConfigPage(admin).login();
            const accounts = new AdminBusinessAccountsPage(admin);
            for (const a of ACCOUNTS) {
                const row = { company: a.company, mobile: a.mobile, unlock: 'not checked', password: 'not touched' };
                rows.push(row);
                try {
                    await accounts.goto();
                    const details = await accounts.openAccountDetails(a.mobile);
                    const done: string[] = [];

                    const blockValue = (await details.blockStatusInput.inputValue().catch(() => '')).trim();
                    if (/^blocked$/i.test(blockValue)) {
                        await details.setBlockStatus('Unblock');
                        done.push('unblocked');
                    }

                    await details.openUsersTab();
                    const locked = details.row(a.mobile).lockedButton;
                    const lockedText = (await locked.innerText({ timeout: 10000 }).catch(() => '')).trim();
                    if (/^locked$/i.test(lockedText)) {
                        await details.unlockUser(a.mobile);
                        done.push('unlocked');
                    }
                    row.unlock = done.length ? done.join(' + ') : `nothing to do (block "${blockValue || 'n/a'}", lock "${lockedText || 'n/a'}")`;
                } catch (e) {
                    row.unlock = `FAILED: ${String(e instanceof Error ? e.message : e).split('\n')[0]!.slice(0, 160)}`;
                }
            }
        } finally {
            await context.close();
        }
        const failed = rows.filter(r => r.unlock.startsWith('FAILED')).map(r => r.company);
        expect(failed, `accounts that could not be checked or unlocked (see the table): ${failed.join(', ')}`).toEqual([]);
    });

    test('REPAIR-02: update the first-login password of the non-first-login account (one sign-in)', async ({ browser }, testInfo) => {
        const a = ACCOUNTS.find(x => !FIRST_LOGIN_COMPANIES.has(x.company))!;
        const row = rows.find(r => r.company === a.company) ?? { company: a.company, mobile: a.mobile, unlock: 'not run', password: '' };
        if (!rows.includes(row)) rows.push(row);
        const context = await browser.newContext();
        const page = await context.newPage();
        let signinStatus = 0;
        page.on('response', res => { if (res.request().method() === 'POST' && /\/auth\/signin$/.test(res.url())) signinStatus = res.status(); });
        const oneSignIn = async (): Promise<'first-login' | 'used' | 'unknown'> => {
            try {
                await signInThroughOtp(page, a, FIRST_LOGIN_DEFAULT_PASSWORD);
            } catch (e) {
                const label = signinStatus >= 400 ? 'used' : 'unknown';
                row.password = `${label}: ${signinStatus >= 400 ? `first-login password rejected (${signinStatus}), the account already has its own password` : String(e instanceof Error ? e.message : e).split('\n')[0]!.slice(0, 160)}`;
                return label;
            }
            const landed = await page.waitForURL(u => RESET_PASSWORD_URL.test(u.toString()) || /\/business\/main\/home/.test(u.toString()), { timeout: 20000 }).then(() => true, () => false);
            if (!landed) { row.password = `unknown: after OTP stayed on ${page.url()}`; return 'unknown'; }
            if (!RESET_PASSWORD_URL.test(page.url())) { row.password = 'used: first-login password accepted, no forced reset'; return 'used'; }
            const reset = new FirstLoginPasswordPage(page);
            await reset.fill(FIRST_LOGIN_DEFAULT_PASSWORD, NEW_PASSWORD);
            await expect(reset.submitButton).toBeEnabled();
            await reset.submit();
            await expect(page).not.toHaveURL(RESET_PASSWORD_URL, { timeout: 20000 });
            row.password = 'first-login: password updated to the shared one';
            return 'first-login';
        };
        let label: 'first-login' | 'used' | 'unknown' = 'unknown';
        try {
            label = await oneSignIn();
        } catch (e) {
            row.password = `unknown: ${String(e instanceof Error ? e.message : e).split('\n')[0]!.slice(0, 160)}`;
        } finally {
            await context.close();
            // Write back without touching any other key: the label, and drop the issue note once the account is usable again.
            const json = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
            json.accountStatus = { ...(json.accountStatus ?? {}), [a.company]: label };
            if (label === 'first-login' && json.accountIssues) delete json.accountIssues[a.company];
            fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(json, null, 2) + '\n');
            const table = ['company\tmobile\tunlock\tpassword', ...rows.map(r => `${r.company}\t${r.mobile}\t${r.unlock}\t${r.password}`)].join('\n');
            console.log(`\nRepair of tried accounts:\n${table}\n`);
            await testInfo.attach('repair-tried-accounts.tsv', { body: table, contentType: 'text/tab-separated-values' });
        }
        expect(label, `the password of ${a.company} could not be updated: ${row.password}`).toBe('first-login');
    });
});
