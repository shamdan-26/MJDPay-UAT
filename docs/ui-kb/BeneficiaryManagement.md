# BeneficiaryManagement - UI logic

Purpose: Business Portal screen where an admin adds, lists, filters, edits, deletes and approves/rejects **bill beneficiaries** (Alias + CRN, or phone / unified number) that are later picked when creating bills.
Route: `https://<host>/business/main/manage-beneficiary` (`BENEFICIARY_URL`, `BeneficiaryManagement/BeneficiaryManagementHelper.ts`). Reached from the homepage sidebar link "Manage Beneficiary" (`HomepageSidebarPage.manageBeneficiarySidebarLink`).
Who sees it: Business portal users. List needs the view privilege (EMI-5130); Approve/Reject need `BILLER_APPROVE_BENEFICIARIES` / `BILLER_REJECT_BENEFICIARIES` (EMI-4436). Exact view-privilege code is not named in the repo (see Open questions).
Locator catalog: [BeneficiaryManagement.generated.md](BeneficiaryManagement.generated.md). All locators are best-effort (no data-testids; module is in QA-DATA-TESTID-HANDOFF.md section 5 "not yet covered").
Important: automated coverage is mostly **mock-driven** (`page.route()`), so UI details below marked "mock/spec" are expected behaviour, not live-confirmed (`docs/manual-test-cases/ManageAccounts.md` lines 11-17).

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Beneficiaries list | `/business/main/manage-beneficiary` | Filters (Alias, CR, Status, Clear) | Above the list | Narrow the list (`aliasFilterInput`, `crnFilterInput`, `statusFilterDropdown`, `clearFilterButton`) - `BeneficiaryManagementPage.ts` |
| Beneficiaries list | same | Rows | Main body | One row per beneficiary: Alias, CRN, identifier, status, row actions (`beneficiaryRows`, `identifierCells`) |
| Beneficiaries list | same | "Add Beneficiary" entry | Page header (position not confirmed) | Opens add form (`addBeneficiaryButton`) |
| Add Beneficiary form | same (inline/modal not confirmed) | Alias + CRN + lookup | Form | Enter alias and CRN, look up brand name |
| Add Beneficiary form | same | "Add By" selector | Form | Switch Individual (phone) vs Company (Unified Number) - EMI-4432 (`addByDropdown`, `selectAddBy`) |
| OTP step | same | Six-box OTP + Verify + Resend | After submit, if OTP required | Confirm add (`otpInputs`, `otpSubmitButton`, `resendOtpButton`) |
| Delete confirm | same | Dialog "are you sure ... delete" | Overlay | Confirm delete (`deleteConfirmDialog`, `deleteConfirmButton`) |
| Beneficiary details | opened by clicking a row (URL not confirmed) | Details panel | Main body | Shows alias, brand name, identifier, status, contract link, Approve/Reject (`BeneficiaryDetailsPage.ts`) |

Sources: `pageElements/BeneficiaryManagement/*.ts` headers; `BeneficiaryManagementFlow.spec.ts`; `B2B-Transactions.md` section S (lines 522-545).

## Forms

### Add Beneficiary (Alias + CRN)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Alias | `aliasInput` | text | Yes | 3 to 15 chars, no special characters (EMI-185 AC, `B2B-Transactions.md` line 528; BM-02/03/04) | `aliasFieldError` matches /alias.*(3\|15\|characters\|invalid)/ - exact text not confirmed | Form open |
| CRN | `crnInput` | text | Yes | Must exist in the CRN registry; checked by lookup (BM-05) | `crnFieldError` matches /crn.*(not found\|invalid\|does not exist)/ - exact text not confirmed | Form open |
| Lookup | `lookupCrnButton` | button | - | Resolves CRN to brand name | see CRN error | Not confirmed |
| Resolved brand name | `crnBrandName` | read-only text | - | Shown after successful lookup, before save (BM-01) | - | After lookup |
| Save | `saveBeneficiaryButton` | button | - | Empty Alias/CRN must block save (BM-14, `assertRequiredFieldBlocksSubmit`) | `requiredFieldError` /is required\|field is required/ | Not confirmed (may be disabled or show error) |
| Duplicate | - | server check | - | Same CRN/alias already added is refused (BM-13, BMB-01) | `alreadyExistsError` "This beneficiary has already been added" (mock) | On submit |

### Add Beneficiary - "Add By" variants (EMI-4432, EMI-4431)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Add By | `addByDropdown` | select (`mat-select`) | Yes | Options Individual / Company (`selectAddBy('individual'\|'company')`) | - | Form open |
| Mobile number | `mobileNumberInput` | text | Yes for Individual | Phone number, e.g. `501350736` (BMB-02) | not confirmed | Add By = Individual |
| Unified number | `unifiedNumberInput` | text | Yes for Company | Company unified number | not confirmed | Add By = Company |
| Contract attachment | `contractUploadInput` | file input | **No** (optional, EMI-4431/4432) | Max 50 MB | `fileTooLargeError` "The uploaded file exceeds the maximum allowed size (50MB)." (mock 413) | Add By form |

