# BillManagement - UI logic

Purpose: a Biller creates bills (Single entry, Detailed entry with line items, or Bulk upload via Excel), views them in the Bill Report ("My Bills") table, and edits them; bills need approval before a Merchant can pay them (EMI-183, EMI-242, EMI-3020, epics EMI-2178/EMI-2179; item tickets listed in `BillItemsPage.ts` header).
Routes: Bill Report / My Bills = `/business/main/bills/bill-report` (sidebar "Bills", `Topup/ui/TopupShellUI.spec.ts:66`). Create Bill is reached from the Bills menu -> "Create Bill / Add Bill" link (`HomePage.CreateBill_NavButton`, "best-effort guess", `Shared/HomePage.ts:61-65`); its URL is not captured anywhere.
Who: Biller accounts (`moduleAccounts.billCreate` in `data/testAccounts.json`, `BillManagement/BillManagementHelper.ts:12-14`). A Merchant sees only approved, issued bills (see PayBill.md).
IMPORTANT: none of these screens are in `QA-DATA-TESTID-HANDOFF.md` (section 5 "not yet covered"); every locator in `CreateBillPage.ts`, `BillItemsPage.ts`, `BillsListPage.ts` is a "best-effort guess" not verified on a live build. Treat labels and selectors below as expected, not confirmed.
Locator catalog: [BillManagement.generated.md](BillManagement.generated.md) (`CreateBillPage`, `BillItemsPage`, `BillsListPage`).

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Create Bill - tabs | Not captured | `singleBillEntryTab`, `detailedBillEntryTab`, `bulkUploadTab` (/bulk upload\|excel/) | Top of form | Choose entry mode |
| Create Bill - master info (step 1 "Bill Info") | Not captured | Fields: `beneficiaryPicker`, `billRefInput`, `amountInput`, `discountTypeSelect`, `discountValueInput`, `applyVatCheckbox`, `issueDateInput`, `expiryDateInput`, `descriptionInput`; `submitBillButton` | Form | Bill header data |
| Detailed - Add Items (step 2) | Not captured | `addItemsStepHeader`, `addItemButton`, item sub-form, `itemsTable`, `itemRows`, `nextStepButton` | Wizard step 2 | Build line items |
| Detailed - Item Info (step 3) | Not captured | `itemInfoStepHeader`, `backButton`, `summaryDiscountAmount`, `summaryVatAmount`, `summaryCommissionAmount`, `summaryTotalAmount` | Wizard step 3 | Review item totals and bill summary |
| Confirmation (step 4) | Not captured | `summarySection` (`[class*=bill-confirmation]`/`[class*=summary]`), `summaryTotalAmount`, `vatAmountValue`, `grandTotalValue` | After submit | Amount breakdown |
| Bulk upload | Not captured | `fileUploadInput` (`input[type=file]`), `uploadSubmitButton`, `uploadErrorMessage`, `uploadSuccessMessage` | Tab | Upload protected Excel template |
| Bill Report (list) | `/business/main/bills/bill-report` | `billsTable`, `billRows`, `loadingIndicator`, `emptyStateMessage`, pagination, `statusBadge` | Main panel | List of the Biller's bills |
| Bill details | Not captured | `billDetailsSection`, `billReferenceValue`, `viewBillButton`, `editBillButton`, `itemDetailsViewMoreButton` | Row click / View | Read a bill, start edit |
| Edit Bill | Not captured | Same form as create + `editSubmitButton` (/^(save changes\|update bill\|submit)$/), `goToEditItemButton`, `goToEditBillButton` | Form | Edit bill and items |

## Forms

