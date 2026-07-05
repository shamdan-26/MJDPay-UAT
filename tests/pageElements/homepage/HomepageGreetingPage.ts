import { type Page, type Locator } from '@playwright/test';

export class HomepageGreetingPage {
    readonly page: Page;

    readonly pageHeading: Locator;
    readonly greetingText: Locator;
    readonly greetingSubtitle: Locator;

    constructor(page: Page) {
        this.page = page;

        this.pageHeading      = page.locator('#header-page-title.header-left.page-title');
        this.greetingText     = page.getByText(/good\s+(morning|afternoon|evening)/i).first();
        this.greetingSubtitle = page.getByText(/happening with your wallet today/i).first();
    }
}
