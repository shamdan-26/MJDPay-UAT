import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Manage Accounts → Access & Permissions (Groups / Roles) — Business web.
 *
 * Tickets: EMI-5210 (edit role name/description), EMI-5234 (assign/unassign
 * validation), EMI-5240 + EMI-5613 (update/delete groups and roles),
 * EMI-5583/EMI-5584 (groups list on the edit screen), EMI-5897 (tenant +
 * isSystem columns), EMI-5899 (assign-users-to-groups API).
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

    readonly createButton: Locator;
    readonly editButton: Locator;
    readonly deleteButton: Locator;
    readonly deleteConfirmButton: Locator;

    // Edit form
    readonly nameInput: Locator;
    readonly descriptionInput: Locator;
    readonly saveButton: Locator;

    // Assign users (EMI-5234, EMI-5899)
    readonly assignUsersButton: Locator;
    readonly unassignUsersButton: Locator;
    readonly userPicker: Locator;
    readonly assignedUsersCount: Locator;

    readonly successToast: Locator;
    readonly errorToast: Locator;
    readonly forbiddenMessage: Locator;
    readonly alreadyAssignedMessage: Locator;

    constructor(page: Page) {
        this.page = page;

        this.groupsTab = page.getByRole('tab', { name: /groups/i }).or(page.getByRole('link', { name: /groups/i })).first();
        this.rolesTab  = page.getByRole('tab', { name: /roles/i }).or(page.getByRole('link', { name: /roles/i })).first();

        this.groupsListContainer = page.locator('[class*="groups-list"], [class*="group-container"]').first();
        this.groupRows = page.locator('[class*="group-row"], tr').filter({ hasNot: page.getByRole('columnheader') });
        this.roleRows  = page.locator('[class*="role-row"], tr').filter({ hasNot: page.getByRole('columnheader') });
        this.loadingIndicator = page.locator('mat-spinner, [class*="spinner"], [class*="loading"]').first();
        this.emptyState = page.getByText(/no groups|no roles|no data/i).first();

        this.createButton        = page.getByRole('button', { name: /create|add\s*(new\s*)?(group|role)/i }).first();
        this.editButton          = page.getByRole('button', { name: /^edit$/i });
        this.deleteButton        = page.getByRole('button', { name: /^delete$/i });
        this.deleteConfirmButton = page.getByRole('button', { name: /yes|confirm|delete/i }).last();

        this.nameInput        = page.getByLabel(/name/i).first();
        this.descriptionInput = page.getByLabel(/description/i).first();
        this.saveButton       = page.getByRole('button', { name: /save|update|submit/i }).first();

        this.assignUsersButton   = page.getByRole('button', { name: /assign\s*users?/i }).first();
        this.unassignUsersButton = page.getByRole('button', { name: /unassign|remove\s*users?/i }).first();
        this.userPicker          = page.getByLabel(/users?/i).or(page.locator('mat-select[id*="user"]')).first();
        this.assignedUsersCount  = page.locator('[class*="users-count"], [data-column="usersCount"]').first();

        this.successToast = page.getByTestId('toast-message').or(page.getByText(/successfully/i)).first();
        this.errorToast   = page.getByText(/error|failed|went wrong/i).first();
        this.forbiddenMessage = page.getByText(/forbidden|not authorized/i).first();
        this.alreadyAssignedMessage = page.getByText(/already assigned|not assigned/i).first();
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
}
