import { type Page, type Locator } from '@playwright/test';

export class HomepageBillsOverviewPage {
    readonly page: Page;

    readonly billsOverviewHeading: Locator;
    readonly billsChartToggle: Locator;
    readonly billsCardsToggle: Locator;
    readonly billsPaidLabel: Locator;
    readonly billsUnpaidLabel: Locator;
    readonly billsViewAllLink: Locator;

    constructor(page: Page) {
        this.page = page;

        this.billsOverviewHeading = page.getByText('Bills overview').first();
        this.billsChartToggle     = page.getByRole('button', { name: /^chart$/i });
        this.billsCardsToggle     = page.getByRole('button', { name: /^cards$/i });
        this.billsPaidLabel       = page.getByText(/^paid$/i).first();
        this.billsUnpaidLabel     = page.getByText(/^unpaid$/i).first();
        this.billsViewAllLink     = page.locator('button[type="button"].mp-bills__more').first();
    }
}
