import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createHomepageSession } from './HomePageHelper';
import { DashboardPage } from '../pageElements/Shared/DashboardPage';
import { HomepageSidebarPage } from '../pageElements/Homepage/HomepageSidebarPage';
import { HomepageHeaderPage } from '../pageElements/Homepage/HomepageHeaderPage';
import { HomepageGreetingPage } from '../pageElements/Homepage/HomepageGreetingPage';
import { HomepageBalanceCardPage } from '../pageElements/Homepage/HomepageBalanceCardPage';
import { HomepageQuickActionsPage } from '../pageElements/Homepage/HomepageQuickActionsPage';
import { HomepageBillsOverviewPage } from '../pageElements/Homepage/HomepageBillsOverviewPage';
import { HomepageSubWalletsPage } from '../pageElements/Homepage/HomepageSubWalletsPage';

/**
 * One shared homepage session (login + storageState restore) per worker,
 * reused across every spec file that worker runs — Playwright's documented
 * pattern for expensive setup shared across tests (test-fixtures#worker-scoped-fixtures),
 * replacing the beforeAll/afterAll + createHomepageSession(browser) that used
 * to be copy-pasted into each file. Account selection still goes through
 * homepageAccountForWorker() inside createHomepageSession, so the
 * worker-to-account pairing is unchanged — just created once per worker
 * instead of once per file.
 *
 * Spec files that need a *specific* account (transaction-history fixtures,
 * empty-state fixtures) can't use this — they still call
 * createHomepageSession(browser, 'ACCOUNT_n') directly in their own
 * beforeAll/afterAll: ui/HomepageTransactionsPage.spec.ts,
 * functional/HomepageTransactions.spec.ts, functional/HomepageTransactionsEmptyState.spec.ts.
 */
type HomepageWorkerFixtures = {
    homepagePage: Page;
    dashboard: DashboardPage;
    sidebar: HomepageSidebarPage;
    header: HomepageHeaderPage;
    greeting: HomepageGreetingPage;
    balanceCard: HomepageBalanceCardPage;
    quickActions: HomepageQuickActionsPage;
    billsOverview: HomepageBillsOverviewPage;
    subWallets: HomepageSubWalletsPage;
};

export const test = base.extend<{}, HomepageWorkerFixtures>({
    homepagePage: [async ({ browser }, use, workerInfo) => {
        const session = await createHomepageSession(browser, undefined, workerInfo.parallelIndex);
        await use(session.page);
        await session.page.close();
    }, { scope: 'worker' }],

    dashboard:     [async ({ homepagePage }, use) => { await use(new DashboardPage(homepagePage)); }, { scope: 'worker' }],
    sidebar:       [async ({ homepagePage }, use) => { await use(new HomepageSidebarPage(homepagePage)); }, { scope: 'worker' }],
    header:        [async ({ homepagePage }, use) => { await use(new HomepageHeaderPage(homepagePage)); }, { scope: 'worker' }],
    greeting:      [async ({ homepagePage }, use) => { await use(new HomepageGreetingPage(homepagePage)); }, { scope: 'worker' }],
    balanceCard:   [async ({ homepagePage }, use) => { await use(new HomepageBalanceCardPage(homepagePage)); }, { scope: 'worker' }],
    quickActions:  [async ({ homepagePage }, use) => { await use(new HomepageQuickActionsPage(homepagePage)); }, { scope: 'worker' }],
    billsOverview: [async ({ homepagePage }, use) => { await use(new HomepageBillsOverviewPage(homepagePage)); }, { scope: 'worker' }],
    subWallets:    [async ({ homepagePage }, use) => { await use(new HomepageSubWalletsPage(homepagePage)); }, { scope: 'worker' }],
});

export * from '@playwright/test';
