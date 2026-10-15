import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Manage Accounts → Access & Permissions (Groups / Roles) — Business web.
 *
 * Tickets: EMI-5210 (edit role name/description), EMI-5234 (assign/unassign
 * validation), EMI-5240 + EMI-5613 (update/delete groups and roles),
 * EMI-5583/EMI-5584 (groups list on the edit screen), EMI-5897 (tenant +
 * isSystem columns), EMI-5899 (assign-users-to-groups API).
 *
 * Second wave (scope-aware RBAC, EMI-5956 / EMI-5957): EMI-5972 (blank Name
 * column in Arabic), EMI-5973 (raw i18n key in the breadcrumb), EMI-5974
 * (unstyled Create Role button), EMI-5975 (no Arabic name/description fields),
 * EMI-5985 (Delete role fires no request), EMI-5986 (delete group 500),
 * EMI-6000 (both add- and remove-roles fired on Save), EMI-6001 (no Delete
 * action + no confirmation modal), EMI-6005 (Arabic table renders `name`),
 * EMI-6026 (Create Group not gated on CREATE_BUSINESS_GROUP), EMI-6029
 * (duplicate calls on tab switch).
 *
 * Locators are best-effort — this screen is not in QA-DATA-TESTID-HANDOFF.md.
 */
export class GroupsRolesPage {
    readonly page: Page;

    readonly groupsTab: Locator;
    readonly rolesTab: Locator;

    readonly groupRows: Locator;
    readonly roleRows: Locator;
    readonly groupsListContainer: Locator;
    readonly loadingIndicator: Locator;
    readonly emptyState: Locator;

    /** Name cells only — EMI-5972 / EMI-6005 assert on the Name column alone,
     *  so reading whole rows (which still hold the description) would pass
     *  against the very defect being guarded. */
    readonly nameCells: Locator;

    readonly createButton: Locator;
    readonly createGroupButton: Locator;
    readonly createRoleButton: Locator;
    readonly editButton: Locator;
    readonly deleteButton: Locator;
    readonly deleteConfirmButton: Locator;
    readonly deleteConfirmModal: Locator;
    readonly rowActionsMenu: Locator;

    // Edit / create form
    readonly nameInput: Locator;
    readonly descriptionInput: Locator;
    readonly nameArInput: Locator;
    readonly descriptionArInput: Locator;
    readonly saveButton: Locator;

    // Assign users (EMI-5234, EMI-5899) / assign roles (EMI-6000)
    readonly assignUsersButton: Locator;
    readonly unassignUsersButton: Locator;
    readonly userPicker: Locator;
    readonly assignedUsersCount: Locator;
    readonly assignRolesButton: Locator;
    readonly assignPrivilegesButton: Locator;
    readonly privilegeOptions: Locator;

    readonly breadcrumb: Locator;

    readonly successToast: Locator;
    readonly errorToast: Locator;
    readonly forbiddenMessage: Locator;
    readonly alreadyAssignedMessage: Locator;
    readonly systemEntityMessage: Locator;

