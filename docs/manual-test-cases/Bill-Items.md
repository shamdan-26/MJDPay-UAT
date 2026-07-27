# Manual Test Cases — Detailed Bill Line Items

Context: a **Detailed Bill** is a bill whose amount is derived from one or more **line items** rather than typed directly. Each item has a name, quantity, unit price, an optional item-level discount (Fixed / Percentage / No Discount) and an optional VAT. Items can be typed manually or pulled in from a saved **product**. Creating a detailed bill is a multi-step wizard — **Bill Info → Add Items → Item Info (review) → Confirm** — and every item change fires a `POST /bills/calculate` call that recomputes the bill summary (discount, VAT, commission, grand total). Items can also be added, edited and deleted while **editing an existing bill**.

This file was built from the bill-item ticket history in Jira (project **EMI**, `digitalcash.atlassian.net`). It covers **web only** — the equivalent iOS and Android item tickets (EMI-4249, EMI-4250, EMI-3244/3245, EMI-1684/1685/1687/1688, EMI-3536/3537, EMI-3581, EMI-3584, EMI-4345, EMI-5037, …) are out of scope for this Playwright suite.

Priority key: **P1** = blocks the release / core happy path, **P2** = important secondary behavior, **P3** = edge case / polish.

Automation: `BusinessTestCases/BillManagement/functional/BillItems.spec.ts` (BI-01..BI-20) and `BusinessTestCases/BillManagement/ui/BillItems.spec.ts` (BI-U01..BI-U04), driven by `pageElements/BillManagement/BillItemsPage.ts`.

> **Locator caveat** — these screens are not in `QA-DATA-TESTID-HANDOFF.md` §4, so every locator in `BillItemsPage.ts` is a best-effort guess derived from the ticket wording, the same caveat that already applies to `CreateBillPage.ts` and `BillsListPage.ts`. Reconcile against the live DOM (or request `data-testid`s from FE) before using these for CI gating.

> **Open question — EMI-4121 (still `To Do`)** — the product currently applies an item discount to the **unit price** before multiplying by quantity: `total = (unitPrice − discount) × quantity`. EMI-4121 asks whether the KSA market instead expects the discount applied *after* the line total. BI-03 and BI-11 encode the current behaviour via `expectedItemTotal()` in `BillManagementHelper.ts`; if that inquiry resolves the other way, that one function plus these two cases are the only things that need updating.

---

## A. "A Detailed Bill Must Have Items"

| ID | Title | Steps | Expected Result | Priority | Ticket |
|---|---|---|---|---|---|
| BI-01 | Cannot create a detailed bill with zero items | Create Detailed Bill → add 2 items → delete both → Submit | Submit is blocked with a validation error, e.g. "At least one item is required to create a detailed bill." No bill is created | P1 | EMI-4069 |
| BI-02 | Cannot save an edited detailed bill with zero items | Bills → open an existing detailed bill → Edit → delete all items → Submit | Same validation error; the bill is not saved item-less | P1 | EMI-4179 |

---

## B. Item Calculation

| ID | Title | Steps | Expected Result | Priority | Ticket |
|---|---|---|---|---|---|
| BI-03 | Fixed item discount uses the unit-price formula | Add item: quantity `5`, unit price `10`, discount type Fixed, discount `10` | Item total is **0** — `(10 − 10) × 5`. (The bug showed `40`) | P1 | EMI-4123 |
| BI-04 | `/bills/calculate` returns a real net for FIXED items | Add item: quantity `2`, unit price `100`, Fixed discount `20`; inspect the `POST /bills/calculate` response | Every item with `discountTypeCode = FIXED` and a non-zero discount returns `netAmountAfterDiscount > 0` (here 160), never `0` | P1 | EMI-5030 |
| BI-05 | Editing an item does not 500 the calculate API | Add an item, then edit its discount | No `POST /bills/calculate` call returns a 5xx; the summary recalculates | P1 | EMI-4071 |
| BI-06 | More than two items all count toward the total | Add 3 items each unit price `10`, quantity `5`; go to Item Info | Grand total is **150** — the sum of all three items, not a subset | P1 | EMI-2952 |

---

## C. Discount Behaviour

| ID | Title | Steps | Expected Result | Priority | Ticket |
|---|---|---|---|---|---|
| BI-07 | Editing an item discount refreshes the total immediately | Add item (qty 2 × 100) → Item Info → note total → Back → edit the item's discount to Fixed 10 → Item Info | Total bill amount updates immediately. (The bug required navigating back and forward again) | P1 | EMI-3965 |
| BI-08 | Fixed discount larger than the item amount is flagged inline | Add item form: quantity `1`, unit price `100`, Fixed discount `150`, then blur the field | Validation message appears immediately under the item amount, before saving the item — matching single-bill behaviour. (The bug only surfaced it after moving forward to create the bill) | P2 | EMI-3961 |
| BI-09 | Bill-level Fixed discount cannot exceed the bill total | Add one item worth `50`; set the bill-level discount to Fixed `500`; Submit | Submit is rejected with a validation message; no confirmation summary appears | P2 | EMI-3323 |
| BI-10 | "No Discount" persists when reopening an item | Add an item with discount type "No Discount"; reopen it via the edit icon | Discount Type shows **"No Discount"**, not an empty field | P2 | EMI-3383 |
| BI-11 | Item-level and bill-level discount types can differ | Add an item (qty 2 × 100) with a **Percentage** 10% item discount; set a **Fixed** 20 bill-level discount; go to Item Info | Item total is 180; grand total is 160. No conflict, no incorrect or inconsistent calculation | P1 | EMI-5319 |

