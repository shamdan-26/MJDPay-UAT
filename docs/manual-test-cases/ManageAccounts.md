# Manual Test Cases — Manage Accounts (Manage Beneficiary + Manage Users)

Context: the Business Portal's **Manage Accounts** sidebar section holds two sub-modules —
**Manage Beneficiary** (add/approve/list the parties a merchant or biller can bill) and
**Manage Users** (staff users, plus the Access & Permissions groups and roles that gate what
those staff users can do). This document is the Jira → test-ID traceability map for both.

Every case below is automated in the repo; the automation ID column is the exact `test()` title
prefix used in the spec files, so `npx playwright test --grep "MUB-03"` runs a single case.

Priority key: **P1** = blocks the release / core happy path, **P2** = important secondary
behavior, **P3** = edge case / polish.

> **Data caveat.** The whole Manage Accounts area mutates records that cannot be reverted from
> the Business Portal — a created staff user burns a National ID and a mobile number, an approved
> beneficiary cannot be un-approved. The automated suites are therefore **mock-driven**
> (`page.route()`), following the same decision already made for Sub-Wallets and Payment Links.
> The endpoints listed under "Confirmed endpoints" below are the ones lifted verbatim from ticket
> curl blocks and AC tables; the rest are inferred and must be reconciled on the first live run.

## Confirmed endpoints

| Endpoint | Source ticket |
|---|---|
| `GET /api/v1/beneficiary?page&size&statusCode` | EMI-5652 curl, EMI-3736 |
| `PUT /api/v1/beneficiary/approve` — `BILLER_APPROVE_BENEFICIARIES` | EMI-4436 AC table |
| `PUT /api/v1/beneficiary/reject` — `BILLER_REJECT_BENEFICIARIES` | EMI-4436 AC table |
| `POST /api/v1/beneficiary-otp` | EMI-5864 curl |
| `POST /api/v1/beneficiary-otp/resend` | EMI-5769 curl |
| `DELETE /emi-profile/api/v1/groups/{id}/unassign-users` | EMI-5234 curl |

Everything under `/api/v1/users`, `/api/v1/groups`, `/api/v1/roles` is **inferred** — no Manage
Users ticket attached a curl repro.

---

## A. Manage Beneficiary — core flow (pre-existing)

Covered by `BusinessTestCases/BeneficiaryManagement/functional/BeneficiaryManagementFlow.spec.ts`
(IDs `BM-01`..`BM-14`, mapped to `B2B-Transactions.md` section S). Not re-listed here.

## B. Manage Beneficiary — approval workflow

Spec: `BeneficiaryManagement/functional/BeneficiaryApproval.spec.ts`

| ID | Jira | Title | Expected Result | Priority |
|---|---|---|---|---|
| BA-01 | EMI-4435, EMI-4436 | Privileged staff approves a pending beneficiary | `PUT /beneficiary/approve` → 200, status becomes `APPROVED` | P1 |
| BA-02 | EMI-4435, EMI-4436 | Privileged staff rejects a pending beneficiary | `PUT /beneficiary/reject` → 200, status becomes `REJECTED` | P1 |
| BA-03 | EMI-4435 | Unprivileged staff is refused by the API, not only by a hidden button | Both endpoints → 403 `UNAUTHORIZED_EXCEPTION` | P1 |
| BA-03b | EMI-4436 | Details screen hides Approve/Reject without the privilege | Neither action rendered | P2 |
| BA-04 | EMI-4436 | Actions disappear once the beneficiary is approved | "do not show actions if user is approved" | P2 |
| BA-05 | EMI-4009 | Bill creation with an APPROVED beneficiary succeeds | 200 | P1 |
| BA-06 | EMI-4009, EMI-4905 | Bill creation with PENDING or REJECTED is rejected | 400 `BENEFICIARY_NOT_APPROVED` | P1 |
| BA-07 | EMI-4805, EMI-4905 | An APPROVED-only query never returns PENDING/REJECTED | Every row `APPROVED` | P1 |
| BA-08 | EMI-4805 | Clearing the filter does not silently resurface REJECTED rows as selectable | Rejected rows stay visibly flagged; the selection gate is BA-06 | P2 |

