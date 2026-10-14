# SubWallets - UI logic

Purpose: Business Portal screens to list, create, edit, view, nest and close **sub-wallets** under a business wallet (EMI-5185 FE, EMI-5186 BE, EMI-5215 CRUD APIs, EMI-5275 close cascade).
Route: `https://<host>/business/main/sub-wallets` (`SUB_WALLETS_URL`, `SubWallets/SubWalletsHelper.ts` line 20). Detail and form routes: not confirmed (open from list by row name).
Who sees it: Business portal users holding the sub-wallet privilege (mock uses `VIEW_SUB_WALLET`, `CREATE_SUB_WALLET`); without it the sidebar link and Create button are hidden (SWP-01, EMI-5274/5276). The Homepage has a small separate sub-wallets panel (`HomepageSubWalletsPage`, not this module).
Locator catalog: [SubWallets.generated.md](SubWallets.generated.md). All locators are best-effort (no data-testids: "not tagged yet" in QA-DATA-TESTID-HANDOFF.md). Specs are largely **mock-driven**.

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Sub-Wallets list (root) | `/business/main/sub-wallets` | Heading "Sub Wallets" (`heading`) | Top | Title (SW-UI-01) |
| Sub-Wallets list | same | `createButton` | Header | Start create flow |
| Sub-Wallets list | same | `rows` (table row or card) | Body, no tabs (SW-UI-02) | One per root sub-wallet |
| Sub-Wallets list | same | `emptyMessage`, `loadingIndicator`, `errorMessage` | Body | Empty / loading / error state |
| Create / Edit form | opened from list or details | Fields + `submitButton` | Form | Create or edit (`SubWalletFormPage`) |
| Success sheet | after create | Bottom sheet (`successSheet`) with `configureButton` | Bottom of screen | Confirms create, deep-links to configuration (SW-02) |
| Details | after clicking a row | Tabs `walletInfoTab`, `subWalletsTab` | Top of details | Wallet Info (read-only) and nested children |
| Details - Wallet Info tab | | `detailsPanel`, `statusBadge`, `editButton`, `closeButton` | Header actions | Read-only info + Edit/Close |
| Details - Sub-Wallets tab | | `nestedRows`, `createNestedButton` | Body / header | Child sub-wallets; header swaps to Create only (SW-06) |
| Nested detail | click nested row | `backToMainButton` | Header | Appears past depth 1, returns to root list (SW-07) |
| Close confirm dialog | after Close | `closeConfirmModal`, `closeConfirmButton`, `closeBlockedError` | Overlay (`mat-dialog-container`) | Confirm close or show block reason |

Sources: `pageElements/SubWallets/*.ts`; `SubWalletManagement.spec.ts`, `ui/SubWalletsPage.spec.ts`.

## Forms

### Create / Edit sub-wallet (`SubWalletFormPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Name | `nameInput` | text | Yes | Must be unique (EMI-5248); empty blocked (SW-03) | `validationError` (`mat-error`) for empty; `duplicateNameError` "A sub-wallet with this name already exists" (mock) | Create and Edit |
| Wallet Type | `walletTypeSelect` | select | Yes (SW-01 sets it) | Example value `ESCROW` | not confirmed | Create; edit not confirmed |
| Currency | `currencySelect` | select | Yes (SW-01 sets it) | Example `SAR`. **Disabled in edit mode** (SW-04) | - | Create only |
| Notes | `notesInput` | text | No | - | - | Create and Edit |
| Is Sharable | `shareableToggle` | switch | No | - | - | Create and Edit |
| Card Issuance Enabled | `cardIssuanceToggle` | switch | No | - | - | Create and Edit |
| Submit | `submitButton` | button (/save\|create\|submit\|confirm/) | - | Submit with empty name shows `validationError` and no success sheet | - | Form open |

Sources: `SubWalletFormPage.ts` header, SW-01/03/04, SW-UI-04, `SubWalletsHelper.ts` `SubWalletInput`.

## Tables and lists

| Aspect | Detail | Source |
|---|---|---|
| Root list rows | Sub-wallet name (found via `rowByName`), also code, status, type, currency, parentName in API payload | `SubWalletsHelper.ts` `MockSubWallet` |
| Status values | `ACTIVE`, `CLOSED`, `FROZEN` (`statusBadge`) | helper line 36 |
| Layout | Root screen lists wallets directly, **no tabs** (SW-UI-02) | `ui/SubWalletsPage.spec.ts` |
| Nested list | Sub-Wallets tab on details lists children (`nestedRows`), N levels deep ("infinitely vertical", EMI-4153) | `SubWalletDetailsPage.ts`; `EMI-Refined-User-Stories.md` line 238 |
| Empty state | Text matching /no sub-?wallets?( yet)?/ (`emptyMessage`) | SW-UI-03 |
| Filters, sorting, paging | Not confirmed | - |
| Row action | Click row to open details (`openByName`) | `SubWalletsPage.ts` |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `createButton` | List header | Opens create form | User has create privilege | Form |
| `submitButton` | Form | POST `/api/v1/sub-wallets` | Name filled | Success sheet or error |
| `configureButton` | Success sheet | Deep-link to sub-wallet configuration | After create success | Configuration (GET `.../configuration`) |
| `editButton` | Details, Wallet Info tab | Opens form in edit mode | Wallet Info tab active | Form, currency disabled |
| `closeButton` | Details, Wallet Info tab | Opens close confirmation | Wallet Info tab active | `closeConfirmModal` |
| `closeConfirmButton` | Close dialog | POST `/api/v1/sub-wallets/{id}/close` | Dialog open | CLOSED or `closeBlockedError` |
| `createNestedButton` | Details, Sub-Wallets tab | Create a child sub-wallet | Sub-Wallets tab active; replaces Edit/Close | Form |
| `walletInfoTab` / `subWalletsTab` | Details | Switch tab | Always | Header actions change |
| `backToMainButton` | Nested details | Returns to root list | Nesting depth > 1 | Root list heading |

