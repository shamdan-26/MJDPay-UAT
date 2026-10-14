# UserManagement - UI logic

Purpose: Staff user management and RBAC. Business Portal: **Manage Users** (list, add, edit, activate/deactivate, reset password) and **Access & Permissions** (Groups / Roles / Privileges). Admin Portal: **Business accounts** list, **User Information** page, **External Parties**, admin users/staff groups.
Routes:
- Business: `/business/main/manage-users`, `/business/main/groups-roles` (older), `/business/main/groups-management` (newer, EMI-6026/6029) - `UserManagement/UserManagementHelper.ts` lines 461, 28-29.
- Admin: `/admin/main/account-management/accounts-list` (Business accounts), `/admin/main/account-management/user-information` (no id in URL), `/admin/main/external-part`, `/admin/main/manage-users` - helper line 462-463, page objects.
Who sees it: Business portal = account admins with the matching privileges (create group needs `CREATE_BUSINESS_GROUP`, EMI-6026); Admin portal = admin staff. Exact per-action privilege codes beyond those named are not in the repo.
Locator catalog: [UserManagement.generated.md](UserManagement.generated.md) (6 page objects). Business-side locators are best-effort (not in QA-DATA-TESTID-HANDOFF.md section 4); Admin Business accounts / User Information locators use real ids (re-confirmed live 2026-10-11). Business specs are **mock-driven**.

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Manage Users list (Business) | `/business/main/manage-users` | `usersTable`, `userRows`, cells: `fullNameCells`, `userGroupCells`, `mobileNumberCells`, `statusCells` | Main body | List staff users (EMI-4742) |
| Manage Users list | same | `searchInput`, `statusFilterDropdown`, `clearFilterButton` | Above table | Search / filter |
| Manage Users list | same | `addUserButton`, row actions `editUserButton`, `activateUserButton`, `deactivateUserButton`, `resetPasswordButton` | Header / row | Lifecycle actions |
| Add New User form (`AddUserFormPage`) | opened from list | National ID, Mobile, Email, Group, Role, Save, Cancel | Form | Create staff user (EMI-4847) |
| Nafath step | after create | `nafathScreen`, `nafathRandomNumber` | Replaces form | Identity verification (MU-06) |
| Groups & Roles (Business) | `/business/main/groups-management` | `groupsTab`, `rolesTab`, `groupRows`, `roleRows`, `breadcrumb` | Tabs + table | List groups / roles |
| Groups & Roles | same | `createGroupButton`, `createRoleButton`, `rowActionsMenu` (three-dot), `editButton`, `deleteButton` | Header / row | CRUD |
| Create/Edit group or role | modal/form | `nameInput`, `descriptionInput`, `nameArInput`, `descriptionArInput`, `saveButton` | Modal | Edit names (EN + AR) |
| Assign users / roles / privileges | from group/role | `assignUsersButton`, `unassignUsersButton`, `userPicker`, `assignRolesButton`, `assignPrivilegesButton`, `privilegeOptions`, `assignedUsersCount` | Detail view | Membership and privileges |
| Delete confirm | modal | `deleteConfirmModal`, `deleteConfirmButton` | Overlay | Confirm delete (EMI-6001) |
| Business accounts (Admin) | `/admin/main/account-management/accounts-list` | `heading` "Business accounts", `filtersButton` -> `filterDrawer` (`mobileNumberInput`, `searchButton`), `totalUsersText` | Header / drawer | Find account by mobile (needs `+966` prefix) |
| User Information (Admin) | `/admin/main/account-management/user-information` | Header (`brandName`, `mobileNumber`, `companyNumber`, `userStatus`), status dropdowns, 9 tabs | Page | Account profile and status control |
| External Parties (Admin) | `/admin/main/external-part` | `partiesTable`, `addPartyButton` -> `modal` | Page / dialog | Add service providers (EMI-6067) |

Sources: page-object headers; `GroupsRolesPage.ts`; `AdminBusinessAccountsPage.ts` lines 8-24.

## Forms