### Create / edit bill (master info)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Beneficiary | `beneficiaryPicker` (label /beneficiary/ or placeholder /select beneficiary/) | Picker | Yes | Spec fills "QA Test Beneficiary" | `requiredFieldError` (/is required\|field is required/) | Always |
| Bill Ref. | `billRefInput` | Text | Yes | Unique per bill (spec uses `QA-BILL-<timestamp>`); letters allowed in Excel refs (CB-20) | `requiredFieldError` | Always |
| Amount | `amountInput` (testid `amount-input`, `#input_set_amount`, or label "Amount") | Text | Yes (single); derived from items on Detailed (spec enters 0) | - | `requiredFieldError` | Single mode editable |
| Discount type | `discountTypeSelect` (label or `mat-select[id*=discount]`) | Select: No discount (default), Fixed, Percentage | No | "None" is default and hides the amount field; excluded from API payload | - | Always |
| Discount value | `discountValueInput` | Number | Required once Fixed/Percentage chosen | Must be non-zero; zero rejected; bill-level Fixed cannot exceed bill total | `requiredFieldError` or /discount .*(greater than 0\|cannot be 0)/; `billDiscountExceedsTotalError` | Visible only when type is not None |
| Apply 15% VAT | `applyVatCheckbox` (/apply 15% vat/) | Checkbox | No | Toggling updates VAT Amount and Grand Total immediately without clicking Apply Discount; must not clear an applied discount | - | Always |
| Issue date | `issueDateInput` | Date | No | Bill hidden from Merchant until issue date | - | Always |
| Expiry date | `expiryDateInput` | Date | No | Empty = never expires ("no expiry"/"never expires" shown on summary) | - | Always |
| Description | `descriptionInput` | Text | No | Edit specs write `QA edit <timestamp>` here | - | Always |
| Submit | `submitBillButton` (/submit\|save\|create bill/) | Button | - | Disabled or shows required-field error when Bill Ref/Amount missing | `requiredFieldError` | Form valid |
| Apply Discount | `applyDiscountButton` | Button | - | Explicit discount apply (summary text `discountSummaryText`, `noDiscountText`) | - | Not confirmed |

### Line item (Add / Edit item sub-form)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Item name | `itemNameInput` (/item name\|description/) | Text | Yes | Empty submit rejected (MJDPAY-775) | `itemRequiredFieldError` (/(this field\|item name\|quantity\|unit price) is required\|required field/) | Form open |
| Quantity | `quantityInput` | Number | Yes | - | same | Form open |
| Unit price | `unitPriceInput` | Number | Yes | - | same | Form open |
| Item discount type | `itemDiscountTypeSelect` | Select: No Discount, Fixed, Percentage | No | Leaving empty must still allow adding (EMI-1930); "No Discount" must persist on reopen (EMI-3383) | - | Form open |
| Item discount value | `itemDiscountValueInput` | Number | Needed when type set | Fixed discount greater than item amount flagged on blur, before saving (EMI-3961) | `itemAmountValidationError` (/discount ... (cannot\|must not\|greater than) ... amount/) | Type != No Discount |
| Item VAT | `itemVatInput` (/^vat/) | Number | No | VAT optional on add and on edit (EMI-3957); product VAT must be 0-100 | `vatRequiredError` must NOT show on edit | Form open |
| Commit | `addItemToListButton` (/add item to list\|add new item/) and `saveItemButton` (/^(save\|add\|done\|save item)$/) | Buttons | - | Must be enabled with only name, qty, unit price (EMI-1930) | - | Fields valid |
| Pick product | `addFromProductButton`, `productMultiSelect`, `productSearchInput` (placeholder /search products/), `productOptions` | Multi-select with typeahead | No | Product pre-fills name, price, VAT, discount; ~1,000 products must filter within ~1 s | - | On Add Items step |

### Bulk upload

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Excel file | `fileUploadInput` | File input | Yes | Protected template; checksum validated; tampered file rejected; one invalid row rolls back the whole batch; letters allowed in bill reference; MERCHANT payer type accepted; individual (national ID) payer accepted | `uploadErrorMessage` (/tampered\|checksum\|invalid file\|failed to process/) | Bulk tab |
| Upload | `uploadSubmitButton` (/upload/) | Button | - | - | `uploadSuccessMessage` (/bills? (created\|uploaded) successfully/) | File chosen |

## Tables and lists

### Bill Report (`billsTable`)