Sources: `SubWalletManagement.spec.ts` SW-02, 05-09.

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Wallet Info tab active | Edit + Close visible, no Create | SW-05, SW-06 |
| Sub-Wallets tab active | Only Create visible; Edit/Close hidden | SW-06 |
| Nesting depth > 1 | "Back to Main Sub-Wallet" visible | SW-07 |
| Edit mode | Name editable, Currency disabled | SW-04 |
| No sub-wallets | Empty message | SW-UI-03 |
| User lacks privilege | Sidebar link + Create hidden; API returns 403 on create | SWP-01, SWP-02, EMI-5274 |
| Privilege revoked then re-granted | Access restored, module not stuck hidden | SWP-03, SWP-04, EMI-5276 |
| A child has pending transactions | Close of parent blocked | SW-09, EMI-5275 |
| All children pass validation | Close succeeds, no block error | SW-08 |
| List API fails | `errorMessage` /internal server error\|something went wrong\|500/ | `SubWalletsPage.ts` |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Name unique | Duplicate returns 400 `DUPLICATE_SUB_WALLET_NAME` | EMI-5248, SWB-03 |
| Currency immutable after create | Disabled in edit | SW-04, EMI-5185 |
| Close cascades | Parent close validates all descendants; any with pending transactions blocks (`SUB_WALLET_NOT_CLOSABLE`) | EMI-5275, SW-08/09 |
| N-level nesting | Sub-wallets of sub-wallets | EMI-4153; refined stories line 238 |
| Create copies parent wallet configuration | `wallet-config/copy` runs behind POST | EMI-5571 |
| Backend model (not UI-verified) | Inherit parent KYC, own vIBAN, optional sharing roles viewer/spender/manager, linked cards, funding by transfer | `EMI-Business-Rules-part1-core-modules.md` line 146 |
| Privilege enforced by API not only UI | | EMI-5274, SWP-02 |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Duplicate name | "A sub-wallet with this name already exists" (mock) | Form (`duplicateNameError`) |
| Close blocked | "A sub-wallet has pending transactions and cannot be closed" (mock) | `closeBlockedError` |
| Create 500 (pre-fix) | Raw JSON with `/api/v1/internal/wallet-config/copy` | Toast - must not appear (SWB-01) |
| 403 | "Access denied" | API body (mock) |
| Empty list | /no sub-wallets (yet)/ | List |
| AR texts | Not in repo | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| List | `GET **/api/v1/wallets**` | Mocked with `{content:[...]}`; real list path may differ |
| Create | `POST /api/v1/sub-wallets` | Confirmed from EMI-5571/5417 curl |
| Configuration | `GET /api/v1/wallet-config/sub-wallet/{code}/configuration` | Confirmed; 500 pre-fix (EMI-5417) |
| Close | `POST /api/v1/sub-wallets/{id}/close` | Method/path from mock pattern only |
| Privileges | `**/api/v1/**privilege**` | Mock pattern only |
| Internal copy | `/api/v1/internal/wallet-config/copy` | Seen only in the EMI-5571 error body |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Whole module mock-driven; screen URL and locators unverified | `SubWalletsHelper.ts` header |
| Regression guards: EMI-5571 (create 500), EMI-5417 (config 500), EMI-5248 (duplicate accepted), EMI-5249 (details hidden on click), EMI-5274/5276 (privilege) | `SubWalletBugs.spec.ts`, `SubWalletPermissions.spec.ts` |
| Privilege grant/revoke needs Admin Portal, so mocked | `SubWalletPermissions.spec.ts` line 18 |
| Recursive nesting beyond one level not in any original AC/test | `EMI-Refined-User-Stories.md` line 238 |

## Open questions

| Question | Note |
|---|---|
| Real privilege codes | Only mock names `VIEW_SUB_WALLET`, `CREATE_SUB_WALLET` |
| Allowed Wallet Type values beyond `ESCROW` | Not in repo |
| Field-level validation texts, max lengths | Not in repo |
| Real list endpoint and close method | Mock patterns only |
| Whether Wallet Type is editable in edit mode | Only Currency confirmed disabled |
| Paging, sorting, filters | Not in repo |