### Add New User (Business, `AddUserFormPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| National ID / Iqama | `nationalIdInput` | text | Yes | Replaces first/last name (EMI-4847); `firstNameInput`/`lastNameInput` must be absent (MU-03) | `invalidNationalIdError` /(national id\|iqama\|identity).*(invalid\|not valid)/; `requiredFieldError` /is required/ | Form open |
| Mobile | `mobileInput` | text | Yes | KSA shape `5XXXXXXXX` | `requiredFieldError` | Form open |
| Email | `emailInput` | text | Not confirmed (optional in `UserInput`) | - | - | Form open |
| Group | `groupDropdown` | mat-select | Yes (group with at least one role per EMI-167) | Options from groups API; must not be empty (EMI-5583/5584) | - | Form open |
| Role | `roleDropdown` | mat-select | Not confirmed | - | - | Form open |
| Save | `submitButton` | button | - | Empty form: disabled OR field error (MU-05); must settle - never endless spinner (MUB-11, `assertSubmitSettles`) | Specific validation message or success | Form open |
| Cancel | `cancelButton` | button | - | - | - | Form open |

### Create / Edit Group or Role (`GroupsRolesPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Name (English) | `nameInput` | text | Yes | - | - | Not a system entity |
| Description (English) | `descriptionInput` | text | Not confirmed | - | - | Not a system entity |
| Name (Arabic) | `nameArInput` | text | Not confirmed | Added by EMI-5975 | - | Not a system entity |
| Description (Arabic) | `descriptionArInput` | text | Not confirmed | Added by EMI-5975 | - | Not a system entity |
| Save | `saveButton` | button | - | Role edit returns 200 not 400 (EMI-5210); group edit not 403 (EMI-5613) | `errorToast`, `forbiddenMessage` | Form open |
| User picker | `userPicker` | select | For assign | Already-assigned user rejected | `alreadyAssignedMessage` | Assign flow |

### Add External Party (Admin modal, `ExternalPartyPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Name | `nameInput` | text | Yes | - | "This field is required" (`requiredFieldError`, EMI-6067) | Modal open |
| Email | `emailInput` | text | Yes | - | same | Modal open |
| Mobile Number | `mobileInput` | text | Yes | - | same | Modal open |
| Status | `statusDropdown` | select | Yes | - | same | Modal open |
| Role | `roleDropdown` | select | Yes | Must list selectable options; empty = EMI-6067 defect (`roleOptions()`) | same | Modal open |
| Submit | `submitButton` | button /add external party\|submit\|save/ | - | - | - | Modal open |

### Admin filter: Business accounts

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Mobile Number | `mobileNumberInput` (`#input_type_text_name_mobileNumber_mobilenumber`) | text | No | **Requires `+966` prefix**; `toAdminMobile()` adds it | none: no match | Drawer open |
| Search | `searchButton` | button | - | Shows "Total users: N" on hits | - | Drawer open |

## Tables and lists

