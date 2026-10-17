import { expect, type Locator, type Page } from '@playwright/test';
import { ADMIN_BASE_URL } from '../Shared/AdminOtpConfigPage';

/**
 * Admin portal -> Settings -> Groups, Roles And Privileges (NOT the Business-portal GroupsRolesPage).
 * Discovered live on dev 2026-10-17 through the accessibility tree (no data-testid or ids were seen):
 *   - route /admin/main/groups-management, tabs "groups list" and "roles list";
 *   - a role row has a "Row actions" button whose menu holds "edit role", "assign privilege to role", "delete role"
 *     (each entry is `<div class="dropdown-item pointer ng-star-inserted" id="external-service-row-option-N">`, N = position, supplied by the user);
 *   - "assign privilege to role" opens /admin/main/groups-management/add-edit-role with two lists:
 *       LEFT  = available privileges, button "assign privilege to role" (moves them to the role);
 *       RIGHT = assigned privileges, button "remove privilege from role";
 *     each list has its own "search" box, a "privilege list" and Select all / Unselect all;
 *     the page ends with "Revert Changes" and "Save Changes".
 * Not seen yet: the success feedback after Save (so callers verify by re-reading the assigned list, never by a toast) and the
 * exact markup of one privilege item (the checkbox is located inside the list item, falling back to the item itself).
 * The role list can contain duplicate names (two "Biller Checker" rows on dev), so a role is always taken by exact name, first match.
 */

export const ADMIN_GROUPS_MANAGEMENT_URL = `${ADMIN_BASE_URL}/admin/main/groups-management`;

/** Role names exactly as the roles list shows them (singular; the groups list uses the plural). */
export const ADMIN_ROLE = {
    MERCHANT_ADMIN: 'Merchant Admin',
    BILLER_ADMIN: 'Biller Admin',
} as const;

export class AdminGroupsManagementPage {
    readonly page: Page;

    readonly rolesListTab: Locator;
    readonly noDataMessage: Locator;
    readonly rowActionsButtons: Locator;
    readonly assignPrivilegeMenuItem: Locator;

    // add-edit-role screen (assign privileges)
    readonly roleNameField: Locator;
    readonly availableSearch: Locator;
    readonly assignedSearch: Locator;
    readonly availableList: Locator;
    readonly assignedList: Locator;
    readonly assignButton: Locator;
    readonly removeButton: Locator;
    readonly revertButton: Locator;
    readonly saveButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.rolesListTab = page.getByRole('tab', { name: /roles list/i });
        this.noDataMessage = page.getByText(/no data found/i);
        this.rowActionsButtons = page.getByRole('button', { name: /row actions/i });
        // Menu entries are `.dropdown-item.pointer` (ids `external-service-row-option-<index>`, same ids in every row, so never by id alone).
        this.assignPrivilegeMenuItem = page.locator('.dropdown-item:visible', { hasText: /assign privilege to role/i }).first()
            .or(page.locator('.dropdown-item#external-service-row-option-1:visible').first());

