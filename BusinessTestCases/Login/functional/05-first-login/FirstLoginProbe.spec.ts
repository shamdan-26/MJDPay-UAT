import { test } from '../../../shared/fixtures.ts';
import testAccounts from '../../../../data/testAccounts.json';
import { LoginPage } from '../../../pageElements/Shared/LoginPage';
import { OtpPage } from '../../../pageElements/Shared/OtpPage';
import { FIRST_LOGIN_DEFAULT_PASSWORD, VALID_PASSWORD, VALID_OTP, LOGIN_URL, generateUnregisteredMobile } from '../../helpers/LoginHelper.ts';

// Step 0 of the first-login plan: find which registration-created accounts still have the default password.
// Read-only and opt-in (FIRST_LOGIN_PROBE=1): exactly ONE sign-in attempt per account, so the 3-attempt lockout is
// never approached. It asserts nothing — it prints a table and attaches it to the report.
//
// It signs in through the real login page (fresh browser context per account) and reads the /auth/signin response
// from the browser: a direct API call is answered with an empty 412 for every user, even the happy account.
// Review the table, then add the accounts that really are first-time to data/testAccounts.json → firstLoginAccounts.

type Account = { company: string; mobile: string };

// Accounts other modules (or the shared Login/Topup suites) depend on are never probed.
const IN_USE = new Set<string>([
    testAccounts.merchant, testAccounts.merchant2, testAccounts.biller,
    testAccounts.loginAccounts.happy, testAccounts.loginAccounts.blocked,
    ...Object.values(testAccounts.moduleAccounts),
].map((a: Account) => a.company));

const CANDIDATES: Account[] = testAccounts.createdAccounts.filter(a => !IN_USE.has(a.company));

test.describe('Login — First-login probe (opt-in)', { tag: ['@login', '@functional', '@first-login'], annotation: [{ type: 'feature', description: 'Login' }, { type: 'layer', description: 'functional' }] }, () => {
    test.skip(!process.env['FIRST_LOGIN_PROBE'], 'Set FIRST_LOGIN_PROBE=1 — sends one sign-in with the default password per candidate account');

    test('LG-FIRST-00: which created accounts still accept the default password', async ({ browser }, testInfo) => {
        test.setTimeout(15 * 60_000);
        const rows: string[] = [];

        const probe = async (label: string, a: Account, password: string) => {
            const context = await browser.newContext();
            const page    = await context.newPage();
            let status = 0;
            let body   = '';
            page.on('response', async res => {
                if (res.request().method() !== 'POST' || !/\/auth\/signin$/.test(res.url())) return;
                status = res.status();
                body   = await res.text().catch(() => '');
            });
            try {
                const loginPage = new LoginPage(page);
                await loginPage.goto(LOGIN_URL);
                await loginPage.fillAndSubmit(a.company, a.mobile, password);
                for (let i = 0; i < 40 && !status; i++) await page.waitForTimeout(500);
                await page.waitForTimeout(2500); // let the app route to OTP / forced-change screen / error toast
                const screen = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160);
                let keys = '';
                let claims = '';
                try {
                    const json = JSON.parse(body);
                    keys = Object.keys(json).join(',');
                    // Token claims (never the token itself): booleans in full, other claims by name only — a first-login flag may live here.
                    const payload = JSON.parse(Buffer.from(String(json.accessToken?.token ?? '').split('.')[1] ?? '', 'base64url').toString('utf8'));
                    claims = Object.entries(payload).map(([k, v]) => typeof v === 'boolean' ? `${k}=${v}` : k).join(',');
                } catch { /* not JSON / no token */ }

                // Past the OTP step: a first-time account should land on the forced password-change screen, a normal one on home.
                let afterOtp = '';
                if (status === 200) {
                    const otp = new OtpPage(page);
                    if (await otp.isVisible()) {
                        await otp.fillAndVerify(VALID_OTP);
                        await page.waitForTimeout(4000);
                        const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200);
                        afterOtp = `${page.url().replace(/^https?:\/\/[^/]+/, '')} | ${text}`;
                    }
                }
                rows.push([`${label}${a.company}`, a.mobile, status || 'no response', page.url().replace(/^https?:\/\/[^/]+/, ''), `keys=[${keys}]`, `claims=[${claims}]`, screen, afterOtp].join('\t'));
            } finally {
                await context.close();
            }
        };

        // Controls: the happy account with its real password (a normal successful sign-in) and a mobile that is not
        // registered — they show what "normal" and "unknown user" look like next to the candidates.
        await probe('CONTROL happy account, real password: ', testAccounts.loginAccounts.happy, VALID_PASSWORD);
        await probe('CONTROL unregistered mobile: ', { company: 'Z0000', mobile: generateUnregisteredMobile() }, FIRST_LOGIN_DEFAULT_PASSWORD);
        for (const a of CANDIDATES) await probe('', a, FIRST_LOGIN_DEFAULT_PASSWORD);

        const table = ['company\tmobile\tsign-in status\tpage after submit\tresponse keys\ttoken claims\tscreen after sign-in\tafter OTP 918512 (url | screen)', ...rows].join('\n');
        console.log(`\nFirst-login probe (${CANDIDATES.length} accounts, default password):\n${table}\n`);
        await testInfo.attach('first-login-probe.tsv', { body: table, contentType: 'text/tab-separated-values' });
    });
});
