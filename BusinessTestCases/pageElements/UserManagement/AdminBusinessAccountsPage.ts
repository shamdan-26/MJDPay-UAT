import { type Page, type Locator, expect } from '@playwright/test';
import { ADMIN_BASE_URL } from '../Shared/AdminOtpConfigPage';
import { UserInformationPage } from './UserInformationPage';

/** Admin Portal → Manage Users → Accounts → Business ("Business accounts"). */
export const ADMIN_BUSINESS_ACCOUNTS_URL = `${ADMIN_BASE_URL}/admin/main/account-management/accounts-list`;

/**
 * Admin Portal → Manage Users → Accounts → Business. Re-confirmed live
 * 2026-10-11 against the redesigned dev admin SPA (heading "Business accounts",
 * "Filters" button that opens a drawer, replacing the old "Filter Here..." panel).
 *
 * - Filter drawer: the Mobile Number input keeps the page-authored id
 *   `#input_type_text_name_mobileNumber_mobilenumber`; the drawer's button is
 *   "Search". The filter **requires the `+966` prefix** (`+966501000022`) —
 *   without it nothing matches. This supersedes the older "Mobile Number filter
 *   is broken" note: it works with the prefix.
 * - Results are rows with stable ids: `merchantBillerRow-active-button`
 *   (Active/Inactive), `-approved-button` (Approved), `-blocked-button`
 *   (Unblock = not blocked), `-options-dropdown-toggle` (Row actions →
 *   "user info" / "commissions"). A search with hits shows "Total users: N".
 * - Newest registrations are at the END of the unfiltered list (last page) —
 *   filter instead of paging.
 */
export class AdminBusinessAccountsPage {
    readonly page: Page;

    readonly heading: Locator;
    readonly filtersButton: Locator;
    readonly filterDrawer: Locator;
    readonly mobileNumberInput: Locator;
    readonly searchButton: Locator;
    readonly totalUsersText: Locator;

    constructor(page: Page) {
        this.page = page;

        this.heading           = page.getByRole('heading', { name: /business accounts/i });
        this.filtersButton     = page.getByRole('button', { name: /^filters$/i });
        this.filterDrawer      = page.locator('.filter-drawer-layer');
        this.mobileNumberInput = page.locator('#input_type_text_name_mobileNumber_mobilenumber');
        this.searchButton      = this.filterDrawer.getByRole('button', { name: /^search$/i });
        this.totalUsersText    = page.getByText(/Total users:\s*\d+/i);
    }

    /** Opens the Business accounts list by deep link (sidebar labels changed with the redesign). */
    async goto(): Promise<void> {
        await this.page.goto(ADMIN_BUSINESS_ACCOUNTS_URL, { waitUntil: 'domcontentloaded' });
        await expect(this.heading).toBeVisible({ timeout: 30000 });
    }

    /** `+966` + the local digits, whatever format the DB/test holds (`+966…`, `966…`, `05…`, `5…`). */
    static toAdminMobile(mobile: string): string {
        const digits = mobile.replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '');
        return `+966${digits}`;
    }

    /** Filters the list by mobile number (prefix added automatically) and waits for the grid to settle. */
    async searchByMobile(mobile: string): Promise<void> {
        await this.filtersButton.click();
        await this.mobileNumberInput.fill(AdminBusinessAccountsPage.toAdminMobile(mobile));
        await this.searchButton.click();
        await expect(this.filterDrawer).toBeHidden({ timeout: 10000 }).catch(() => { /* drawer may stay in DOM */ });
        await expect(this.totalUsersText.or(this.page.getByText(/no data|no results/i)).first()).toBeVisible({ timeout: 20000 });
    }

    /** The result row containing this mobile number (rows have no wrapper id — anchor on the status buttons' row). */
    rowFor(mobile: string): Locator {
        return this.page
            .locator('div')
            .filter({ hasText: AdminBusinessAccountsPage.toAdminMobile(mobile) })
            .filter({ has: this.page.locator('#merchantBillerRow-active-button') })
            .last();
    }

    /** Asserts exactly one account is listed for this mobile number. */
    async expectAccountListed(mobile: string): Promise<void> {
        await this.searchByMobile(mobile);
        await expect(
            this.totalUsersText,
            `Business account for ${AdminBusinessAccountsPage.toAdminMobile(mobile)} was not found under Manage Users → Accounts → Business`,
        ).toHaveText(/Total users:\s*1\b/i);
        await expect(this.page.locator('#merchantBillerRow-active-button')).toHaveCount(1);
    }

    /** Searches by mobile and opens that account's User Information page (it has no ID in its URL). */
    async openAccountDetails(mobile: string): Promise<UserInformationPage> {
        await this.expectAccountListed(mobile);
        await this.rowFor(mobile).getByText(AdminBusinessAccountsPage.toAdminMobile(mobile)).first().click();
        const details = new UserInformationPage(this.page);
        await expect(details.header).toBeVisible({ timeout: 20000 });
        return details;
    }

    get activeButton(): Locator   { return this.page.locator('#merchantBillerRow-active-button'); }
    get approvedButton(): Locator { return this.page.locator('#merchantBillerRow-approved-button'); }
    get blockedButton(): Locator  { return this.page.locator('#merchantBillerRow-blocked-button'); }
}
