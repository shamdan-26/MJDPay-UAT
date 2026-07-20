import { test, expect, Page } from '../HomepageFixtures';
import { ASSERTION_TIMEOUT_MS, refreshHomepage } from '../HomePageHelper';
import { HomepageBillsOverviewPage } from '../../pageElements/Homepage/HomepageBillsOverviewPage';

test.describe('Homepage – Page Elements – Bills overview', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let billsOverview: HomepageBillsOverviewPage;

    test.beforeEach(async ({ homepagePage, billsOverview: bo }) => {
        page = homepagePage;
        billsOverview = bo;
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
