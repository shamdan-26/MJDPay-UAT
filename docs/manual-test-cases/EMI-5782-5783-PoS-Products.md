# Manual Test Cases — PoS Products (iOS)

Source tickets: [EMI-5783](https://digitalcash.atlassian.net/browse/EMI-5783) (Onboarding PoS Request Flow) and [EMI-5782](https://digitalcash.atlassian.net/browse/EMI-5782) (Products Navigation & In-App PoS Request Flow).

Both tickets are tagged **FE - iOS** (native Business app). There is no automation harness for the iOS app in this repository, so these are manual/exploratory test cases for QA execution on device/simulator. Where a piece of the flow is also reachable on the web portal (the registration Products step), it has been automated separately in [`RegistrationProductsFunctionality.spec.ts`](../../BusinessTestCases/Registration/functional/RegistrationProductsFunctionality.spec.ts).

Priority key: **P1** = blocks the release / core happy path, **P2** = important secondary behavior, **P3** = edge case / polish.

---

## EMI-5783 — Onboarding PoS Request Flow

Context: during registration, on the Products step, selecting the PoS Terminals card expands inline and offers "Request devices now" or "Skip - set up later".

### A. Products step — PoS card

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PS-01 | Wallet shown as required | Reach the onboarding Products step | Wallet is shown and cannot be deselected (required product) | P1 |
| PS-02 | PoS Terminals shown as optional | Reach the Products step | PoS Terminals, Bill Payment, Payouts are shown as optional, deselectable | P2 |
| PS-03 | Selecting PoS Terminals expands inline | Tap the PoS Terminals card | The card expands in place; the user is **not** navigated to a new screen | P1 |
| PS-04 | Expanded card shows both choices | Expand the PoS Terminals card | "Request devices now" and "Skip - set up later" are both visible | P1 |
| PS-05 | Collapsing without choosing | Expand the card, then tap it again without picking an option | Card collapses; selection state (Wallet/PoS enabled) is unaffected — confirm actual behavior matches design intent | P3 |

### B. Skip path

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PS-06 | Skip keeps PoS enabled | Expand PoS card → tap "Skip - set up later" | PoS remains selected/enabled on the Products step | P1 |
| PS-07 | Skip shows setup-later message | Same as PS-06 | An inline message communicates setup was skipped and can be done later | P2 |
| PS-08 | "Actually, request now" reopens flow | After skipping, tap "Actually, request now" | The Devices & Delivery sub-flow opens from the expanded card | P1 |

### C. Request-now path — Devices & Delivery

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PS-09 | Devices & Delivery fields present | Tap "Request devices now" | Number-of-devices input, delivery-mode toggle, and address selection are all visible | P1 |
| PS-10 | Delivery mode toggle switches views | Toggle delivery mode | UI updates accordingly (e.g. single address vs. split delivery groups) | P1 |
| PS-11 | Select National Wathiq address | Choose the National Wathiq address option | Address is populated/selected from Wathiq data | P1 |
| PS-12 | Select Custom Pin address | Choose Custom Pin, drop a pin on the map | Custom coordinates are captured and reflected in the form | P1 |
| PS-13 | Add a delivery/location group | With split delivery enabled, add a location group | A new group row appears, independently configurable | P2 |
| PS-14 | Remove a delivery/location group | Remove a previously added group | Group is removed; remaining groups/totals adjust correctly | P2 |
| PS-15 | Cannot proceed with missing required fields | Leave device count or address empty, try to continue | Continue/Next is disabled or a validation error is shown | P1 |
| PS-16 | No wallet picker shown | Walk through the entire Devices & Delivery step | No wallet-selection UI appears anywhere in this sub-flow | P2 |
| PS-17 | Zero devices blocked | Enter 0 for device count | Validation blocks proceeding | P2 |
| PS-18 | Very large device count | Enter an unrealistically large device count (e.g. 99999) | Either a sane max is enforced with a clear message, or the value is otherwise handled without crashing | P3 |
| PS-19 | Split quantities reconcile with total | With multiple delivery groups, assign per-group device counts | Sum of per-group quantities matches (or is validated against) the total device count | P2 |

### D. Review step

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PS-20 | Review shows total device count | Complete Devices & Delivery, proceed to Review | Total device count matches what was entered | P1 |
| PS-21 | Review shows delivery breakdown | Same as PS-20, with multiple groups | Each group's device count and address/location are listed | P1 |
| PS-22 | Address type correctly labeled | Review with a Wathiq group and a Custom Pin group | Each group is labeled with its correct address source | P2 |
| PS-23 | Order-creation note shown | Reach Review | Text confirms the order will be created once onboarding is completed (not immediately) | P2 |
| PS-24 | Back from Review edits prior step | Tap Back from Review | Returns to Devices & Delivery with previously entered values intact | P1 |
| PS-25 | Confirming returns to Products step | Confirm on Review | User lands back on the onboarding Products step | P1 |

### E. Post-confirmation Products step state

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PS-26 | Inline order-ready state | Confirm a device order | Products step shows device count, delivery summary, Edit, and Remove inline on the PoS card | P1 |
| PS-27 | Edit reopens with prior values | Tap Edit on the order-ready state | Devices & Delivery / Review reopen pre-filled with the previous selections | P1 |
| PS-28 | Remove clears the order | Tap Remove on the order-ready state | Order state clears; card reverts to pre-order (or skipped) state | P1 |
| PS-29 | Continue after confirming | Confirm a device order, then continue onboarding | Onboarding proceeds normally to the next step | P1 |
| PS-30 | Continue after skipping | Skip PoS setup, then continue onboarding | Onboarding proceeds normally without a device order | P1 |

### F. Registration completion

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PS-31 | Order created on completion (confirmed path) | Confirm a device order, finish registration | Order appears under My Products > PoS > Orders after registration completes | P1 |
| PS-32 | No order created (skipped path) | Skip PoS setup, finish registration | No order is created; a "request later" message/entry point is shown | P1 |
| PS-33 | Double-submit prevention | Rapidly double-tap the Review confirm button | Only one order is created; second tap is a no-op or disabled | P1 |
| PS-34 | Backend validation error surfaced | Force a validation error at confirm (e.g. invalid address payload) | Clear error message shown; user is not silently stuck or logged out | P2 |
| PS-35 | Network loss mid-flow | Disable network mid Devices & Delivery, attempt to proceed | Clear error/retry state; previously entered data is not lost | P2 |
| PS-36 | App backgrounded mid-flow | Background the app mid Devices & Delivery, then resume | State is preserved (or the flow restarts cleanly per design — confirm intended behavior) | P3 |

---

## EMI-5782 — Products Navigation & In-App PoS Request Flow

Context: post-registration "More" menu restructuring — renames the old bill-related Products entry, adds a new Products section scoped to the user's assigned products, with PoS management (Dashboard/Orders/Devices) and an Add Products flow.

### A. Navigation rename

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PN-01 | Old Products entry renamed | Open the More menu | The former "Products" (bill-related) entry now reads "Bill Items" | P1 |
| PN-02 | Bill Items still works | Tap "Bill Items" | Opens the same bill-related content as before the rename (regression check) | P1 |
| PN-03 | New Products entry exists | Open the More menu | A separate, new "Products" entry is present | P1 |

### B. Products list

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PN-04 | Only assigned products shown | Open Products | List shows only products currently assigned to the user's profile, no My Products/All Products tabs | P1 |
| PN-05 | Non-PoS products have no Manage action | View a non-PoS product in the list | No "Manage" action is shown | P2 |
| PN-06 | PoS product shows Manage | View a product with type code POS | "Manage" action is visible | P1 |
| PN-07 | Empty state | View Products with a profile that has no assigned products | A clear empty state is shown | P2 |
| PN-08 | Loading state | Open Products with a throttled/slow connection | A loading indicator is shown while the list fetches | P3 |

### C. Manage → PoS management

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PN-09 | Manage opens PoS management | Tap Manage on a PoS product | Opens PoS management scoped to that product | P1 |
| PN-10 | Dashboard/Orders/Devices tabs visible | Inside PoS management | Dashboard, Orders, and Devices tabs are all present | P1 |
| PN-11 | Transactions hidden this sprint | Inside PoS management | No Transactions tab is visible or reachable | P1 |
| PN-12 | Dashboard loads | Open the Dashboard tab | Loads without error | P3 |

### D. Orders tab

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PN-13 | Orders list populates | Open Orders tab | Orders load from `GET /api/v1/pos/orders/my-order` and display | P1 |
| PN-14 | Order status shown | View an order | Status is visible | P1 |
| PN-15 | Order timeline shown | Open an order's detail | Timeline/progress detail is visible | P2 |
| PN-16 | Audit trail shown where available | Open an order's detail | Audit trail is visible when the backend provides it | P2 |
| PN-17 | Empty orders state | View Orders with zero PoS orders | Clear empty state shown | P2 |
| PN-18 | Orders fetch error + retry | Simulate an API failure on `my-order` | Error state shown with a retry affordance | P2 |

### E. Devices tab

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PN-19 | Devices list populates | Open Devices tab | Devices load from `GET /api/v1/pos/devices/my` and display | P1 |
| PN-20 | Device fields complete | View a device row | TID, source order, location, Main Wallet, activation date, and status are all shown | P1 |
| PN-21 | Empty devices state | View Devices with zero mapped terminals | Clear empty state shown | P2 |

### F. Request additional devices (from Orders)

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PN-22 | Request-devices action present | Open Orders tab | An action to create a new PoS order is available | P1 |
| PN-23 | Reuses onboarding device flow | Trigger request-devices | Opens the same device count/delivery/review flow used in EMI-5783 | P1 |
| PN-24 | Wathiq address fetched first | Trigger request-devices | User's Wathiq national address is retrieved before the flow opens | P2 |
| PN-25 | No wallet picker | Walk the flow | No wallet-selection UI; a read-only note states devices activate on Main Wallet | P2 |
| PN-26 | Submit payload shape | Complete and submit a request | `POST /emi-profile/api/v1/products/orders/pos` is called with product code, delivery groups, group quantities, address source, coordinates | P1 |
| PN-27 | NATIONAL_ADDRESS_WATHIQ path | Submit using the Wathiq address | Address source enum is `NATIONAL_ADDRESS_WATHIQ`; order succeeds | P1 |
| PN-28 | CUSTOM_MAP_PIN path | Submit using a custom pinned address | Address source enum is `CUSTOM_MAP_PIN`; order succeeds | P1 |
| PN-29 | Returns to Orders after submit | Submit a request | User lands back on PoS Orders; the new order is visible in the list | P1 |
| PN-30 | Double-submit prevention | Rapidly double-tap submit | Only one order is created | P1 |
| PN-31 | Submit validation error surfaced | Force a validation error on submit | Clear error message; form state is not lost | P2 |

### G. Add Products

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PN-32 | Add Products opens available list | Tap Add Products | List loads from `GET /emi-profile/api/v1/products` | P1 |
| PN-33 | Multi-select | Select more than one product | All selected products are visually marked as selected | P1 |
| PN-34 | Deselect before submit | Select a product, then deselect it | It is removed from the pending selection | P2 |
| PN-35 | Not-implemented error on submit | Select product(s), submit | A clear "not implemented" error is shown (add-products API doesn't exist yet) — no crash, no silent failure | P1 |
| PN-36 | Recoverable after not-implemented error | Trigger PN-35, then retry or cancel | User can retry the submit or back out cleanly; selections aren't corrupted | P2 |

### H. Cross-cutting

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| PN-37 | Server error + retry across views | Simulate API failures on Products list, Orders, and Devices in turn | Each surfaces an error state with retry | P2 |
| PN-38 | Double-submission guarded everywhere | Rapidly double-tap every submit-style action in this flow | No duplicate requests fire from any of them | P2 |

---

## Automated coverage note

The registration **Products step on the web portal** already has Playwright coverage in `RegistrationProductsFunctionality.spec.ts`, including a case added specifically for the POS Terminal product's distinct "5 SAR / annual" pricing (relevant to EMI-5783's PoS Terminals context). The richer inline expand/Skip/Request-now/Devices & Delivery/Review sub-flow described in EMI-5783, and the entire More-menu restructuring in EMI-5782, are iOS-native UI with no equivalent currently reachable on web — hence manual coverage only, above.