## C. Manage Beneficiary — bug regressions

Spec: `BeneficiaryManagement/functional/BeneficiaryManagementBugs.spec.ts`

| ID | Jira | Title | Expected Result | Priority |
|---|---|---|---|---|
| BMB-01 | EMI-3686 | Duplicate CRN shows "already added", not a success message | 400 `BENEFICIARY_ALREADY_EXISTS` | P1 |
| BMB-01b | EMI-4414 | A genuinely new beneficiary is not wrongly told it exists | 200, no "already exists" text | P1 |
| BMB-02 | EMI-4741, EMI-5448 | Add an individual by phone number | 200 | P1 |
| BMB-02b | EMI-4431, EMI-4432 | Contract attachment is optional on add-by-unified-number | 200 with `contract: null` | P2 |
| BMB-03 | EMI-5864 | Submitting the form triggers `POST /beneficiary-otp` | 200, OTP issued | P1 |
| BMB-03b | EMI-5692, EMI-5769, EMI-5800 | Resend OTP works | 200 — not 500, not 403 | P1 |
| BMB-04 | EMI-4812 | Status filter reaches the API and narrows the list | `statusCode` sent; rows match | P1 |
| BMB-05 | EMI-5652, EMI-5376, EMI-5128 | Every row carries a non-empty beneficiary identifier | `beneficiaryIdentifier` present | P1 |
| BMB-06 | EMI-5142 | The list shows the alias, not the company/brand name | Alias rendered | P2 |
| BMB-07 | EMI-5153, EMI-5073 | 413 on contract upload surfaces the real size limit | "exceeds the maximum allowed size (50MB)", never "Something Went Wrong!" | P2 |
| BMB-08 | EMI-4791 | Stored contract attachment is retrievable | 200 `application/pdf` | P2 |
| BMB-09 | EMI-5130 | A maker holding the view privilege sees admin beneficiaries | 200 with rows, not 403 | P1 |
| BMB-10 | EMI-4882 | Status action button and delete icon do not overlap | Bounding boxes disjoint | P3 |
| BMB-11 | EMI-5376, EMI-5142 | Details screen shows both identifier and alias | Both populated | P2 |

**Not automated (out of scope for the web suite):** EMI-5118 (OTP *email* delivery to the biller
mailbox — needs the IMAP fixture pointed at a biller inbox, not the shared test mailbox),
EMI-5317 (customer-app `/customer/beneficiary/local-bank`, not the Business Portal), EMI-3624 /
EMI-3625 / EMI-3664 (Select Beneficiary popup inside the Create Bill flow — belongs in
`BillManagement/`, not here), EMI-5107 (iOS Arabic rendering).

## D. Manage Users — core flow

Spec: `UserManagement/functional/ManageUsers.spec.ts`

| ID | Jira | Title | Expected Result | Priority |
|---|---|---|---|---|
| MU-01 | EMI-4742 | List renders Full Name, User Group, Mobile Number, Status | All four columns populated | P1 |
| MU-02 | — | Empty state instead of a broken table | Empty-state message, no error toast | P2 |
| MU-03 | EMI-4847 | Create form asks for National ID / Iqama, no first/last name | Name fields absent | P1 |
| MU-04 | EMI-4742 | Valid details create the user and it appears in the list | New row visible with all fields | P1 |
| MU-05 | — | Empty form is blocked with a required-field message | Submit disabled or field error | P2 |
| MU-06 | EMI-4847 | Nafath screen opens once the record is created | Nafath step visible | P1 |
| MU-07 | EMI-4844, EMI-4812 | Status filter works for each of the five live statuses | Rows match the selected status | P1 |
| MU-08 | — | Editing a user updates their group | Success message | P1 |
| MU-09 | EMI-4844 | Deactivating an active user | Status → `DEACTIVATED` | P1 |
| MU-10 | EMI-4844 | Reactivating a deactivated user | Status → `ACTIVE` | P1 |

User lifecycle per EMI-4844: `PENDING_VERIFICATION` → `UNDER_REVIEW` → `ACTIVE` → `DEACTIVATED`,
plus `REJECTED` and `DELETED`.