---

## D. VAT on Items

| ID | Title | Steps | Expected Result | Priority | Ticket |
|---|---|---|---|---|---|
| BI-12 | VAT is optional in the edit-item form | Add an item with VAT `15`; reopen it for edit; clear the VAT field and blur | No "VAT is required" message; the item can still be saved — VAT is optional on edit exactly as it is on add | P2 | EMI-3957 |

---

## E. Deleting Items

| ID | Title | Steps | Expected Result | Priority | Ticket |
|---|---|---|---|---|---|
| BI-13 | Deleting the last item asks for confirmation, then deletes | Add exactly one item; click its delete icon; confirm | Confirmation dialog appears ("This is the last item in the bill. Deleting it will also delete the bill. Do you want to proceed?"); confirming removes the item | P1 | EMI-1988, EMI-2590 |
| BI-14 | Cancelling the last-item dialog keeps the item | As BI-13 but cancel the dialog | No action is taken; the item remains in the bill | P2 | EMI-1988 |
| BI-15 | "Delete All" genuinely empties the list | Add 3 items; click "Delete All"; confirm if prompted | All rows disappear and the empty state shows. (The bug showed a success message while the rows stayed on screen) | P1 | EMI-2100 |
| BI-16 | Deleting an item updates the bill amount | Add items worth `100` and `60`; note the total; delete the `60` item | The delete succeeds without error and the total drops to **100** | P1 | EMI-3282 |
| BI-17 | Removing an item recalculates VAT and commission | Add two items with VAT; note VAT + commission on Item Info; go Back, remove one item, return | VAT and commission both decrease — they no longer include the removed item | P1 | EMI-2298 |

---

## F. Editing an Existing Bill's Items

| ID | Title | Steps | Expected Result | Priority | Ticket |
|---|---|---|---|---|---|
| BI-18 | New item added during edit calculates and preserves siblings | Bills → open a detailed bill → Edit → Add Item (qty 2 × 35) → Save | The new item's total shows **70** (not 0); all pre-existing items remain listed and the payment summary reflects the complete bill, not just the new item | P1 | EMI-3305 |
| BI-19 | Create a detailed bill mixing a product and a manual item | Create Detailed Bill → add a saved product as an item → add a manual item → Submit | The bill is created successfully with both entries | P1 | EMI-3118 |
| BI-20 | Update a detailed bill mixing a product and a manual item | Open an existing detailed bill → Edit → add a saved product and a manual item → Submit | The bill updates successfully with no error | P1 | EMI-3119, EMI-1679 |

---

## G. UI Presence Checks

| ID | Title | Steps | Expected Result | Priority | Ticket |
|---|---|---|---|---|---|
| BI-U01 | Item rows expose edit and delete icons | Add 2 items; advance to Step 3 "Item Info" | Every item row has both a delete and an edit icon, per Figma | P2 | EMI-3631 |
| BI-U02 | Item Info step has a Back button | Advance to Step 3 "Item Info" | A Back button is visible and returns to the "Add Items" step | P2 | EMI-3631 |
| BI-U03 | Item tables scroll vertically | Add 8 items; inspect the table in Step 2 "Add Items" and Step 3 "Item Info" | Both tables scroll vertically instead of overflowing the page, per Figma | P3 | EMI-3630 |
| BI-U04 | Discount Amount is displayed in summary and item details | Bills → "View More" on a detailed bill → check the overall summary → open an item's "View More" | Discount Amount is shown in **both** the overall bill summary and the individual bill item details | P2 | EMI-3270 |

---

## Not automated / out of scope

| Ticket | Why not automated here |
|---|---|
| EMI-4121 | Open **Inquiry**, not a defect — asks whether KSA applies item discount before or after the line total. Documented as a note above; blocks nothing today |
| EMI-4991 | Backend subtask ("Get Bill by ID must map bill items correctly"). Exercised indirectly by BI-18 / BI-02 (reopening a bill shows its items); a dedicated API assertion needs a bill-service token this suite does not yet hold |
| EMI-3060 | "Add item from a created product" is already covered by **CB-09** in `CreateBillFlow.spec.ts` |
| EMI-5809, EMI-5812, EMI-5863 | Already covered by **DBE-01, DBE-03, DBE-04** in `DetailedBillEditing.spec.ts` |
| iOS / Android item tickets | Different platform — no Playwright web equivalent |
