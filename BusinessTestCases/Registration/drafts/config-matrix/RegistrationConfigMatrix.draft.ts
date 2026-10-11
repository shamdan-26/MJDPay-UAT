// DRAFT — unverified, not run by the suite. Promote by renaming to .spec.ts and moving to Registration/functional/journeys/.
//
// Configuration matrix: the wizard's behaviour depends on OTP requirement, fixed-Merchant mode, auto-approval,
// language and theme. Instead of testing each flag alone, a pairwise set of combinations (every pair of values
// appears in at least one row) covers interactions with far fewer runs than the full product (2x2x2x2x2 = 32).
//
// Assumptions : mockFixedMerchantMode / mockAutoApprovedRegistration (helpers/registrationUi.ts) intercept the
//               config endpoints correctly (their URL patterns are marked best-effort guesses in that file).
// Prerequisites: none (mock-driven, no OTP, no pool identity).
import { test, expect } from '@playwright/test';
import { REGISTER_URL, generateKSAMobile, mockFixedMerchantMode, mockAutoApprovedRegistration, mockOtpBypass, mockOtpRequired, OTP_OK } from '../../RegistrationHelper';

interface Row { otpRequired: boolean; fixedMerchant: boolean; autoApprove: boolean; lang: 'EN' | 'AR'; theme: 'light' | 'dark' }

// Pairwise (all-pairs) rows for 5 binary factors — 6 rows instead of 32.
const ROWS: Row[] = [
    { otpRequired: true,  fixedMerchant: true,  autoApprove: true,  lang: 'EN', theme: 'light' },
    { otpRequired: true,  fixedMerchant: false, autoApprove: false, lang: 'EN', theme: 'dark'  },
    { otpRequired: false, fixedMerchant: true,  autoApprove: false, lang: 'AR', theme: 'light' },
    { otpRequired: false, fixedMerchant: false, autoApprove: true,  lang: 'EN', theme: 'dark'  },
    { otpRequired: true,  fixedMerchant: false, autoApprove: true,  lang: 'AR', theme: 'light' },
    { otpRequired: false, fixedMerchant: true,  autoApprove: true,  lang: 'AR', theme: 'dark'  },
];

const label = (r: Row) => `otp=${r.otpRequired} fixedMerchant=${r.fixedMerchant} autoApprove=${r.autoApprove} ${r.lang}/${r.theme}`;

test.describe('Registration – configuration matrix (DRAFT)', { tag: ['@registration', '@functional', '@matrix'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'functional' }] }, () => {
    for (const row of ROWS) {
        test(`wizard starts correctly with ${label(row)}`, async ({ page }) => {
            test.setTimeout(120_000);
            await page.emulateMedia({ colorScheme: row.theme });
            await mockFixedMerchantMode(page, row.fixedMerchant);
            await mockAutoApprovedRegistration(page);
            if (row.otpRequired) await mockOtpRequired(page, () => OTP_OK); else await mockOtpBypass(page);

            await page.goto(REGISTER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
            if (row.lang === 'AR') await page.getByRole('button', { name: 'العربية' }).click();
            await page.getByRole('textbox', { name: /Mobile number|رقم الجوال/ }).fill(generateKSAMobile());
            await page.getByRole('button', { name: /next|التالي/i }).click();

            if (row.otpRequired) {
                await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).toBeVisible({ timeout: 20000 });
            } else {
                await expect(page.getByRole('heading', { name: /Enter OTP|أدخل رمز التحقق/i })).toHaveCount(0);
                await expect(page.locator('#register-profile-card-MERCHANT')).toBeVisible({ timeout: 30000 });
                // Fixed-Merchant mode hides the profile-type choice (TC-REG-005/006)
                const cards = page.locator('[id^="register-profile-card-"]');
                if (row.fixedMerchant) await expect(cards).toHaveCount(1); else await expect(cards.first()).toBeVisible();
            }
            await expect(page.locator('html')).toHaveAttribute('dir', row.lang === 'AR' ? 'rtl' : 'ltr');
        });
    }

    test('matrix covers every pair of factor values at least once (self-check of the table)', async () => {
        const factors: (keyof Row)[] = ['otpRequired', 'fixedMerchant', 'autoApprove', 'lang', 'theme'];
        const missing: string[] = [];
        for (let i = 0; i < factors.length; i++) for (let j = i + 1; j < factors.length; j++) {
            const a = factors[i], b = factors[j];
            const values = (k: keyof Row) => [...new Set(ROWS.map(r => String(r[k])))];
            for (const va of values(a)) for (const vb of values(b)) {
                if (!ROWS.some(r => String(r[a]) === va && String(r[b]) === vb)) missing.push(`${a}=${va} & ${b}=${vb}`);
            }
        }
        expect(missing).toEqual([]);
    });
});
