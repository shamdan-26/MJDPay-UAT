import { test, expect, Page } from '@playwright/test';
import { HOME_URL_PATTERN, createHomepageSession, refreshHomepage } from '../HomePageHelper';
import { HomepageBillsOverviewPage } from '../../pageElements/homepage/HomepageBillsOverviewPage';

test.describe('Homepage – Bills section interactions', () => {
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

    test('should switch to Cards view when the Cards toggle is clicked', async () => {
        await expect(billsOverview.billsCardsToggle).toBeVisible();
        await billsOverview.billsCardsToggle.click();
        await page.waitForTimeout(400);
        await expect(billsOverview.billsCardsToggle).toBeEnabled();
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should switch back to Chart view when the Chart toggle is clicked', async () => {
        await billsOverview.billsCardsToggle.click();
        await page.waitForTimeout(300);
        await billsOverview.billsChartToggle.click();
        await page.waitForTimeout(400);
        await expect(billsOverview.billsChartToggle).toBeEnabled();
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should navigate to Bills page when the View All link in Bills overview is clicked', async () => {
        await billsOverview.billsViewAllLink.click();
        await expect(page).toHaveURL(/bills/i, { timeout: 10000 });
    });
});