Sources: `BeneficiaryManagementHelper.ts` (KNOWN_INDIVIDUAL_MOBILE, `mockContractUploadTooLarge`), `BeneficiaryManagementBugs.spec.ts` BMB-02/02b/07.

### OTP step

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| OTP digits | `otpInputs` | textbox "one time password" | Yes, when OTP required | Six-box pattern; OTP may be skipped if the backend does not require it (BM-06 checks visibility first) | not confirmed | After submit |
| Verify | `otpSubmitButton` | button /verify\|confirm/ | - | - | - | OTP entered |
| Resend OTP | `resendOtpButton` | button | - | Must return 200 (not 403/500) - BMB-03b | "You are not authorized to access this resource." was the pre-fix 403 text | After OTP issued |

## Tables and lists

| Aspect | Detail | Source |
|---|---|---|
| Columns | Alias (not brand name - EMI-5142), CRN, beneficiary identifier (must be non-empty - EMI-5376/5128/5652), status, row actions (status action button + delete icon, edit) | `BeneficiaryManagementBugs.spec.ts` BMB-05/06/10; `ManageAccounts.md` section C |
| Status values | `PENDING`, `APPROVED`, `REJECTED`; `beneficiaryStatus` is an object `{code, nameEn, nameAr}` (EMI-3736) | `BeneficiaryManagementHelper.ts` `beneficiaryStatus()` |
| Filters | Alias text, CR text, Status dropdown, Clear filter | `BeneficiaryManagementPage.ts` |
| Status filter | Sends `statusCode` query param; list must narrow to that status (EMI-4812, BMB-04) | `mockBeneficiaryList` |
| Clear filter | Must not resurface REJECTED rows into an approved-only Select Beneficiary context (EMI-4805, BA-08) | `BeneficiaryApproval.spec.ts` lines 169-190 |
| Paging | API takes `page` and `size`; response `{content, totalElements}`. UI paging control not in page object | helper `mockBeneficiaryList` |
| Sorting | Not confirmed | - |
| Empty state | Not confirmed for this screen | - |
| Row actions | Open details (click row), edit (`editBeneficiaryButton`), delete (`deleteBeneficiaryButton` then confirm), status action button | page object; BM-11/BM-12 |
| Layout rule | Status action button and delete icon must not overlap (EMI-4882, BMB-10) | `BeneficiaryManagementBugs.spec.ts` line 328 |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `addBeneficiaryButton` | List header | Opens add form | View/add privilege (not named) | Add form |
| `selectAddBy` / `addByDropdown` | Add form | Switches Individual vs Company fields | Always | Shows `mobileNumberInput` or `unifiedNumberInput` |
| `lookupCrnButton` | Add form | Resolves CRN to brand name | CRN entered | `crnBrandName` or `crnFieldError` |
| `saveBeneficiaryButton` | Add form | POSTs beneficiary, triggers OTP | Alias+CRN valid | OTP step (if required) then `successToast` |
| `resendOtpButton` | OTP step | POST `/beneficiary-otp/resend` | After OTP issued | New OTP |
| `otpSubmitButton` | OTP step | Verifies OTP | OTP entered | Beneficiary created, success toast |
| `editBeneficiaryButton` | Row | Edit alias (BM-12) | Row present | Updated alias in list |
| `deleteBeneficiaryButton` + `deleteConfirmButton` | Row / dialog | Deletes after confirm (BM-11) | Row present | Row removed + success toast |
| `clearFilterButton` | Filters | Clears filters | - | Full list |
| `approveButton` | Details | PUT `/beneficiary/approve`, optional confirm (`confirmActionButton`) | User has `BILLER_APPROVE_BENEFICIARIES` AND status not APPROVED | Status becomes APPROVED |
| `rejectButton` | Details | PUT `/beneficiary/reject`, optional confirm | User has `BILLER_REJECT_BENEFICIARIES` AND status not APPROVED | Status becomes REJECTED |
| `contractAttachmentLink` | Details | Opens stored contract (EMI-4791) | Contract exists | PDF opens (must not 404) |

