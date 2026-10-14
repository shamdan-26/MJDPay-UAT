# Products - UI logic

Purpose: Business Portal "Manage Products" screen listing the products assigned to the user's profile, with in-app **PoS management** (Dashboard / Orders / Devices tabs), a "request additional devices" order flow and an "Add Products" action (EMI-5782; onboarding equivalent is EMI-5783 in Registration).
Route: `/business/main/products-management` (sidebar link `HomepageSidebarPage.manageProductsLink`; the only confirmed-real element, page object header). PoS management sub-route is not confirmed.
Who sees it: Business Portal users with a profile; the "Bills" sidebar entry is separate (renamed "Bill Items", TC-POS-001). Admin sees orders elsewhere (not this screen).
Locator catalog: [Products.generated.md](Products.generated.md). Locators are authored from ticket wording, **not verified on a live build**; specs mock the APIs.

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Products list | `/business/main/products-management` | `pageHeading` "Products", `productsList` | Top / main body | Products assigned to the profile only; no My/All tabs (WPN-04) |
| Products list | same | `addProductsButton` | Header | Opens Add Products |
| Products list | same | Per-product "Manage" (`manageButtonFor(name)`) | Product card/row | Only on type POS (WPN-05/06) |
| Products list | same | `loadingIndicator`, `emptyState`, `errorMessage` + `retryButton` | Body | Loading / empty / error states |
| PoS management | after Manage | Tabs `dashboardTab`, `ordersTab`, `devicesTab` (3 only, EMI-5820) | Top of page | Switch view; `transactionsTab` must not exist this sprint |
| Orders tab | PoS management | `ordersList`, `orderRow(i)`, `requestDevicesButton` | Body | Orders with status, timeline, audit trail |
| New PoS order | dialog/step from Orders | `newPosOrderDialog`, `deviceCountInput`, `deliveryAddressField`, `mainWalletNote`, `submitOrderButton` | Dialog | Request more devices |
| Devices tab | PoS management | `devicesList`, `deviceRow(i)` | Body | TID, source order, location, wallet, activated date, status |
| Add Products | from Products list | `addProductsList` (selectable), `addProductsSubmitButton`, `notImplementedError` | Body/dialog | Pick registration products |

Sources: `ProductsManagementPage.ts`; `Products/functional/ProductsPoSMock.spec.ts`; `docs/manual-test-cases/EMI-5782-5783-PoS-Products-Web.md` lines 84-167.

## Forms

### New PoS order (Request devices)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Number of devices | `deviceCountInput` | number (spinbutton) | Yes | 0 must not create an order and must not call the API (EMI-5818, TC-POS-054) | not confirmed | Dialog open |
| Delivery address | `deliveryAddressField` | national address or custom map pin | Yes | Source enum `NATIONAL_ADDRESS_WATHIQ` or `CUSTOM_MAP_PIN`; Wathiq address fetched before the flow opens (WPN-24/27/28) | not confirmed | Dialog open |
| Wallet | `walletPicker` | - | - | **Must not be shown**; read-only note "Main Wallet" instead (TC-POS-009, WPN-25) | - | Never |
| Main wallet note | `mainWalletNote` | text | - | States devices activate on Main Wallet | - | Always in dialog |
| Submit | `submitOrderButton` /^submit( request)?$/ | button | - | Must be clickable (EMI-5819); double click sends one request (TC-POS-015) | Validation error keeps form state (WPN-31) | Valid device count |

### Add Products

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Product selection | `addProductsList` | multi-select list | At least one to submit | Multi-select, deselect before submit (WPN-33/34); loaded from products endpoint | - | After Add Products click |
| Submit | `addProductsSubmitButton` | button /^(submit\|add\|confirm)$/ | - | No live endpoint yet | `notImplementedError` /not implemented\|not yet available\|coming soon/ | Selection made |

## Tables and lists