## E. Manage Users — bug regressions

Spec: `UserManagement/functional/UserManagementBugs.spec.ts`

| ID | Jira | Title | Expected Result | Priority |
|---|---|---|---|---|
| MUB-01 | EMI-4742 | New user appears in the list with all four columns filled | No blank row | P1 |
| MUB-02 | EMI-5000 | Full Name never renders "Undefined Undefined" | Real name shown | P1 |
| MUB-03 | EMI-4812, EMI-4683 | Status filter sends `statusCode` and narrows the list | Param sent; one matching row | P1 |
| MUB-04 | EMI-5285 | Manage Users list endpoint returns 200 | Table renders, no error | P1 |
| MUB-05 | EMI-5815 | Create-user endpoint returns 200 | User created | P1 |
| MUB-06 | EMI-5816 | Changing a user group returns 200 | Group updated | P1 |
| MUB-07 | EMI-5583, EMI-5584 | Groups render on the edit screen, without an empty flash | Options present; no stuck spinner | P2 |
| MUB-08 | EMI-4997 | A new user gets only explicitly assigned privileges | No `SUPER_ADMIN` inheritance | P1 |
| MUB-09 | EMI-5085, EMI-5078 | Activate/deactivate works when the privilege is granted | 200, no 403/405 | P1 |
| MUB-10 | EMI-5817 | Password reset completes without a Forbidden redirect | 200, no Forbidden page | P1 |
| MUB-11 | EMI-5092, EMI-5112 | Add User settles — never an endless spinner or bare "Something went wrong" | Success or a specific validation message | P2 |

**Not automated:** EMI-4907 (new users cannot log in — the ticket has no steps, actual, or
expected recorded; needs triage before a test can be written), EMI-5113 (iOS keyboard layout),
EMI-5155 / EMI-5179 (invalid unified number — that is Wallet Configuration → Merchant tab, a
different module).

## F. Access & Permissions — groups and roles

Spec: `UserManagement/functional/GroupsRolesPermissions.spec.ts`

| ID | Jira | Title | Expected Result | Priority |
|---|---|---|---|---|
| GR-01 | EMI-5583 | Groups tab lists name, description, assigned-user count | All groups rendered | P1 |
| GR-02 | — | Roles tab lists roles without a stuck loading state | Roles rendered | P1 |
| GR-03 | EMI-5210, EMI-5613 | Editing a role name and description saves | 200, success message (not 400, not 403) | P1 |
| GR-04 | EMI-5240 | An authorised admin deletes a non-system group | 200, no Forbidden | P1 |
| GR-05 | EMI-5897 | A group flagged `isSystem` offers no Edit/Delete | Actions absent | P2 |
| GR-06 | EMI-5234, EMI-5899 | Assigning an already-assigned user is rejected | 400 `USER_ALREADY_ASSIGNED` | P2 |
| GR-07 | EMI-5234 | Unassigning a user who is not in the group is rejected | 400 `USER_NOT_ASSIGNED` | P2 |
| GR-08 | SAL-4799 | The role's user count matches the users actually assigned | Count matches | P3 |

## G. Manage Users — UI presence

Spec: `UserManagement/ui/ManageUsersPage.spec.ts` — `MUU-01`..`MUU-05`. Element/text presence
only (table, Add New User button, the four column headers, the Status and Clear Filter controls,
the National ID / Mobile / Group inputs, Save and Cancel), per the repo's `functional/` vs `ui/`
split.

---

## Admin Portal cases — deliberately excluded

Several tickets in this area are **Admin Portal**, not the Business Portal this repo drives:
EMI-4683, EMI-4742, EMI-4997, EMI-5078, EMI-5285, EMI-5583, EMI-5584, EMI-5816, EMI-5817, plus
the whole SAL RBAC set (SAL-4761..SAL-4776, SAL-4789, SAL-4790, SAL-4799). Where the same API
also backs the Business Portal's Manage Users screen, the case is automated here against that
screen and the ticket is cited; where the behaviour is Admin-Portal-only, it is listed above under
"not automated" and stays a manual case pending Admin Portal tooling access — the same rationale
already used by `Reconciliation/` and `TransactionOperations/`.
