import { test, expect } from '@playwright/test';
import { goToFinancialStepWithDedicatedAsset } from '../../RegistrationHelper';

// ─────────────────────────────────────────────────────────────────────────────
// This test owns its own resident asset outright rather than sharing the
// stateful block's beforeEach (which draws via goToFinancialStep's implicit
// nextResidentAsset() round-robin + retry-cycling). goToFinancialStepWithDedicatedAsset
// draws from its own small reserved pool first, so this test starts out isolated
// from the rest of the suite's contention over the shared pool — but it now falls
// back to nextResidentAsset()'s general pool (DEDICATED_FALLBACK_THRESHOLD in
// RegistrationHelper.ts) once 5 dedicated-pool draws in a row turn out already
// progressed, trading a bit of that isolation for a bounded worst-case runtime.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registration – Financial & Business Step (Tab 2 of 3) — dedicated asset', { tag: ['@registration', '@financial', '@ui'], annotation: [{ type: 'feature', description: 'Registration' }, { type: 'layer', description: 'ui' }] }, () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        // goToFinancialStepWithDedicatedAsset can still retry up to 20 times total
        // (each a full mobile->OTP->Business Info round trip, ~28s), so 600_000
        // stays as the safety-margin cap — but as of the DEDICATED_FALLBACK_THRESHOLD
        // fix it bails out of the reserved pool after 5 already-progressed hits and
        // switches to the much larger general pool, where a fresh draw is likely on
        // the first try. Hitting anywhere near the full 560s worst case should now be
        // rare rather than the expected steady-state it was before that fix.
        test.setTimeout(600_000);
        await goToFinancialStepWithDedicatedAsset(page);
    });

    test('should accept numeric input for Monthly Expected Number Of Bills', async ({ page }) => {
        await page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i }).fill('1500');
        await expect(page.getByRole('textbox', { name: /monthly expected number|العدد الشهري المتوقع للفواتير/i })).toHaveValue('1500');
    });
});
