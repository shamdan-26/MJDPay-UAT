import { type Page, type Locator } from '@playwright/test';

export class HomepageHeaderPage {
    readonly page: Page;

    readonly notificationsPanel: Locator;
    readonly notificationsHeading: Locator;
    readonly profileOrSettingsItem: Locator;

    constructor(page: Page) {
        this.page = page;

        this.notificationsPanel   = page.locator('[class*="notif"], [role="dialog"], [aria-label*="notif" i]').first();
        this.notificationsHeading = page.getByRole('heading', { name: /notifications?/i });

        this.profileOrSettingsItem = page
            .locator('[id*="profile"], [id*="setting"], [href*="profile"], [href*="setting"]')
            .first()
            .or(page.getByRole('menuitem', { name: /profile|settings?|account/i }).first());
    }
}