| Aspect | Detail | Source |
|---|---|---|
| Products list | Only profile-assigned products; item per product (`productItem(name)`); types `POS`, `WALLET`, `BILL_PAYMENT`, `PAYOUTS` | helper `MockProduct` |
| Orders list | Columns/fields: order id, status (e.g. Requesting, Active), timeline, audit trail (when backend provides) | helper `MockPosOrder`; WPN-14..16 |
| Devices list | TID, source order, location, wallet ("Main Wallet"), activated date, status | helper `MockDevice`; TC-POS-007 |
| Filters, sorting, paging | Not documented | - |
| Empty states | Products /no products\|nothing here\|empty/; orders and devices empty states required (WPN-17, WPN-21) | page object; manual cases |
| Row actions | Manage (POS products only); order detail opens timeline | WPN-05/06/15 |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `manageButtonFor(name)` | Product row | Opens PoS management | Product type POS | Tabs view (Dashboard/Orders/Devices) |
| `addProductsButton` | Products header | Loads available products | Always | `addProductsList` (GET products) |
| `addProductsSubmitButton` | Add Products | Tries to add | Selection made | Not-implemented error |
| `ordersTab` / `devicesTab` / `dashboardTab` | PoS management | Switch tab | Always | Orders / Devices / Dashboard |
| `requestDevicesButton` /request (additional )?devices?\|new (pos )?order/ | Orders tab | Opens New PoS order flow | Orders tab | `newPosOrderDialog` |
| `submitOrderButton` | New order | POST order | Device count valid | Returns to Orders, new order listed (WPN-29); message like "order submitted/created/requested" |
| `retryButton` | Error state | Re-fetches | After a failed load | Reloaded list |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Product type POS | Manage action shown | WPN-06, TC-POS-004 |
| Product type not POS | No Manage action | WPN-05 |
| Products request in flight | Loading indicator | TC-POS-012 |
| User has no products | Empty state message | TC-POS-013 |
| Products API 500 | User-friendly error with retry | TC-POS-014 |
| Device count 0 | No order created, no POST | TC-POS-054, EMI-5818 |
| Submit clicked twice | Single POST | TC-POS-015, WPN-30 |
| Add Products submitted | "Not implemented" error, recoverable | TC-POS-011, WPN-35/36 |
| Transactions tab | Hidden this sprint, also by direct URL | WPN-11, EMI-5820 |
| B2B user | Sees own orders only, never admin/global ones | EMI-5821, TC-POS-057 |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Products shown = profile-assigned only | No My Products / All Products tabs | WPN-04, TC-POS-003 |
| New PoS devices activate on Main Wallet | No wallet selection | TC-POS-009 |
| Order payload | product code, delivery groups, group quantities, address source, coordinates | WPN-26 |
| Address source values | `NATIONAL_ADDRESS_WATHIQ`, `CUSTOM_MAP_PIN` | WPN-27/28 |
| PoS management tabs | Exactly Dashboard, Orders, Devices | EMI-5820 |
| Bills sidebar entry renamed "Bill Items" and not labelled "Products" | | TC-POS-001 |
| Order initial status | `Requesting`, later `Active` | helper `mockPosOrderSubmitSuccess`, `defaultMockOrders` |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Order submitted | Text matching /order (submitted\|created\|requested)/i (exact copy not confirmed) | Toast/inline |
| Add Products submit | /not implemented\|not yet available\|coming soon/ | `notImplementedError` |
| Load failure | /something went wrong\|failed to load\|error occurred/ with Retry | `errorMessage` |
| Empty | /no products\|nothing here\|empty/ | `emptyState` |
| AR texts | Not in repo | - |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Load products | `GET /emi-profile/api/v1/products` | From ticket; response `{data:[{id,name,typeCode}]}` |
| Load orders | `GET /api/v1/pos/orders/my-order` | From ticket |
| Load devices | `GET /api/v1/pos/devices/my` (manual case WPN-19) | Mock uses pattern `**/api/v1/pos/devices/**`; real path unverified |
| Submit order | `POST /emi-profile/api/v1/products/orders/pos` | Returns 201 `{id,status:'Requesting'}` in mock |
| Admin orders list | `GET /api/v1/pos/orders` | Must not leak to B2B user (EMI-5821) |
| Add Products submit | none | No server contract yet |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Whole page object unverified against live DOM; specs use feature detection and skip | `ProductsManagementPage.ts` header; `ui/ProductsManagementPage.spec.ts` lines 53, 58 |
| Add Products backend does not exist (not-implemented by design) | `ProductsPoSHelper.ts` comment; TC-POS-011 |
| Defect regressions EMI-5818 (0 devices), EMI-5819 (Submit not clickable), EMI-5820 (extra tabs), EMI-5821 (admin orders leak) | `ProductsPoSMock.spec.ts` line 246 |
| TC-POS-057 returns early if route not reachable, so weak coverage | `ProductsPoSMock.spec.ts` line 299 |
| Device-count inputs are guarded with `isVisible` checks and may be skipped silently | `ProductsPoSMock.spec.ts` lines 130, 266 |

## Open questions

| Question | Note |
|---|---|
| Real DOM labels for Products page, empty text, retry | Not verified |
| Max/min device count rules besides 0 | Not in repo |
| Delivery group structure (per-group quantity UI) | Payload only in manual case |
| What the Dashboard tab shows | WPN-12 only says it loads |
| When Transactions tab returns | "this sprint" only |
| Real devices endpoint | Two different paths in repo |
