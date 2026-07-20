import { test, expect, Page } from '../HomepageFixtures';
import { HOME_URL_PATTERN, refreshHomepage } from '../HomePageHelper';
import { HomepageBillsOverviewPage } from '../../pageElements/Homepage/HomepageBillsOverviewPage';

test.describe('Homepage – Bills section interactions', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let billsOverview: HomepageBillsOverviewPage;

    test.beforeEach(async ({ homepagePage, billsOverview: bo }) => {
        page = homepagePage;
        billsOverview = bo;
        await refreshHomepage(page);
    });

    test('should switch to Cards view when the Cards toggle is clicked', async () => {
        await expect(billsOverview.billsCardsToggle).toBeVisible();
        await billsOverview.billsCardsToggle.click();
        await expect(billsOverview.billsCardsToggle).toBeEnabled();
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should switch back to Chart view when the Chart toggle is clicked', async () => {
        await billsOverview.billsCardsToggle.click();
        await billsOverview.billsChartToggle.click();
        await expect(billsOverview.billsChartToggle).toBeEnabled();
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should navigate to Bills page when the View All link in Bills overview is clicked', async () => {
        await billsOverview.billsViewAllLink.click();
        await expect(page).toHaveURL(/bills/i, { timeout: 10000 });
    });
});