Sources: `BeneficiaryDetailsPage.ts` (`approve()`, `reject()`), `BeneficiaryApproval.spec.ts`.

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Status = PENDING | Approve and Reject available to privileged user | BA-01/02 |
| Status = APPROVED | No Approve/Reject shown ("do not show actions if user is approved") | BA-04, EMI-4436 |
| User lacks approve/reject privilege | Buttons hidden on details; API still returns 403 `UNAUTHORIZED_EXCEPTION` | BA-03, BA-03b, EMI-4435 |
| User lacks view privilege / backend 403 | `unauthorizedMessage` "not authorized / check your permissions" | `mockBeneficiaryListForbidden`, EMI-5130 |
| Beneficiary not APPROVED when creating a bill | Bill POST rejected 400 `BENEFICIARY_NOT_APPROVED` | BA-05/06, EMI-4009/4905 |
| Add By = Individual / Company | Phone field vs Unified Number field | EMI-4432 |
| OTP required | OTP step appears after submit; otherwise skipped | BM-06 |
| Details payload missing identifier | Identifier blank (pre-fix defect) | BMB-05 |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Alias format | 3-15 chars, no special characters | EMI-185 AC via `B2B-Transactions.md` line 528 |
| Alias shown, not brand name | List and details show the user's alias | EMI-5142, BMB-06/11 |
| Identifier always rendered | `beneficiaryIdentifier` returned and displayed | EMI-5376, EMI-5128, EMI-5652 |
| Duplicate refused | Same CRN already added returns 400 `BENEFICIARY_ALREADY_EXISTS`; new CRN must not be told it exists | EMI-3686, EMI-4414 |
| Contract optional | Contract attachment not required for unified-number add; limit 50 MB | EMI-4431/4432, EMI-5153 |
| Approval gated by privilege | API enforces privilege, not only hidden button | EMI-4435 |
| Only APPROVED beneficiaries usable for bills | PENDING/REJECTED blocked server-side; approved-only query never returns others | EMI-4009, EMI-4805, EMI-4905 |
| Approved cannot be un-approved | Data caveat for tests | `ManageAccounts.md` line 14 |
| Admin-side bill beneficiary is a separate system from the customer-app beneficiary types | | `EMI-Business-Rules-part1-core-modules.md` line 108 |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Add success | "Beneficiary added/updated/deleted successfully" (regex in `successToast`); AR not known | Toast |
| Duplicate | "This beneficiary has already been added" (mock) | Toast / `alreadyExistsError` |
| Oversize contract | "The uploaded file exceeds the maximum allowed size (50MB)." (mock) - never "Something Went Wrong!" | `fileTooLargeError` |
| 403 | "You are not authorized to access this resource." (`UNAUTHORIZED_EXCEPTION`) | `unauthorizedMessage` |
| Bill with unapproved beneficiary | "Beneficiary is not approved" (`BENEFICIARY_NOT_APPROVED`) | Bill creation |
| Required field | /is required\|field is required/ | `requiredFieldError` |
| Generic processing message | Must not show on successful add (BMB-12b) | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Load/filter list | `GET /api/v1/beneficiary?page&size&statusCode` | Confirmed (EMI-5652 curl, EMI-3736) |
| Add beneficiary | `POST /api/v1/beneficiary` | Path inferred from mocks; 500 pre-fix (EMI-5317/5448/6040) |
| Issue OTP | `POST /api/v1/beneficiary-otp` | Confirmed (EMI-5864) |
| Resend OTP | `POST /api/v1/beneficiary-otp/resend` | Confirmed (EMI-5769) |
| Approve | `PUT /api/v1/beneficiary/approve` body `{beneficiaryId}` | Confirmed; `BILLER_APPROVE_BENEFICIARIES` |
| Reject | `PUT /api/v1/beneficiary/reject` | Confirmed; `BILLER_REJECT_BENEFICIARIES` |
| Contract download | `**/api/v1/**contract**` | Pattern only; real path not confirmed |
| Privilege load | `**/api/v1/**privilege**` | Mocked pattern only |
| Create bill gate | `POST /api/v1/bills` | `beneficiaryStatusCode` in body (mock) |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Specs are mock-based; real DOM/labels unverified | `ManageAccounts.md` line 15; page object header |
| BM-01, BM-06, BM-09, BM-13 skip without `BENEFICIARY_KNOWN_CRN` | `BeneficiaryManagementFlow.spec.ts` lines 44, 57, 131, 177 |
| BMB-10 skipped if row action controls not found | `BeneficiaryManagementBugs.spec.ts` line 344 |
| Fixed defects kept as regression guards: EMI-3686, 4414, 4791, 4812, 5130, 5142, 5153, 5376, 5692, 5769, 5800, 5864, 6040 | `BeneficiaryManagementBugs.spec.ts` |
| Not automated: EMI-5118 (OTP email), EMI-5317 (customer app), EMI-3624/3625/3664 (Select Beneficiary popup in Create Bill), EMI-5107 (iOS Arabic) | `ManageAccounts.md` lines 78-83 |

## Open questions

| Question | Note |
|---|---|
| Exact view-privilege code for the list | Only approve/reject codes are named |
| Is details a separate route or a panel? | `BeneficiaryDetailsPage.open()` clicks a row and waits for `detailsPanel` |
| Exact validation texts (EN/AR) for alias/CRN | Locators use regex only |
| Is add form inline or modal; button label for Save | Regex `save\|add\|submit` |
| Empty-state text, paging control, sorting | Not in repo |
| When is OTP required vs skipped | BM-06 handles both |
