import { type Page, type Locator, expect } from '@playwright/test';

/**
 * EMI Admin — Account Management > User Information (Profile Information)
 * URL: /admin/main/account-management/user-information
 *
 * The page has no ID in its URL: reach it by searching Manage Users → Accounts → Business
 * (AdminBusinessAccountsPage.openAccountDetails) and clicking the account.
 *
 * NOTE: Grid rows reuse the same IDs (merchantBillerRow-*) for every row.
 * Never use them page-wide — always go through row(...) to scope them.
 * The status dropdowns are readonly inputs: check them with toHaveValue, not toHaveText.
 */
export class UserInformationPage {
    readonly page: Page;

    // ── Breadcrumbs ─────────────────────────────────────────────
    readonly mainBreadcrumbs: Locator;
    readonly breadcrumbHome: Locator;
    readonly breadcrumbBusiness: Locator;
    readonly breadcrumbCurrent: Locator;
    readonly backToAccountsListButton: Locator;

    // ── Profile header ──────────────────────────────────────────
    readonly header: Locator;
    readonly initials: Locator;
    readonly brandName: Locator;
    readonly mobileNumber: Locator;   // text: "Mobile Number\n+9665..."
    readonly companyNumber: Locator;  // text: "Company Number\nW...."
    readonly userStatus: Locator;

    // ── Status dropdowns (readonly inputs, value = current status) ──
    readonly activeStatusInput: Locator;
    readonly activateOption: Locator;
    readonly deactivateOption: Locator;

    readonly approveStatusInput: Locator;
    readonly approveOption: Locator;
    readonly disapproveOption: Locator;

    readonly blockStatusInput: Locator;
    readonly blockOption: Locator;
    readonly unblockOption: Locator;

    // ── Tabs ────────────────────────────────────────────────────
    readonly tabs: Locator;
    readonly nafathInfoTab: Locator;
    readonly wathiqInfoTab: Locator;
    readonly bankViolationsTab: Locator;
    readonly signupInfoTab: Locator;
    readonly documentsTab: Locator;
    readonly usersTab: Locator;
    readonly productsTab: Locator;
    readonly contractTab: Locator;
    readonly walletsTab: Locator;
    readonly tabContent: Locator;

    // ── Users tab grid ──────────────────────────────────────────
    readonly usersGrid: Locator;
    readonly usersGridLoader: Locator;
    readonly usersGridHeader: Locator;
    readonly usersGridRows: Locator;     // all rows
    readonly totalUsers: Locator;        // text: "Total users: N"
    readonly paginator: Locator;

    constructor(page: Page) {
        this.page = page;
        const id = (v: string) => page.locator(`[id="${v}"]`);

        // Breadcrumbs
        this.mainBreadcrumbs = id('main-breadcrumbs');
        this.breadcrumbHome = id('main-breadcrumb-0');
        this.breadcrumbBusiness = id('main-breadcrumb-3');
        this.breadcrumbCurrent = id('userInformation-breadcrumb-current');
        this.backToAccountsListButton = id('userInformation-breadcrumb-link');

        // Profile header
        this.header = id('userInformation-header');
        this.initials = id('userInformation-initials');
        this.brandName = id('userInformation-brand-name');
        this.mobileNumber = id('userInformation-mobile-number');
        this.companyNumber = id('userInformation-company-number');
        this.userStatus = id('userInformation-user-status');

        // Status dropdowns
        const dd = 'input_type_dropdown_name_standalone_';
        this.activeStatusInput = id(`${dd}ActiveStatus`);
        this.activateOption = id(`dropdown_item_${dd}ActiveStatus_0`);
        this.deactivateOption = id(`dropdown_item_${dd}ActiveStatus_1`);

        this.approveStatusInput = id(`${dd}ApproveStatus`);
        this.approveOption = id(`dropdown_item_${dd}ApproveStatus_0`);
        this.disapproveOption = id(`dropdown_item_${dd}ApproveStatus_1`);

        this.blockStatusInput = id(`${dd}BlockStatus`);
        this.blockOption = id(`dropdown_item_${dd}BlockStatus_0`);
        this.unblockOption = id(`dropdown_item_${dd}BlockStatus_1`);

        // Tabs (index-based IDs — re-check if tab order changes per account type)
        this.tabs = id('userInformation-tabs');
        this.nafathInfoTab = id('userInformation-tab-0');
        this.wathiqInfoTab = id('userInformation-tab-1');
        this.bankViolationsTab = id('userInformation-tab-2');
        this.signupInfoTab = id('userInformation-tab-3');
        this.documentsTab = id('userInformation-tab-4');
        this.usersTab = id('userInformation-tab-5');
        this.productsTab = id('userInformation-tab-6');
        this.contractTab = id('userInformation-tab-7');
        this.walletsTab = id('userInformation-tab-8');
        this.tabContent = id('userInformation-tab-content');

        // Users grid
        this.usersGrid = id('merchantBillerList-container');
        this.usersGridLoader = id('merchantBillerList-loader');
        this.usersGridHeader = id('merchantBillerList-header');
        this.usersGridRows = id('merchantBillerRow-container');
        this.totalUsers = id('merchantBillerList-total-pages');
        this.paginator = id('merchantBillerList-paginator');
    }

