import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Manage Accounts → Manage Users list screen (Business web portal).
 * Reached via HomepageSidebarPage.manageUsersSidebarLink.
 *
 * Manage Users is NOT in QA-DATA-TESTID-HANDOFF.md §4, so every locator below
 * is a best-effort guess built from the ticket wording (EMI-4742 names the
 * exact list columns: Full Name, User Group, Mobile Number, Status; EMI-4812
 * names the Status dropdown; EMI-5817 names the Reset Password action).
 * Reconcile against the live DOM — or request testids from FE — before using
 * this for CI gating. Same caveat as SubWalletsPage.ts.
 */
export class ManageUsersPage {
    readonly page: Page;

    // List
    readonly usersTable: Locator;
    readonly userRows: Locator;
    readonly fullNameCells: Locator;
    readonly userGroupCells: Locator;
    readonly mobileNumberCells: Locator;
    readonly statusCells: Locator;
    readonly emptyState: Locator;
    readonly loadingIndicator: Locator;

    // Filters (EMI-4812, EMI-5883)
    readonly searchInput: Locator;
    readonly statusFilterDropdown: Locator;
    readonly clearFilterButton: Locator;

    // Row actions
    readonly addUserButton: Locator;
    readonly editUserButton: Locator;
    readonly activateUserButton: Locator;
    readonly deactivateUserButton: Locator;
    readonly resetPasswordButton: Locator;

    // Feedback
    readonly successToast: Locator;
    readonly errorToast: Locator;
    readonly unauthorizedMessage: Locator;
    readonly forbiddenPage: Locator;

    constructor(page: Page) {
        this.page = page;

        this.usersTable = page.getByRole('table').or(page.locator('[class*="users-table"], mat-table')).first();
        this.userRows   = this.usersTable.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
        this.fullNameCells     = page.locator('[class*="full-name"], td[data-column="fullName"]');
        this.userGroupCells    = page.locator('[class*="user-group"], td[data-column="groupName"]');
        this.mobileNumberCells = page.locator('[class*="mobile"], td[data-column="mobileNumber"]');
        this.statusCells       = page.locator('[class*="status"], td[data-column="status"]');
        this.emptyState        = page.getByText(/no users|no data|no records/i).first();
        this.loadingIndicator  = page.locator('mat-spinner, [class*="spinner"], [class*="loading"]').first();

        this.searchInput          = page.getByPlaceholder(/search/i).first();
        this.statusFilterDropdown = page.getByLabel(/status/i).or(page.locator('mat-select[id*="status"]')).first();
        this.clearFilterButton    = page.getByRole('button', { name: /clear\s*(filter|all)?/i }).first();

        this.addUserButton        = page.getByRole('button', { name: /add\s*(new\s*)?(user|staff)/i }).first();
        this.editUserButton       = page.getByRole('button', { name: /^edit$/i });
        this.activateUserButton   = page.getByRole('button', { name: /^activate$/i });
        this.deactivateUserButton = page.getByRole('button', { name: /^deactivate$/i });
        this.resetPasswordButton  = page.getByRole('button', { name: /reset\s*password/i });

        this.successToast = page.getByTestId('toast-message').or(page.getByText(/successfully/i)).first();
        this.errorToast   = page.getByText(/error|failed|went wrong/i).first();
        this.unauthorizedMessage = page.getByText(/not authorized|check your permissions/i).first();
        this.forbiddenPage = page.getByText(/forbidden/i).first();
    }

    async waitForList(): Promise<void> {
        await expect(this.usersTable.or(this.emptyState)).toBeVisible({ timeout: 20000 });
    }

    async openAddUserForm(): Promise<void> {
        await expect(this.addUserButton).toBeVisible({ timeout: 15000 });
        await this.addUserButton.click();
    }

    async filterByStatus(status: string): Promise<void> {
        await expect(this.statusFilterDropdown).toBeVisible({ timeout: 15000 });
        await this.statusFilterDropdown.click();
        await this.page.getByRole('option', { name: new RegExp(status.replace(/_/g, '\\s*'), 'i') }).first().click();
    }

    /** Reads the rendered Full Name column so EMI-5000 ("Undefined Undefined") is assertable. */
    async fullNames(): Promise<string[]> {
        const count = await this.userRows.count();
        const names: string[] = [];
        for (let i = 0; i < count; i++) {
            names.push((await this.userRows.nth(i).innerText()).trim());
        }
        return names;
    }

    async rowByName(name: string): Promise<Locator> {
        return this.userRows.filter({ hasText: name }).first();
    }
}