| Aspect | Detail | Source |
|---|---|---|
| Manage Users columns | Full Name, User Group, Mobile Number, Status (EMI-4742). Full Name must never read "Undefined Undefined" (EMI-5000) | `ManageUsersPage.ts`; MUB-02 |
| User status values | PENDING_VERIFICATION, UNDER_REVIEW, ACTIVE, DEACTIVATED, REJECTED, DELETED; status is `{code,nameEn,nameAr}`. Filter tested for the five live (all but DELETED) | `USER_STATUSES`; MU-07 |
| Manage Users filters | Search, Status dropdown (sends `statusCode`, EMI-4812), Clear filter | MUB-03 |
| Manage Users empty state | /no users\|no data\|no records/, no error toast (MU-02) | spec |
| Groups columns | Name, Description, assigned-user count; tenant and `isSystem` flags (EMI-5897). Arabic layout must show a non-empty Name cell (EMI-5972) | GR-01; GRL-01 |
| Roles columns | Name (Arabic layout shows `nameAr`, falls back to `name` only when null - EMI-6005), user count must equal assigned users (SAL-4799) | GRL-02, GR-08 |
| Groups/Roles row actions | Edit, Delete behind a three-dot menu (EMI-5985/6001); none on `isSystem` rows | `deleteRowByName`; GR-05 |
| Business accounts grid (Admin) | Rows with ids `merchantBillerRow-active-button`, `-approved-button`, `-blocked-button`, `-options-dropdown-toggle` (Row actions: "user info", "commissions"); newest registrations at END of unfiltered list; "Total users: N" | `AdminBusinessAccountsPage.ts` lines 18-23 |
| User Information Users tab (Admin) | Grid `merchantBillerList-container`, rows `merchantBillerRow-*` (username, tenantNumber, userType, active/approved/locked buttons); paginator, total pages | `UserInformationPage.ts` |
| External parties | Table `partiesTable`; empty state /no (external )?part(y\|ies)\|no data/ | `ExternalPartyPage.ts` |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `addUserButton` | Manage Users | Opens Add User form | User has create privilege (not named) | Form |
| `submitButton` (Add User) | Form | POST create user | Valid input | Nafath screen opens (MU-06), user appears in list (MU-04, AUP-01) |
| `editUserButton` | Row | Edit user group | Row | Success message (MU-08) |
| `deactivateUserButton` / `activateUserButton` | Row | ACTIVE to DEACTIVATED and back (MU-09/10) | Privilege granted (EMI-5085/5078) | Status updates |
| `resetPasswordButton` | Row | Resets password (SMS with new credentials per legacy rules) | Privilege | Success, no Forbidden redirect (EMI-5817) |
| `createGroupButton` | Groups tab | Opens create group modal | Caller holds `CREATE_BUSINESS_GROUP` (hidden/disabled otherwise, RBS-04) | Modal |
| `createRoleButton` | Roles tab | Opens create role | Must have primary background style (EMI-5974) | Form |
| `deleteButton` -> `deleteConfirmButton` | Row menu | DELETE group / role after confirmation | Not `isSystem` | Row removed; request must fire (EMI-5985) |
| `assignUsersButton` / `unassignUsersButton` | Group | Assign / unassign users | - | Success or 400 USER_ALREADY_ASSIGNED / USER_NOT_ASSIGNED |
| `assignRolesButton` / `assignPrivilegesButton` | Group / role | Open selection | - | Save sends only a diff (RBS-08) |
| `setActiveStatus` (Activate/Deactivate) | Admin User Information | Dropdown `...ActiveStatus` | Admin | Status input value changes; deactivated account cannot sign in (LG-INT-02) |
| `setApproveStatus` (Approve/Disapprove), `setBlockStatus` (Block/Unblock) | Admin User Information | Dropdowns | Admin | Value changes |
| `unlockUser(match)` | Admin Users tab | Clicks the user's Locked button | User locked | Fails loudly if still "locked" |
| `addPartyButton` | External Parties | Opens modal | Admin | `modal` |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| New user created | Nafath screen shows; status starts PENDING_VERIFICATION | EMI-4847, EMI-4844 |
| Status UNDER_REVIEW | Cannot log in until review outcome | `EMI-Business-Rules-part2-admin-payments.md` line 64 |
| Status REJECTED / DELETED | Permanent; never reactivated | same |
| Group has `isSystem` true | No Edit / Delete; API returns `SYSTEM_ENTITY_CANNOT_BE_MODIFIED` | GR-05, RBS-06c |
| Caller lacks `CREATE_BUSINESS_GROUP` | Create Group hidden/disabled; click never opens modal | RBS-04/04b/04c |
| Caller lacks "Get All privilege" | 403 `UNAUTHORIZED_USER` on custom privileges | RBS-02 |
| Privilege list scope | Shows only what caller holds (no escalation) | RBS-01, EMI-6016 |
| Obsolete privilege 220 "Get Groups Settings" | Not assignable | RBS-03, EMI-5999 |
| Arabic layout | Roles table shows `nameAr`; Name column not blank | GRL-01/02 |
| Tab switch Groups/Roles | Each listing fires once per visit | RBS-05, EMI-6029 |
| Admin: Business accounts filter | Works only with `+966` prefix | `AdminBusinessAccountsPage.ts` |
| Admin: deactivate business account | Next sign-in rejected with generic error | LG-INT-02/03 |
| New user with no explicit privileges | Gets only assigned set, no SUPER_ADMIN inheritance | MUB-08, EMI-4997 |
| Add User Save | Must end in success or a specific validation, never infinite spinner | MUB-11 |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Verification chain for every staff user | Yakeen, WS1 sanctions, Nafath, AML; any failure blocks creation | `EMI-Business-Rules-part2-admin-payments.md` line 64 (EMI-167) |
| Access at creation | At least one group with at least one role required (two-layer selector) | same |
| Effective privileges = union of roles | Same role under two groups does not double | same line 60 |
| Tenant isolation | Tenant A never sees Tenant B's non-SYSTEM groups/roles | same |
| Missing privilege gives 403 | | same |
| Seeded default groups/roles are system entities | `isSystem` true | RBS-09, EMI-5902 |
| Role assignment saved as a diff | No add/remove call when nothing changed | RBS-08, EMI-6000 |
| Scoped listings | `/custom/groups`, `/custom/roles` return `nameAr`, `descriptionAr` | RBS-10, GRL-03, EMI-6004 |
| Legacy model (EMI-197/176) | first/last name + single role; superseded | same doc line 66 |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| 403 | "You are not authorized to perform this action. Please check your permissions" (`UNAUTHORIZED_EXCEPTION`); or "Forbidden" | `unauthorizedMessage`, `forbiddenPage` |
| Privilege 403 | "You are not authorized to perform this action" (`UNAUTHORIZED_USER`) | API |
| Assign twice | "User is already assigned to this group" (`USER_ALREADY_ASSIGNED`) | `alreadyAssignedMessage` |
| Unassign non-member | "User is not assigned to this group" (`USER_NOT_ASSIGNED`) | same |
| System entity | "System groups/roles cannot be modified or deleted" | `systemEntityMessage` |
| 500 | "Failed to process your request.Please contact support." | Toast |
| External Party required field | "This field is required" | `requiredFieldError` |
| Success | /successfully/ (exact text not confirmed) | `successToast` |
| AR | Button names matched in Arabic: "إنشاء مجموعة", "إنشاء دور", "إسناد الأدوار", "إسناد الصلاحيات" | `GroupsRolesPage.ts` |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| List/create/update users | `**/api/v1/users**`, `/api/v1/users/*` | Inferred, no curl in tickets |
| Reset password | `**/api/v1/**reset-password**` | Pattern |
| Groups/roles (older) | `/api/v1/groups`, `/api/v1/roles` | Inferred |
| Custom groups / roles list | `GET /custom/groups?page&size`, `GET /custom/roles?page&size` | Confirmed (EMI-6029/6004/6005) |
| Privileges | `GET /groups/roles/custom/privileges` (tenant), `GET /groups/roles/privileges` (system) | Confirmed |
| Assign / unassign users | `.../emi-profile/api/v1/groups/{id}/assign-users`, `.../unassign-users` | unassign confirmed (EMI-5234 curl) |
| Role assignment | `PUT /groups/{groupId}/roles`, `PUT /groups/{groupId}/roles/remove` | Confirmed (EMI-6000) |
| Delete group / role | `DELETE /groups/{groupId}`, `DELETE /groups/roles/{roleId}` | Confirmed (EMI-6001/5986/5985) |
| Admin staff groups | `GET /emi-profile/api/v1/groups/admin/staff` | Confirmed (EMI-6066) |
| External party roles | `**/external-part**role**` | Pattern only |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Business suite is mock-driven because users burn National IDs / mobiles and can't be reverted | `ManageAccounts.md` lines 11-17 |
| EMI-4907 (new users cannot log in) not automated: ticket lacks steps | `ManageAccounts.md` line 115 |
| Admin-only tickets (EMI-4683, 4742, 4997, 5078, 5285, 5583, 5584, 5816, 5817, SAL-*) tested via the Business screen where the same API is shared | `ManageAccounts.md` lines 152-160 |
| Defects seen: EMI-5972 blank Name (AR), 5973 raw i18n breadcrumb, 5974 unstyled Create Role, 5975 no Arabic fields, 5985 Delete fires no request, 5986 delete 500, 6000 both add/remove fired, 6001 no Delete/confirm, 6005 AR table shows `name`, 6026 Create Group not gated, 6029 duplicate calls, 6038 new user not listed, 6066 admin group dropdown 500, 6067 external party Role empty | `GroupsRolesPage.ts`, `AdminUserProvisioning.spec.ts` |
| EMI-5113 iOS keyboard, EMI-5155/5179 (Wallet Configuration, other module) out of scope | `ManageAccounts.md` line 118 |
| Two routes for groups (`groups-roles` vs `groups-management`); old one not known to 404 | helper line 457-459 |
| Several tests skip if locators do not resolve | `GroupsRolesLocalization.spec.ts`, `AdminUserProvisioning.spec.ts` |

## Open questions

| Question | Note |
|---|---|
| Is Role a separate required field in Add User, or only Group? | `roleDropdown` exists; EMI-167 says group+role required |
| Is Email required in Add User? | Optional in `UserInput` |
| National ID / mobile validation rules (length, Iqama prefix) | Not in repo |
| Privilege codes for add/edit/activate/reset user and view groups | Only `CREATE_BUSINESS_GROUP` named |
| Real Business user endpoints | Inferred only |
| Admin User Information: contents of each of the nine tabs | Only tab ids known |
| Admin external parties: Status and Role option values | Not in repo |
| Admin `manage-users` page (`ADMIN_USERS_URL`) UI details | URL only, no page object |
