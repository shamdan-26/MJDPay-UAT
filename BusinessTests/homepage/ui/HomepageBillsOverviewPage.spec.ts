import { test, expect, Page } from '@playwright/test';
import { ASSERTION_TIMEOUT_MS, createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { HomepageBillsOverviewPage } from '../../pageElements/homepage/HomepageBillsOverviewPage';

test.describe('Homepage – Page Elements – Bills overview', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let billsOverview: HomepageBillsOverviewPage;

    test.beforeAll(async ({ browser }) => {
        ({ page, billsOverview } = await createHomepageSession(browser));
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.beforeEach(async () => {
        await refreshHomepage(page);
    });

    test('should display the Bills overview section heading', async () => {
        await expect(billsOverview.billsOverviewHeading).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Chart toggle button in Bills overview', async () => {
        await expect(billsOverview.billsChartToggle).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Cards toggle button in Bills overview', async () => {
        await expect(billsOverview.billsCardsToggle).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Paid category label in Bills overview', async () => {
        await expect(billsOverview.billsPaidLabel).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Unpaid category label in Bills overview', async () => {
        await expect(billsOverview.billsUnpaidLabel).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the View All link in the Bills overview section', async () => {
        await expect(billsOverview.billsViewAllLink).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });
});