        this.roleNameField = page.getByRole('textbox').first();
        this.availableSearch = page.getByRole('textbox', { name: /^search$/i }).nth(0);
        this.assignedSearch = page.getByRole('textbox', { name: /^search$/i }).nth(1);
        // The lists have NO accessible name (the run's snapshot shows a bare `list`). Each one is the first list after its search box.
        this.availableList = this.availableSearch.locator('xpath=following::*[self::ul or @role="list"][1]');
        this.assignedList = this.assignedSearch.locator('xpath=following::*[self::ul or @role="list"][1]');
        // Button names carry an arrow glyph: "assign privilege to role ➜" and "➜ remove privilege from role".
        this.assignButton = page.getByRole('button', { name: /assign privilege to role/i });
        this.removeButton = page.getByRole('button', { name: /remove privilege from role/i });
        this.revertButton = page.getByRole('button', { name: /revert changes/i });
        this.saveButton = page.getByRole('button', { name: /save changes/i });
    }

    /** Opens the page and the roles tab. The list loads slowly (and shows "No data found" first), so wait for a real row. */
    async openRolesList(): Promise<void> {
        for (let attempt = 1; attempt <= 2; attempt++) {
            await this.page.goto(ADMIN_GROUPS_MANAGEMENT_URL, { waitUntil: 'domcontentloaded' });
            await this.rolesListTab.waitFor({ state: 'visible', timeout: 30000 });
            await this.rolesListTab.click();
            const loaded = await this.rowActionsButtons.first().waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
            if (loaded) return;
        }
        throw new Error('The admin roles list never showed any row (still empty or "No data found" after 2 loads). The admin session may have expired.');
    }

    /** The row of a role: exact name, first match; walks up from the name cell to the nearest element that holds the row's button. */
    private roleRow(roleName: string): Locator {
        return this.page.getByText(roleName, { exact: true }).first().locator('xpath=ancestor::*[.//button][1]');
    }

    /** From the roles list: Row actions -> assign privilege to role, and wait until the assigned list is on screen. */
    async openRolePrivileges(roleName: string): Promise<void> {
        await this.openRolesList();
        await this.roleRow(roleName).getByRole('button', { name: /row actions/i }).click();
        await this.assignPrivilegeMenuItem.waitFor({ state: 'visible', timeout: 10000 });
        await this.assignPrivilegeMenuItem.click();
        await this.page.waitForURL(/\/groups-management\/add-edit-role/, { timeout: 20000 });
        await expect(this.saveButton, 'the assign-privileges screen did not render').toBeVisible({ timeout: 30000 });
        // The assigned list loads a moment after the screen; wait for its first item (the available list is empty for this role).
        await expect(this.assignedList.getByRole('listitem').first()).toBeVisible({ timeout: 30000 });
    }

    /** One privilege item inside a list, by its exact visible name. */
    private item(list: Locator, privilege: string): Locator {
        return list.getByRole('listitem').filter({ hasText: new RegExp(`^\\s*${privilege.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }).first();
    }

    private async search(box: Locator, text: string): Promise<void> {
        await box.fill('');
        await box.fill(text);
    }

    /** Names (text) of the privileges in the ASSIGNED list that match the search text; the list is filtered by the box. */
    async assignedMatching(text: string): Promise<string[]> {
        await this.search(this.assignedSearch, text);
        await this.page.waitForTimeout(500); // the filter is client-side but renders a tick later
        const names = await this.assignedList.getByRole('listitem').allInnerTexts();
        return names.map(n => n.trim()).filter(Boolean);
    }

    /** Names that match in the AVAILABLE (not assigned) list. */
    async availableMatching(text: string): Promise<string[]> {
        await this.search(this.availableSearch, text);
        await this.page.waitForTimeout(500);
        const names = await this.availableList.getByRole('listitem').allInnerTexts();
        return names.map(n => n.trim()).filter(Boolean);
    }

    private async tick(list: Locator, privilege: string): Promise<void> {
        const row = this.item(list, privilege);
        await row.waitFor({ state: 'visible', timeout: 10000 });
        const box = row.locator('input[type="checkbox"], [role="checkbox"]').first();
        if (await box.count()) await box.click({ force: true });
        else await row.click();
    }

    /** Moves one privilege from the assigned list to the available list. Needs Save afterwards. */
    async removeAssigned(privilege: string): Promise<void> {
        await this.search(this.assignedSearch, privilege);
        await this.tick(this.assignedList, privilege);
        await expect(this.removeButton).toBeEnabled({ timeout: 5000 });
        await this.removeButton.click();
    }

    /** Moves one privilege from the available list back to the assigned list. Needs Save afterwards. */
    async addBack(privilege: string): Promise<void> {
        await this.search(this.availableSearch, privilege);
        await this.tick(this.availableList, privilege);
        await expect(this.assignButton).toBeEnabled({ timeout: 5000 });
        await this.assignButton.click();
    }

    async save(): Promise<void> {
        await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
        await this.saveButton.click();
        await this.page.waitForLoadState('networkidle').catch(() => { /* the admin SPA keeps polling */ });
    }
}
