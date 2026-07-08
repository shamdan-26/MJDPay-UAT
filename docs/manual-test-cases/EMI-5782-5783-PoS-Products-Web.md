# Manual Test Cases — PoS Products (Web)

Web parity version of [EMI-5782-5783-PoS-Products.md](EMI-5782-5783-PoS-Products.md) — same scenarios and steps as the iOS cases, translated to the web business portal (click instead of tap, browser navigation instead of the iOS "More" menu / simulator gestures). Test IDs are prefixed `W` and map 1:1 to their iOS counterpart (e.g. `WPS-01` ↔ `PS-01`) for parity tracking.

**Status caveat:** EMI-5783 and EMI-5782 are filed as **FE - iOS**. As of this writing, neither the inline PoS expand/Skip/Request-now sub-flow (registration Products step) nor the Products/PoS management screens (Dashboard/Orders/Devices, Add Products) have been confirmed to exist on the web portal — the web Products step currently shows plain selectable product cards with no PoS-specific behavior, and `/products-management` (reached via the "Manage Products" sidebar link, which does exist today) has no verified PoS content. Treat every case below as **pending until the corresponding web feature ships**; run them as regression/acceptance checks once it does. Corresponding draft Playwright UI specs exist in [`RegistrationProductsPage.spec.ts`](../../BusinessTestCases/Registration/ui/RegistrationProductsPage.spec.ts) and [`ProductsManagementPage.spec.ts`](../../BusinessTestCases/products/ui/ProductsManagementPage.spec.ts) — they self-skip with a clear reason until the relevant elements appear.

Priority key: **P1** = blocks the release / core happy path, **P2** = important secondary behavior, **P3** = edge case / polish.

---

## EMI-5783 (web) — Onboarding PoS Request Flow

Context: during web registration, on the Products step, selecting the PoS Terminals card is expected to expand inline and offer "Request devices now" or "Skip - set up later".

### A. Products step — PoS card

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPS-01 | Wallet shown as required | Reach the registration Products step in a browser | Wallet is shown and cannot be deselected (required product) | P1 |
| WPS-02 | PoS Terminals shown as optional | Reach the Products step | PoS Terminals, Bill Payment, Payouts are shown as optional, deselectable | P2 |
| WPS-03 | Selecting PoS Terminals expands inline | Click the PoS Terminals card | The card expands in place on the same page; no full navigation/URL change occurs | P1 |
| WPS-04 | Expanded card shows both choices | Expand the PoS Terminals card | "Request devices now" and "Skip - set up later" are both visible | P1 |
| WPS-05 | Collapsing without choosing | Expand the card, then click it again without picking an option | Card collapses; selection state (Wallet/PoS enabled) is unaffected — confirm actual behavior matches design intent | P3 |

### B. Skip path

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPS-06 | Skip keeps PoS enabled | Expand PoS card → click "Skip - set up later" | PoS remains selected/enabled on the Products step | P1 |
| WPS-07 | Skip shows setup-later message | Same as WPS-06 | An inline message communicates setup was skipped and can be done later | P2 |
| WPS-08 | "Actually, request now" reopens flow | After skipping, click "Actually, request now" | The Devices & Delivery sub-flow opens from the expanded card | P1 |

### C. Request-now path — Devices & Delivery

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPS-09 | Devices & Delivery fields present | Click "Request devices now" | Number-of-devices input, delivery-mode toggle, and address selection are all visible | P1 |
| WPS-10 | Delivery mode toggle switches views | Toggle delivery mode | UI updates accordingly (e.g. single address vs. split delivery groups) | P1 |
| WPS-11 | Select National Wathiq address | Choose the National Wathiq address option | Address is populated/selected from Wathiq data | P1 |
| WPS-12 | Select Custom Pin address | Choose Custom Pin, click a location on the map widget | Custom coordinates are captured and reflected in the form | P1 |
| WPS-13 | Add a delivery/location group | With split delivery enabled, add a location group | A new group row appears, independently configurable | P2 |
| WPS-14 | Remove a delivery/location group | Remove a previously added group | Group is removed; remaining groups/totals adjust correctly | P2 |
| WPS-15 | Cannot proceed with missing required fields | Leave device count or address empty, try to continue | Continue/Next is disabled or a validation error is shown | P1 |
| WPS-16 | No wallet picker shown | Walk through the entire Devices & Delivery step | No wallet-selection UI appears anywhere in this sub-flow | P2 |
| WPS-17 | Zero devices blocked | Enter 0 for device count | Validation blocks proceeding | P2 |
| WPS-18 | Very large device count | Enter an unrealistically large device count (e.g. 99999) | Either a sane max is enforced with a clear message, or the value is otherwise handled without crashing | P3 |
| WPS-19 | Split quantities reconcile with total | With multiple delivery groups, assign per-group device counts | Sum of per-group quantities matches (or is validated against) the total device count | P2 |
| WPS-19b | Keyboard-only completion | Complete the entire Devices & Delivery step using only Tab/Enter, no mouse | All fields and controls are reachable and operable via keyboard | P3 |