    // ── Row-scoped locators (safe against duplicate IDs) ─────────
    /** Find a grid row by username / mobile / any unique text, or by index. */
    row(match: string | number) {
        const row =
            typeof match === 'number'
                ? this.usersGridRows.nth(match)
                : this.usersGridRows.filter({ hasText: match });
        const cell = (v: string) => row.locator(`[id="merchantBillerRow-${v}"]`);
        return {
            root: row,
            username: cell('username'),
            tenantNumber: cell('tenantNumber'),
            userType: cell('userType'),
            activeButton: cell('active-button'),
            approvedButton: cell('approved-button'),
            lockedButton: cell('locked-button'),
            // Dropdown items have no IDs — matched by visible text
            deactivateItem: row.getByRole('button', { name: 'deactivate', exact: true }),
            disapproveItem: row.getByRole('button', { name: 'disapproved', exact: true }),
        };
    }

    // ── Helpers ─────────────────────────────────────────────────
    async goto() {
        await this.page.goto('/admin/main/account-management/user-information');
    }

    async setActiveStatus(option: 'Activate' | 'Deactivate') {
        await this.activeStatusInput.click();
        await (option === 'Activate' ? this.activateOption : this.deactivateOption).click();
    }

    async setApproveStatus(option: 'Approve' | 'Disapprove') {
        await this.approveStatusInput.click();
        await (option === 'Approve' ? this.approveOption : this.disapproveOption).click();
    }

    async setBlockStatus(option: 'Block' | 'Unblock') {
        await this.blockStatusInput.click();
        await (option === 'Block' ? this.blockOption : this.unblockOption).click();
    }

    /** Opens the Users tab by its visible name (index-based tab IDs can shift per account type). */
    async openUsersTab(): Promise<void> {
        await this.tabs.getByRole('button', { name: /^users$/i }).click();
        await expect(this.usersGridRows.first()).toBeVisible({ timeout: 20000 });
    }

    /**
     * Unlocks a user from the Users tab: clicks that user's Locked button and, if a menu/confirm
     * item appears, picks the unlock action. Fails loudly if the button still reads "locked" afterwards.
     */
    async unlockUser(match: string): Promise<void> {
        const locked = this.row(match).lockedButton;
        await expect(locked, `no Locked button for user ${match} in the Users tab`).toBeVisible({ timeout: 10000 });
        await locked.click();
        const action = this.page.getByRole('button', { name: /^(unlock|unlocked|confirm|yes)$/i }).first();
        if (await action.waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false)) await action.click();
        await expect(locked, 'user still shows as locked after the unlock action').not.toHaveText(/^\s*locked\s*$/i, { timeout: 15000 });
    }
}