    constructor(page: Page) {
        this.page = page;

        this.groupsTab = page.getByRole('tab', { name: /groups/i }).or(page.getByRole('link', { name: /groups/i })).first();
        this.rolesTab  = page.getByRole('tab', { name: /roles/i }).or(page.getByRole('link', { name: /roles/i })).first();

        this.groupsListContainer = page.locator('[class*="groups-list"], [class*="group-container"]').first();
        this.groupRows = page.locator('[class*="group-row"], tr').filter({ hasNot: page.getByRole('columnheader') });
        this.roleRows  = page.locator('[class*="role-row"], tr').filter({ hasNot: page.getByRole('columnheader') });
        this.loadingIndicator = page.locator('mat-spinner, [class*="spinner"], [class*="loading"]').first();
        this.emptyState = page.getByText(/no groups|no roles|no data/i).first();

        this.nameCells = page.locator('td[data-column="name"], [class*="name-cell"], [class*="cell-name"]');

        this.createButton        = page.getByRole('button', { name: /create|add\s*(new\s*)?(group|role)/i }).first();
        this.createGroupButton   = page.getByRole('button', { name: /create\s*group|إنشاء\s*مجموعة/i }).first();
        this.createRoleButton    = page.getByRole('button', { name: /create\s*role|إنشاء\s*دور/i }).first();
        this.editButton          = page.getByRole('button', { name: /^edit$/i });
        this.deleteButton        = page.getByRole('button', { name: /^delete$/i });
        this.deleteConfirmModal  = page.getByRole('dialog').filter({ hasText: /are you sure|delete/i }).first();
        this.deleteConfirmButton = page.getByRole('button', { name: /yes|confirm|delete/i }).last();
        this.rowActionsMenu      = page.getByRole('button', { name: /actions|more|⋮/i }).first();

        this.nameInput          = page.getByLabel(/^name$|name\s*\(english\)/i).first();
        this.descriptionInput   = page.getByLabel(/^description$|description\s*\(english\)/i).first();
        // EMI-5975 added these two; they did not exist pre-fix, so a plain
        // getByLabel(/name/i) would have matched the English field instead.
        this.nameArInput        = page.getByLabel(/name\s*\(arabic\)|arabic\s*name|الاسم\s*بالعربية/i).first();
        this.descriptionArInput = page.getByLabel(/description\s*\(arabic\)|arabic\s*description|الوصف\s*بالعربية/i).first();
        this.saveButton         = page.getByRole('button', { name: /save|update|submit/i }).first();

        this.assignUsersButton   = page.getByRole('button', { name: /assign\s*users?/i }).first();
        this.unassignUsersButton = page.getByRole('button', { name: /unassign|remove\s*users?/i }).first();
        this.userPicker          = page.getByLabel(/users?/i).or(page.locator('mat-select[id*="user"]')).first();
        this.assignedUsersCount  = page.locator('[class*="users-count"], [data-column="usersCount"]').first();
        this.assignRolesButton   = page.getByRole('button', { name: /assign\s*roles?|إسناد\s*الأدوار/i }).first();
        this.assignPrivilegesButton = page.getByRole('button', { name: /assign\s*privileges?|إسناد\s*الصلاحيات/i }).first();
        this.privilegeOptions    = page.getByRole('checkbox').or(page.locator('[class*="privilege-item"]'));

        this.breadcrumb = page.locator('[class*="breadcrumb"], nav[aria-label*="readcrumb"]').first();

        this.successToast = page.getByTestId('toast-message').or(page.getByText(/successfully/i)).first();
        this.errorToast   = page.getByText(/error|failed|went wrong/i).first();
        this.forbiddenMessage = page.getByText(/forbidden|not authorized/i).first();
        this.alreadyAssignedMessage = page.getByText(/already assigned|not assigned/i).first();
        this.systemEntityMessage = page.getByText(/system (groups?|roles?).*(cannot|can not) be/i).first();
    }

    async openGroups(): Promise<void> {
        await expect(this.groupsTab).toBeVisible({ timeout: 15000 });
        await this.groupsTab.click();
    }

    async openRoles(): Promise<void> {
        await expect(this.rolesTab).toBeVisible({ timeout: 15000 });
        await this.rolesTab.click();
    }

    async editFirst(name: string, description: string): Promise<void> {
        await this.editButton.first().click();
        await expect(this.nameInput).toBeVisible({ timeout: 15000 });
        await this.nameInput.fill(name);
        await this.descriptionInput.fill(description);
        await this.saveButton.click();
    }

    async deleteFirst(): Promise<void> {
        await this.deleteButton.first().click();
        await this.deleteConfirmButton.click();
    }

    /**
     * Deletes the named row through its Actions menu (EMI-5985 / EMI-6001 both
     * describe the action living behind a three-dot menu, not an inline
     * button). Falls back to the inline button when no menu is rendered.
     */
    async deleteRowByName(name: string): Promise<void> {
        const row = this.rowByName(name);
        await expect(row).toBeVisible({ timeout: 15000 });

        const menu = row.getByRole('button', { name: /actions|more|⋮/i }).first();
        const hasMenu = await menu.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
        if (hasMenu) {
            await menu.click();
            await this.page.getByRole('menuitem', { name: /^delete$/i }).first().click();
        } else {
            await row.getByRole('button', { name: /^delete$/i }).first().click();
        }
    }

    async confirmDelete(): Promise<void> {
        await expect(this.deleteConfirmModal).toBeVisible({ timeout: 15000 });
        await this.deleteConfirmButton.click();
    }

    rowByName(name: string): Locator {
        return this.groupRows.filter({ hasText: name }).first();
    }

    /**
     * The rendered Name column, one entry per row. Deliberately NOT `.first()` —
     * EMI-5972 shows as an *empty* cell, so a per-row read is the only way to
     * see the blank; a whole-row read would still find the description text.
     */
    async nameColumnTexts(): Promise<string[]> {
        const count = await this.nameCells.count();
        const texts: string[] = [];
        for (let i = 0; i < count; i++) {
            texts.push((await this.nameCells.nth(i).innerText()).trim());
        }
        return texts;
    }

    /** EMI-5974: the Create Role button must carry a real primary background,
     *  not the transparent/inherited default it shipped with. */
    async createRoleBackgroundColor(): Promise<string> {
        return this.createRoleButton.evaluate(el => getComputedStyle(el).backgroundColor);
    }

    async openAssignPrivileges(): Promise<void> {
        await expect(this.assignPrivilegesButton).toBeVisible({ timeout: 15000 });
        await this.assignPrivilegesButton.click();
    }
}