### D. Review step

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPS-20 | Review shows total device count | Complete Devices & Delivery, proceed to Review | Total device count matches what was entered | P1 |
| WPS-21 | Review shows delivery breakdown | Same as WPS-20, with multiple groups | Each group's device count and address/location are listed | P1 |
| WPS-22 | Address type correctly labeled | Review with a Wathiq group and a Custom Pin group | Each group is labeled with its correct address source | P2 |
| WPS-23 | Order-creation note shown | Reach Review | Text confirms the order will be created once onboarding is completed (not immediately) | P2 |
| WPS-24 | Back from Review edits prior step | Click Back from Review | Returns to Devices & Delivery with previously entered values intact | P1 |
| WPS-25 | Confirming returns to Products step | Confirm on Review | User lands back on the registration Products step | P1 |

### E. Post-confirmation Products step state

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPS-26 | Inline order-ready state | Confirm a device order | Products step shows device count, delivery summary, Edit, and Remove inline on the PoS card | P1 |
| WPS-27 | Edit reopens with prior values | Click Edit on the order-ready state | Devices & Delivery / Review reopen pre-filled with the previous selections | P1 |
| WPS-28 | Remove clears the order | Click Remove on the order-ready state | Order state clears; card reverts to pre-order (or skipped) state | P1 |
| WPS-29 | Continue after confirming | Confirm a device order, then continue registration | Registration proceeds normally to the next step (NAFATH) | P1 |
| WPS-30 | Continue after skipping | Skip PoS setup, then continue registration | Registration proceeds normally without a device order | P1 |

### F. Registration completion

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPS-31 | Order created on completion (confirmed path) | Confirm a device order, finish registration | Order appears under Manage Products > PoS > Orders after registration completes | P1 |
| WPS-32 | No order created (skipped path) | Skip PoS setup, finish registration | No order is created; a "request later" message/entry point is shown | P1 |
| WPS-33 | Double-submit prevention | Rapidly double-click the Review confirm button | Only one order is created; second click is a no-op or the button is disabled after first click | P1 |
| WPS-34 | Backend validation error surfaced | Force a validation error at confirm (e.g. invalid address payload) | Clear error message shown; user is not silently stuck or logged out | P2 |
| WPS-35 | Network loss mid-flow | Use DevTools/offline mode mid Devices & Delivery, attempt to proceed | Clear error/retry state; previously entered data is not lost | P2 |
| WPS-36 | Browser refresh mid-flow | Refresh the browser mid Devices & Delivery, then return | State is preserved (or the flow restarts cleanly per design — confirm intended behavior; note this replaces the iOS "app backgrounded" case) | P3 |

---

## EMI-5782 (web) — Products Navigation & In-App PoS Request Flow

Context: web equivalent of the iOS "More" menu restructuring. On web, the closest existing anchor is the **"Manage Products"** sidebar link (confirmed present today, navigates to a `/products-management` URL) — used here in place of the iOS "More > Products" entry point. The "Bills" sidebar link is already a separate, distinctly-named entry from "Manage Products" on web, so the literal "rename to Bill Items" acceptance criterion may not have a direct web analogue (see WPN-01/02 caveats) — the underlying goal (Bills and Products are separate, unambiguous entries) already appears satisfied by the current naming; confirm intent with the web team before treating WPN-01 as a defect if "Bills" is never renamed.

