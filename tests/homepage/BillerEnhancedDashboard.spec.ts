/**
 * Biller Enhanced Dashboard — EMI-1797
 * Status: To Do (planned — not yet implemented)
 *
 * Tests are skipped until the feature is built. Placeholders exist so requirements
 * are tracked in version control and CI surfaces missing coverage explicitly.
 *
 * Resolve AMB-HP-04 before enabling: confirm UAT has seeded bill data for the
 * biller test account (UAT_BILLER_COMPANY / UAT_BILLER_MOBILE).
 */

import { test, expect } from '@playwright/test';
import { loginAsBiller, BASE_ORIGIN } from './helpers';

test.describe('Biller Enhanced Dashboard (EMI-1797)', () => {
    test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(['geolocation'], { origin: BASE_ORIGIN });
        await loginAsBiller(page);
    });

    test.skip('should display Total Bills KPI', async ({ page }) => {
        // E-01: A tile/card showing the total number of bills for this biller
        const kpi = page.locator('[data-testid="kpi-total-bills"], [id*="total-bills"]');
        await expect(kpi).toBeVisible();
    });

    test.skip('should display Total Paid Bills KPI', async ({ page }) => {
        // E-02: A tile/card showing the count of paid bills
        const kpi = page.locator('[data-testid="kpi-total-paid"], [id*="total-paid"]');
        await expect(kpi).toBeVisible();
    });

    test.skip('should display Total Unpaid Bills KPI', async ({ page }) => {
        // E-03: A tile/card showing the count of unpaid bills
        const kpi = page.locator('[data-testid="kpi-total-unpaid"], [id*="total-unpaid"]');
        await expect(kpi).toBeVisible();
    });

    test.skip('should display Total Created (pending approval) Bills KPI', async ({ page }) => {
        // E-04: A tile/card showing bills created but not yet approved
        const kpi = page.locator('[data-testid="kpi-total-created"], [id*="total-created"]');
        await expect(kpi).toBeVisible();
    });

    test.skip('should display Total Expired Bills KPI', async ({ page }) => {
        // E-05: A tile/card showing the count of expired bills
        const kpi = page.locator('[data-testid="kpi-total-expired"], [id*="total-expired"]');
        await expect(kpi).toBeVisible();
    });

    test.skip('should display Total Bills Paid This Month KPI', async ({ page }) => {
        // E-06: A tile/card scoped to the current calendar month
        const kpi = page.locator('[data-testid="kpi-paid-this-month"], [id*="paid-this-month"]');
        await expect(kpi).toBeVisible();
    });

    test.skip('should display Total Beneficiaries with per-beneficiary bill totals', async ({ page }) => {
        // E-07: A list or table showing each beneficiary and their respective bill count/total
        const beneficiarySection = page.locator(
            '[data-testid="beneficiaries-summary"], [id*="beneficiar"]'
        );
        await expect(beneficiarySection).toBeVisible();
        const rows = beneficiarySection.locator('tr, [class*="row"]');
        expect(await rows.count()).toBeGreaterThan(0);
    });
});
