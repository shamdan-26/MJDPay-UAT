import { test, expect, Page } from '../HomepageFixtures';
import { ASSERTION_TIMEOUT_MS, refreshHomepage } from '../HomePageHelper';
import { HomepageQuickActionsPage } from '../../pageElements/Homepage/HomepageQuickActionsPage';

test.describe('Homepage – Page Elements – Quick actions', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;
    let quickActions: HomepageQuickActionsPage;

    test.beforeEach(async ({ homepagePage, quickActions: qa }) => {
        page = homepagePage;
        quickActions = qa;
        await refreshHomepage(page);
    });

    test('should display the Quick actions section heading', async () => {
        await expect(quickActions.quickActionsHeading).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the "Shortcuts to common tasks" subtitle in Quick actions', async () => {
        await expect(quickActions.quickActionsSubtitle).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Topup quick action card with its description', async () => {
        await expect(quickActions.quickActionTopupCard).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Wallet transfer quick action card with its description', async () => {
        await expect(quickActions.quickActionWalletTransferCard).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Cashout quick action card with its description', async () => {
        await expect(quickActions.quickActionCashoutCard).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });

    test('should display the Receive payment quick action card with its description', async () => {
        await expect(quickActions.quickActionReceivePaymentCard).toBeVisible({ timeout: ASSERTION_TIMEOUT_MS });
    });
});
