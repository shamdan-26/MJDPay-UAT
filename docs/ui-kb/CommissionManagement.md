# CommissionManagement - UI logic

Purpose: **Admin Portal** screens that configure commissions per transaction type (Default Commission, and per-account Accounts Commission overrides), plus the Admin **Manage Limits** screens (Wallet Balance / Transaction / Count) which are driven API-first by `AdminLimitsApi`.
Routes (Admin portal, `ADMIN_BASE_URL`):
- Default Commission: `/admin/main/commission/defult-commission` ("Defult" is the product's own spelling) - `AdminCommissionManagementPage.ts` line 40.
- Accounts Commission list: `/admin/main/commission/accounts-list`, then `/admin/main/commission/account-commission?...&a=<internal id>`.
- Manage Limits (wallet): `/admin/main/limitations-management/wallet-limitations` (`WALLET_LIMITS_URL`, `Shared/AdminLimitsApi.ts`); transaction and count screens' URLs not in the repo.
Who sees it: Admin portal staff only; not in the Business portal. Specific admin role/privilege names are not in the repo. One admin login at a time: a second login invalidates the first (401 `SESSION_INVALID`).
Locator catalog: [CommissionManagement.generated.md](CommissionManagement.generated.md); AdminLimitsApi is in [Shared.generated.md](Shared.generated.md) (line 5). Locators here are page-authored `id`s read off the live dev DOM (2026-09-15 / 2026-09-27); row inner ids repeat per row, so always scope through a row Locator.

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Admin sidebar | admin shell | `commissionManagementNavItem` > `defaultCommissionNavLink` | Left nav | Open Default Commission (`openViaSidebar`) |
| Default Commission | `/admin/main/commission/defult-commission` | Header controls: `addNewCommissionButton`, `filterToggle` ("Filter Here..."), `clearFilterButton`, `searchButton` | Top | Add, filter |
| Default Commission | same | Grid `rowsContainer` `#default-commission-rows`, `rows` = `app-defult-commission-row` | Body | Columns: Transaction Type, Minimum Amount, Maximum Amount, Platform, Amount, Status (+ edit pencil) |
| Default Commission | same | Paginator: `totalCommissionsLabel` (`.total-pages`), `nextPageButton`, `prevPageButton` | Footer | 10 rows per page |
| Choose Commission Type modal | overlay | `chooseTypeModal` + `chooseTypeModalCloseIcon` | Overlay | Step 1 of Add New: pick category |
| Add / Edit Commission modal | overlay `#modal_default` / `#add-edit-commission-modal-form` | Step 2 "Choose <Category> Transaction" checkbox dropdown, then Platform, Min, Max, Value, Percentage toggle, Confirm/Cancel | Overlay | Create or edit |
| Accounts Commission list | `/admin/main/commission/accounts-list` | Filter form: mobile (`#input_type_text_name_mobileNumber_mobilenumber`), company (`#input_type_text_name_companyNumber_companynumber`); row action "View Account Commissions" | Page | Find a business account |
| Account Commission | `/admin/main/commission/account-commission` | Grid `accountCommissionRows` = `app-user-commissions-row` (transaction type, min, max, platform, amount, status button, edit) + Add New Commission | Body | Per-account overrides |
| Manage Limits (Admin) | `/admin/main/limitations-management/wallet-limitations` and siblings | Wallet Balance, Transaction, Count tabs/screens | Not modelled in DOM, API only | Limits per type x risk x platform |

Sources: page object header; `ui/DefaultCommissionUI.spec.ts`, `ui/AccountCommissionUI.spec.ts`.

## Forms

### Add / Edit Commission (shared modal, Default and Account)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Category | `chooseCommissionCategory(category)` (readonly inputs, placeholder = label) | single pick (step 1, Add only) | Yes | Categories: Bank Transfer, Cash-In, Wallet To Wallet Transfer, Wallet Payment, Bill Payment, Sub-Wallet Transfer, Reversal, OTC Transfer, Card Transactions (`COMMISSION_CATEGORY`) | - | Add flow |
| Transaction (account type) | `chooseAccountType(type)` | checkbox dropdown "Choose <Category> Transaction" | Yes (Add only) | Default: Customer/Merchant/Biller/Company (Bank Transfer confirmed). Account level offers only what that account is eligible for | - | After category |
| Platform | `platformDropdownInput` / `choosePlatform` | dropdown WEB, APP, SYSTEM | Yes | Re-selecting the already-active value leaves the panel open and blocks later fields | - | Modal open |
| Minimum Amount | `minimumAmountInput` (ids `...min...` Default, `...minValue...` Account) | text/number | Yes | Not negative; must be <= Maximum | none: Confirm stays disabled | Modal open |
| Maximum Amount | `maximumAmountInput` | text/number | Yes | >= Minimum | Confirm disabled | Modal open |
| Value | `valueInput` (`#input_type_text_name_amountValue_value`) | number | Yes | If percentage toggle on: <= 100 (tests use 1-20 for valid) | Confirm disabled when > 100 | Modal open |
| Percentage toggle | `percentageToggle` | switch | No | Default ON (percentage); OFF = fixed amount | - | Modal open |
| Confirm | `confirmButton` | button | - | Disabled for: min > max, percent > 100, negative min, empty min | no message; button disabled | Valid values |
| Cancel | `cancelButton` | button | - | Leaves row unchanged; modal overlay hides | - | Always |

Edit form opens pre-filled, with no category step; transaction type is not editable there.

### Default Commission filter

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Transaction Type | `transactionTypeFilterInput` (`#ddl_search_input_type_dropdown_name_transactionTypeCode_TransactionType`) | dropdown | No | Exact label e.g. "Merchant Bank Transfer" | - | Filter open |
| Platform | `platformFilterInput` | dropdown | No | WEB/APP/SYSTEM | - | Filter open |
| Status | `statusFilterInput` (`#input_type_dropdown_name_isActive_Status`) | dropdown | No | Active / Inactive | - | Filter open |
| Search / Clear | `searchButton`, `clearFilterButton` | buttons | - | Filter by type + platform narrows to one row; clear restores more than one | - | Always |

### Admin Manage Limits (API shape, `AdminLimitsApi`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Transaction type | `typeName` / `typeCode` | lookup `/api/v1/transaction-types` | Yes | e.g. "Biller Bank Cashin" code 102003 | - | - |
| Risk level | `riskLevel` | LOW / MEDIUM / HIGH | Yes | "ALL" option exists, guarded by a warning modal - never used by tests | warning modal | - |
| Platform | `platformTypeCode` | WEB / APP | Yes | "ALL" also exists | warning modal | - |
| Min amount | `min` | number | Yes | Min top-up amount is the `min` of the Transaction limit row, not a separate setting | - | - |
| Max amount per period | `hourly/daily/monthly/yearly` | number | Yes | Periods HOUR, DAY, MONTH, YEAR only (no WEEK, no per-transaction max) | - | - |
| Max count per period | `...PeriodTransactionCount` | number | Yes | Same four periods; 0 = disabled for that tier (matrix doc) | - | - |
| Wallet min/max balance | `minBalance`, `maxBalance` | number | Yes | Per wallet type x risk | - | - |

Request body field names are unverified (no write was captured) - `AdminLimitsApi.ts` header.

## Tables and lists

| Aspect | Detail | Source |
|---|---|---|
| Default grid columns | Transaction Type, Minimum Amount, Maximum Amount, Platform, Amount, Status | `ui/DefaultCommissionUI.spec.ts` line 31 |
| Account grid columns | transaction type, min, max, amount, platform, status button, edit pencil | page object `account*Cell` |
| Type label vs code | Backend only has numeric `transactionTypeCode` (e.g. "102003"); grid name lookup can fail and show the raw code, so prefer API lookup over text scan | `AdminCommissionManagementPage.ts` lines 66-75 |
| Paging | 10 rows per page; `#PAGINATOR_NEXT_PAGE_BTN` / `#PAGINATOR_PREVIOUS_PAGE_BTN`; total label `.total-pages` | page object |
| Sorting | Not documented | - |
| Load timing | Header renders before row data; wait for `.total-pages` before reading ("No Data Found" shows while loading) | `waitForListLoaded` |
| Empty state | "No Data Found" | `AccountCommissionUI.spec.ts` line 36 |
| Row status | Badge class `status-active` vs `status-inactive` (`isRowActive`) | page object |
| Row actions | Edit pencil (`#user-commissions-row-edit`), status dropdown with one alternative item at a time | page object |
| Account rows | No delete exists; only Activate/Disable | `disableAccountRow` doc |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `addNewCommissionButton` | Default / Account header | Opens Choose Commission Type | Always | `chooseTypeModal` |
| Category row | Choose type modal | Picks category | - | Step 2 form |
| `confirmButton` | Modal | Creates/updates | Valid values | Row appears or updates; modal hides |
| `cancelButton` | Modal | Closes without saving | Always | Row unchanged |
| `editIcon(row)` | Row | Opens pre-filled form | Row exists (a click has been seen to not open the modal in long runs - retry) | Edit modal |
| `statusToggleButton(row)` -> menu item | Row | Active row shows "Disable" (`...-status-item-false`); disabled row shows "Activate" (`...-status-item-true`) | Row exists | Opens an Activate/Disable confirmation dialog, then status flips |
| `nextPageButton` / `prevPageButton` | Footer | Change page | Other page exists | Page changes, returns to first |
| `filterToggle`, `searchButton`, `clearFilterButton` | Header | Filter | - | Grid narrows / restores |
| "View Account Commissions" | Accounts list row | Opens account commission page | Account found by mobile+company | `/account-commission` |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Row `isActive` true | Badge `status-active`, menu offers Disable | `isRowActive` |
| Row inactive | Badge `status-inactive`, menu offers Activate | same |
| min > max, percent > 100, negative min or empty min | Confirm disabled; nothing submitted | `CommissionNegative.spec.ts` |
| Duplicate type + platform | Backend 409 `COMMISSION_ALREADY_EXISTS`; no second row (UI error acceptable) | CommissionNegative; `CommissionApi.spec.ts` line 195 |
| Account override exists | Takes priority over Default commission (`COM_ACC` over `COM`) | `Topup-Admin-Config-Matrix.md` line 38 |
| Account type selected for an account | Step 2 lists only types that account is eligible for | page object header |
| Admin JWT ~18 min | Headers refreshed after 10 min to avoid mid-test 401 | `API_HEADERS_MAX_AGE_MS` |
| Second admin login | First session gets 401 `SESSION_INVALID` | `AdminLimitsApi.ts` header |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| One default commission per transaction type + platform | Duplicate gets 409 | `apiFindCommission` doc |
| Entry shape | `{id, amountValue, min, max, transactionTypeCode, platformType (lowercase), type PERCENTAGE or FIXED, isActive}` | `DefaultCommissionApiEntry` |
| Account override shape | Adds `profileCode`, `effectiveDate` | `AccountCommissionApiEntry` |
| Activate/deactivate is its own call, no body | `PUT /api/v1/default-commissions/{id}/{action}` | `apiSetActive` |
| Platforms | WEB, APP, SYSTEM | `CommissionFormValues` |
| Limits periods | HOUR, DAY, MONTH, YEAR | `AdminLimitsApi.ts` |
| Restore rule | Any test that changes commission/limit config must snapshot and restore exact values incl. active state | `Topup-Admin-Config-Matrix.md` section 0.2 |
| Commission, VAT included in totals (see Transactions) | | EMI-6020 |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Duplicate commission | code `COMMISSION_ALREADY_EXISTS` (text not recorded) | API / possibly UI error |
| Grid empty | "No Data Found" | Grid |
| Invalid values | None - Confirm disabled | Modal |
| Missing token | 401 | API |
| AR | Not in repo | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| List default commissions | `GET /api/v1/default-commissions?page&size` (+ `transactionTypeCode`, `platformType`) | Confirmed live 2026-09-25 |
| Create default | `POST /api/v1/default-commissions` | 409 on duplicate |
| Update default | `PUT /api/v1/default-commissions/{id}` | Malformed body rejected, row unchanged |
| Activate / deactivate | `PUT /api/v1/default-commissions/{id}/{action}` | No body |
| List account overrides | `GET /api/v1/commissions/{profileCode}?page&size` | Confirmed 2026-10-03; returns only that profile's rows |
| Create / update account override | `POST /api/v1/commissions`, `PUT /api/v1/commissions` | Duplicate rejected |
| Find account | `GET /emi-profile/api/v1/profiles/business/pag?...&companyNumber&mobileNumber` | From the filter form |
| Limits | `GET\|PUT /api/v1/limitations/admin-wallet-limitations`, `/transaction-limitations`, `/transaction-count-limitations` | Read off SPA 2026-10-13; writes unverified |
| Lookups | `/api/v1/transaction-types`, `/risk-levels`, `/platform-type`, `/wallet-types` | |
| Auth | Relay SPA's own headers incl. `device-finger-print` | Token is encrypted in localStorage |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Grid may show raw numeric code instead of the type name | `AdminCommissionManagementPage.ts` line 66 |
| Edit click sometimes lands without opening the modal in long runs | `openEditForm` doc |
| Choose-type modal id differs between Default and Account screens | `chooseTypeModal` note |
| Disable flow dialog "assumed by symmetry" with Activate, not confirmed live | `disableRow`, `disableAccountRow` docs |
| Admin Limits PUT body names and GET envelope unverified | `AdminLimitsApi.ts` header |
| Tests hard-code account data (Q9557, +966597389429, profile BIL-ZCGGH41MNK-14) | `CommissionNegative.spec.ts` lines 12-14 |
| Early draft of the matrix wrongly assumed separate min top-up setting and WEEK period | `AdminLimitsApi.ts` header |

## Open questions

| Question | Note |
|---|---|
| Admin roles/privileges needed for Commission and Limits screens | Not in repo |
| Success message text after Confirm / activation | Not recorded |
| Exact validation for percentage fixed-amount upper bound | Only percent > 100 tested |
| Whether commission applies by min/max tier ranges overlapping | Not specified |
| Limits screens' DOM (tabs, ids) and URLs for Transaction and Count | Only wallet URL known |
| Meaning of "ALL" warning modal text | Not recorded |
| Commission/limit precedence beyond account over default | See `Topup-Admin-Config-Matrix.md` open `[CONFIRM-n]` items |