### A. Navigation entry points

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPN-01 | Bills entry distinct from Products | Open the sidebar | "Bills" and "Manage Products" are separate, clearly distinguishable entries (web's existing equivalent of the iOS Bill Items/Products split) | P2 |
| WPN-02 | Bills still works | Click "Bills" in the sidebar | Opens the existing bill-related content (regression check, unaffected by the Products work) | P1 |
| WPN-03 | Manage Products entry exists | Open the sidebar | "Manage Products" link is visible and present | P1 |

### B. Products list

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPN-04 | Only assigned products shown | Click "Manage Products" | List shows only products currently assigned to the user's profile, no My Products/All Products tabs | P1 |
| WPN-05 | Non-PoS products have no Manage action | View a non-PoS product in the list | No "Manage" action is shown | P2 |
| WPN-06 | PoS product shows Manage | View a product with type code POS | "Manage" action is visible | P1 |
| WPN-07 | Empty state | View Products with a profile that has no assigned products | A clear empty state is shown | P2 |
| WPN-08 | Loading state | Open Products with network throttled (DevTools) | A loading indicator is shown while the list fetches | P3 |

### C. Manage → PoS management

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPN-09 | Manage opens PoS management | Click Manage on a PoS product | Opens PoS management scoped to that product | P1 |
| WPN-10 | Dashboard/Orders/Devices tabs visible | Inside PoS management | Dashboard, Orders, and Devices tabs are all present | P1 |
| WPN-11 | Transactions hidden this sprint | Inside PoS management | No Transactions tab is visible or reachable (including by direct URL) | P1 |
| WPN-12 | Dashboard loads | Open the Dashboard tab | Loads without error | P3 |

### D. Orders tab

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPN-13 | Orders list populates | Open Orders tab | Orders load from `GET /api/v1/pos/orders/my-order` and display | P1 |
| WPN-14 | Order status shown | View an order | Status is visible | P1 |
| WPN-15 | Order timeline shown | Open an order's detail | Timeline/progress detail is visible | P2 |
| WPN-16 | Audit trail shown where available | Open an order's detail | Audit trail is visible when the backend provides it | P2 |
| WPN-17 | Empty orders state | View Orders with zero PoS orders | Clear empty state shown | P2 |
| WPN-18 | Orders fetch error + retry | Simulate an API failure on `my-order` (DevTools request blocking) | Error state shown with a retry affordance | P2 |

### E. Devices tab

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPN-19 | Devices list populates | Open Devices tab | Devices load from `GET /api/v1/pos/devices/my` and display | P1 |
| WPN-20 | Device fields complete | View a device row | TID, source order, location, Main Wallet, activation date, and status are all shown | P1 |
| WPN-21 | Empty devices state | View Devices with zero mapped terminals | Clear empty state shown | P2 |

### F. Request additional devices (from Orders)

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPN-22 | Request-devices action present | Open Orders tab | An action to create a new PoS order is available | P1 |
| WPN-23 | Reuses onboarding device flow | Trigger request-devices | Opens the same device count/delivery/review flow used in EMI-5783 (web) | P1 |
| WPN-24 | Wathiq address fetched first | Trigger request-devices | User's Wathiq national address is retrieved before the flow opens | P2 |
| WPN-25 | No wallet picker | Walk the flow | No wallet-selection UI; a read-only note states devices activate on Main Wallet | P2 |
| WPN-26 | Submit payload shape | Complete and submit a request | `POST /emi-profile/api/v1/products/orders/pos` is called with product code, delivery groups, group quantities, address source, coordinates | P1 |
| WPN-27 | NATIONAL_ADDRESS_WATHIQ path | Submit using the Wathiq address | Address source enum is `NATIONAL_ADDRESS_WATHIQ`; order succeeds | P1 |
| WPN-28 | CUSTOM_MAP_PIN path | Submit using a custom pinned address | Address source enum is `CUSTOM_MAP_PIN`; order succeeds | P1 |
| WPN-29 | Returns to Orders after submit | Submit a request | User lands back on PoS Orders; the new order is visible in the list | P1 |
| WPN-30 | Double-submit prevention | Rapidly double-click submit | Only one order is created | P1 |
| WPN-31 | Submit validation error surfaced | Force a validation error on submit | Clear error message; form state is not lost | P2 |

### G. Add Products

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPN-32 | Add Products opens available list | Click Add Products | List loads from `GET /emi-profile/api/v1/products` | P1 |
| WPN-33 | Multi-select | Select more than one product | All selected products are visually marked as selected | P1 |
| WPN-34 | Deselect before submit | Select a product, then deselect it | It is removed from the pending selection | P2 |
| WPN-35 | Not-implemented error on submit | Select product(s), submit | A clear "not implemented" error is shown (add-products API doesn't exist yet) — no crash, no silent failure | P1 |
| WPN-36 | Recoverable after not-implemented error | Trigger WPN-35, then retry or cancel | User can retry the submit or back out cleanly; selections aren't corrupted | P2 |

### H. Cross-cutting

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| WPN-37 | Server error + retry across views | Simulate API failures on Products list, Orders, and Devices in turn | Each surfaces an error state with retry | P2 |
| WPN-38 | Double-submission guarded everywhere | Rapidly double-click every submit-style action in this flow | No duplicate requests fire from any of them | P2 |
| WPN-39 | Responsive layout | Resize the browser to a narrow (tablet-width) viewport across Products, Orders, Devices, Add Products | Layouts remain usable, no overlapping/clipped content (web-only concern, no iOS equivalent) | P3 |

---

## Automated coverage note

Draft Playwright UI specs for both tickets exist at [`RegistrationProductsPage.spec.ts`](../../BusinessTestCases/Registration/ui/RegistrationProductsPage.spec.ts) (EMI-5783 web) and [`ProductsManagementPage.spec.ts`](../../BusinessTestCases/products/ui/ProductsManagementPage.spec.ts) (EMI-5782 web). They were authored directly from the ticket acceptance criteria without live DOM verification (see the status caveat above) and use feature-detection gates that skip with a clear reason when the underlying element isn't found — so they're safe to run today (they'll no-op) and should self-activate once the feature ships. Reconcile their selectors against the real implementation on first genuine run.