| Item | Detail | Source |
|---|---|---|
| Columns | Bill Ref., Beneficiary brand name, Total Amount, Expiry Date, Status; detail view adds Bill type, Discount, VAT, amount breakdown, Bill dates, QR image | `B2B-Transactions.md` CB-18 (manual; not read from DOM) |
| Status | Badge `statusBadge` (`[class*=status-badge\|bill-status]`); `expiredStatusBadge` shows "Expired" | `BillsListPage.ts:53,57` |
| Filters | By Bill Reference, Date Range, Status (manual CB-20); no locators exist | `B2B-Transactions.md` CB-20 |
| Sorting | Not captured | - |
| Paging | `paginationNextButton` (aria-label "Next page"), `paginationPrevButton`, `pageIndicator`; next page must show different records | `BillsListPage.ts:45-49`, `functional/BillsListPage.spec.ts` BLT-02 |
| Loading | Must finish loading, never spin forever (EMI-5616) | BLT-01 |
| Empty state | `emptyStateMessage` (/no bills (found\|to display)/) | `BillsListPage.ts:43` |
| Row actions | Row click opens bill (`openBillByRef`); `viewBillButton`, `editBillButton` | `BillsListPage.ts:51-52,95-103` |

### Item table (`itemsTable`)

| Item | Detail | Source |
|---|---|---|
| Columns | Item name, quantity, unit price, discount, VAT, total (`itemTotalCell`) | Inferred from `BillItemsPage.ts:105`, not confirmed |
| Row actions | `itemEditIcon`, `itemDeleteIcon` per row; `deleteAllItemsButton` | BI-U01, BI-15 |
| Scroll | Vertical scroll in Add Items and Item Info steps (EMI-3630) | BI-U03 |
| Empty state | `emptyItemsMessage` (/no items (added\|yet)\|item list is empty/) | `BillItemsPage.ts:106` |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `openSingleBillEntry` / `openDetailedBillEntry` / `openBulkUpload` (tabs) | Create Bill | Switch mode | Always | Mode form |
| `addItemButton` | Detailed entry | Opens add-item form (page object also has `addItemToListButton`) | Detailed mode | Item sub-form |
| `nextStepButton` (/^(next\|continue)$/) | Wizard | Next step | Valid step | Item Info |
| `backButton` | Item Info | Back to Add Items | Always | Add Items |
| `itemEditIcon` / `itemDeleteIcon` | Item row | Edit / delete item | Per row | Edit form / delete (with confirm for last item) |
| `deleteAllItemsButton` | Item table | Delete all items; list must actually empty (EMI-2100) | Items present | Empty state |
| `confirmDeleteButton` / `cancelDeleteButton` | Last-item dialog | Confirm or keep | Dialog open | Item deleted / kept |
| `submitBillButton` | Create form | Submit bill | Form valid | Confirmation summary |
| `toggleVat` (checkbox) | Edit/Create | Recompute VAT and total | Always | Summary updates |
| `editBillButton` | Bill details | Opens edit | Not Paid (manual CB-23); expired bills must be editable (EMI-5776) | Edit Bill |
| `editSubmitButton` | Edit form | Saves edit; success toast `successToast` (testid `toast-message`) expected | Edit open | Saved |
| `goToEditItemButton` / `goToEditBillButton` | Edit Bill | Switch between item step and bill step; return must not 500 (EMI-1912) | Edit | Step switch |
| `itemDetailsViewMoreButton` | Item/bill details | Shows item details incl. Discount Amount (EMI-3270) | Details open | Details |
| Approve / Reject, Delete bill | Bills / approvals | Manual CB-21, CB-25 (no page-object elements) | Reviewer / owner | Status change / removal |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Discount type None | Discount value field hidden | CB-03 |
| Discount type Fixed/Percentage | Discount value shown and required, 0 rejected | CB-04/CB-05 |
| Detailed bill with zero items | Submit blocked: "At least one item is required to create a detailed bill." | BI-01; `atLeastOneItemError` |
| Editing detailed bill down to zero items | Same error; not saved | BI-02 |
| Deleting the last remaining item | Dialog "This is the last item in the bill. Deleting it will also delete the bill..." (also worded "By continuing with deletion process, bill amount will become 0, are you sure you want to proceed?"); Cancel keeps the item | BI-13/BI-14, CB-24 |
| Bill-level discount > bill total | Submit rejected; no confirmation summary | BI-09 |
| Item discount > item amount | Inline error under amount on blur | BI-08 |
| Item-level and bill-level discount types differ | Both coexist: item 2 x 100 with 10% = 180, bill Fixed 20 -> grand total 160 | BI-11 (EMI-5319) |
| Reopen bill for edit | Previously applied discount shown, not "No Discount" | DBE-02 (EMI-5893) |
| Toggle VAT in edit | VAT Amount and Grand Total update at once; discount preserved | DBE-03/DBE-04 |
| Expired bill | "Expired" badge in Bill Report; editing allowed, no "expired bills cannot be edited" message and no 400 | BLT-04, DBE-05 (EMI-5776) |
| Paid bill | Edit blocked / disabled | CB-23 |
| Approved bill edited | Returns to Pending, needs re-approval | CB-22 |
| Bill not yet issued / unapproved | Hidden from Merchant | CB-19 |
| Opening an owned bill | Must not show "could not be found, or you do not have the necessary permissions" | BLT-03 (EMI-5673) |
| No data | Many specs skip with "verify UAT data setup" (no bills / no expired bill / only one page) | `functional/BillsListPage.spec.ts`, `DetailedBillEditing.spec.ts` |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Item total | Discount applies to the unit price BEFORE quantity: total = (unitPrice - discount) x quantity (EMI-4123); percentage: unitPrice x (1 - pct/100); floored at 0. Open inquiry EMI-4121 asks if KSA expects discount on the line total | `BillManagementHelper.ts:60-86`, `Bill-Items.md` |
| Example | qty 5, unit 10, Fixed 10 -> 0 (bug showed 40); qty 3, unit 20, Fixed 5 -> 45 (not 55); qty 2, unit 100, Fixed 20 -> net 160 | BI-03, BI-04, BI-26 (characterisation) |
| More than 2 items | Total is the sum of all items (3 x 10 x 5 = 150) | BI-06 |
| Calculate API | Each item change fires `POST /bills/calculate`; `netAmountAfterDiscount > 0` for non-zero FIXED items; must not return 5xx when an item is edited | BI-04, BI-05 |
| Delete item | Bill amount drops by the item total; VAT and commission recalculate | BI-16, BI-17 |
| Add item on edit | New item total computed (35 x 2 = 70, not 0); siblings preserved | BI-18 |
| Mixed items | A detailed bill may mix saved products and manual items on create and update | BI-19/BI-20 |
| VAT | 15% on bill (checkbox "Apply 15% VAT"); item VAT optional (0-100) | CB-02, BI-12, CB-12 |
| Dates | Issue date in future hides bill; empty expiry = infinite | CB-08, CB-19 |
| Products | Name unique per biller (case-insensitive), VAT 0-100, soft delete keeps history, up to 1,000 products | `EMI-Business-Rules-part1:E-Bill`, CB-11..CB-13 |
| Bulk upload | Checksum validation; any failing row rolls back the entire batch; errors per failing row | CB-14..CB-17, `EMI-Business-Rules-part1` |
| Approval | New or edited bills need approval before Merchant can pay | `B2B-Transactions.md` section A context |
| Audit | Create, edit, view, delete logged with actor and timestamp | CB-26 |
| Bill states | Approved, Pending, Paid, Expired (and Rejected) | `BillsListPage.ts`, `PayBill.md` |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Detailed bill without items | "At least one item is required to create a detailed bill." (`atLeastOneItemError`: /at least one item is required/) | Inline / form |
| Required fields | /is required\|field is required/ | Under field |
| Item field missing | /(this field\|item name\|quantity\|unit price) is required\|required field/ | Under field |
| VAT required (bug) | /vat is required/ must NOT appear on edit | Under VAT |
| Item discount too big | /discount ... greater than ... amount/ | Under item amount |
| Bill discount too big | /discount ... (cannot\|must not) ... (exceed\|be more than) ... (total\|bill) amount/ | Form |
| Last item delete | "This is the last item in the bill. Deleting it will also delete the bill. Do you want to proceed?" / "By continuing with deletion process, bill amount will become 0..." | Confirm dialog |
| Edit failure | "an unexpected error occured" / "400 Bad Request" must NOT appear (`editGenericError`) | Page |
| Expired edit | "Expired bills cannot be edited" must NOT appear (`expiredBillEditBlockedMessage`) | Page |
| Unauthorized view | "...could not be found, or you do not have the necessary permissions" (must NOT appear for owned bill) | `unauthorizedError` |
| Bill not found | /bill could not be found/ | `billNotFoundError` |
| Bulk upload result | /bills? (created\|uploaded) successfully/ ; /tampered\|checksum\|invalid file\|failed to process/ ; INVALID_PAYER_TYPE and "The profile could not be found." must NOT appear | Upload tab |
| Product name | "Product name already exists" | Product form (manual CB-11) |
| Product VAT | "VAT must be a number between 0-100" | Product form (manual CB-12) |
| No expiry | /no expiry\|never expires/ | Confirmation summary |
| Arabic wording | Not captured | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Recalculate bill | `POST /bills/calculate` (full path `/api/v1/bills/calculate`) | Observed by `functional/BillItems.spec.ts:162,198`; payload may be encrypted (tests skip if non-JSON) |
| Open bill | `GET /bills/{id}` | Observed `BillItems.spec.ts:645`; must return mapped `billItems` (EMI-4991) |
| Save edit | `PUT /api/v1/bills/{id}` | Observed `DetailedBillEditing.spec.ts:217` (spec skips if not seen); 200 alone is not proof of save (DBE-06b) |
| Create / bulk | `POST /api/v1/bills`, `POST /api/v1/bills/bulk` | Swagger list `ServiceApis/EbillService.generated.spec.ts` (not observed from UI specs) |
| Items | `POST /api/v1/bill-items/bills/{billId}/bill-item`, `PUT .../bill-item/{billItemId}`, `GET /api/v1/bill-items/bills/{billId}` | Swagger list only |
| Lists / approvals | `GET /api/v1/bills/sent`, `/received`, `/count`, `/total`; `POST /api/v1/bills/{bill-id}/approve`, `/reject`; `DELETE /api/v1/bills/{bill-id}` | Swagger list only |
| Product search | Product service (not captured) | - |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| All locators unverified; screens not in testid handoff | `CreateBillPage.ts`/`BillItemsPage.ts`/`BillsListPage.ts` headers, `QA-DATA-TESTID-HANDOFF.md` section 5 |
| Two different tests are both labelled BI-26 (the EMI-4121 characterisation and the EMI-4991 GET /bills/{id} check) | `functional/BillItems.spec.ts:214,638` |
| EMI-4121 open: discount-before vs after-quantity unresolved | `Bill-Items.md` open question, `BillManagementHelper.ts:60-86` |
| Bulk-upload fixtures (`bulk-bills-*.xlsx`) are not committed; CB-14..CB-21 depend on local files | `functional/CreateBillFlow.spec.ts:170-248` |
| CB-14..CB-16 "valid/tampered" fixtures are maintained locally, CB-17, CB-10..CB-13, CB-20..CB-26 (filters, approve/reject, delete, audit) have no spec | `B2B-Transactions.md` section A vs `CreateBillFlow.spec.ts` |
| Test IDs CB-18..CB-21 in the spec (Excel edge cases) clash with CB-18..CB-21 in the manual doc (View Bills, filter, approve, edit) | `CreateBillFlow.spec.ts:209-247` vs `B2B-Transactions.md` section A |
| CB-06 spec clicks `addItemButton` twice without filling items | `CreateBillFlow.spec.ts:119-123` |
| CB-05 accepts either a required-field error or a "greater than 0" message | `CreateBillFlow.spec.ts:105-107` |
| Bill Report paging and expired-bill cases skip when UAT data is missing | `functional/BillsListPage.spec.ts:52-86` |
| DBE tests fill `descriptionInput` only; they do not change amounts or items | `functional/DetailedBillEditing.spec.ts:42-65` |
| `getVisibleBillRefs` returns whole row text, not just the ref | `BillsListPage.ts:73-81` |
| Docs elsewhere state detailed-bill wording differently (two variants of the last-item dialog text) | `Bill-Items.md` BI-13 vs `B2B-Transactions.md` CB-24 |

## Open questions

| Question | Why open |
|---|---|
| Create Bill URL and exact tab/field labels (EN/AR) | Locators are guesses |
| Do Single and Detailed entry share one form or separate routes? | Spec switches by tab click only |
| Is the bill summary a step or a modal? | `summarySection` is a loose selector |
| Exact set of bill statuses and who can Approve/Reject (Biller vs admin) | Manual CB-21 says "Reviewer" |
| Is the "Apply 15% VAT" checkbox on by default? | CB-01 says "VAT default checkbox state respected" |
| Where do Biller-side filters (reference, date range, status) live? | No locators |
| Is EMI-4121 resolved (discount on unit price or line total)? | Still To Do per docs |
