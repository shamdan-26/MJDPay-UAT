# EMI - Sprint 71 — Test Cases (Categorized by Topic)

---

## 1. PoS (Point of Sale) System

### 1.1 Products Navigation & In-App PoS Request Flow
**Related Tasks:** [EMI-5780](https://digitalcash.atlassian.net/browse/EMI-5780) (Android), [EMI-5782](https://digitalcash.atlassian.net/browse/EMI-5782) (iOS), [EMI-5784](https://digitalcash.atlassian.net/browse/EMI-5784) (Web)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-POS-001 | Bill Items rename verification | 1. Log in to the business app 2. Navigate to More menu 3. Check the previously named "Products" option | The bill-related "Products" option is now renamed to "Bill Items" |
| TC-POS-002 | New Products section visible | 1. Log in to the business app 2. Navigate to More / side menu | A new "Products" section is available showing profile-assigned products |
| TC-POS-003 | Products list shows only user profile products | 1. Log in as a business user with assigned products 2. Open Products | Only products assigned to the authenticated user's profile are displayed |
| TC-POS-004 | PoS product Manage action | 1. Open Products section 2. Locate a product with type code `POS` | The PoS product item shows a "Manage" action |
| TC-POS-005 | PoS management tabs | 1. Click Manage on a PoS product | PoS management opens with Dashboard, Orders, and Devices tabs visible. Transactions tab is hidden |
| TC-POS-006 | PoS Orders view | 1. Open PoS management 2. Click on Orders tab | Orders list loads from `GET /api/v1/pos/orders/my-order` showing status, timeline, and audit trail |
| TC-POS-007 | PoS Devices view | 1. Open PoS management 2. Click on Devices tab | Devices list shows TID, source order, location, Main Wallet, activated date, and status |
| TC-POS-008 | Create new PoS order from Orders | 1. Navigate to Orders tab 2. Click "New PoS Order" / "Request additional devices" 3. Complete device count and delivery setup 4. Submit | New PoS order is submitted via `POST /emi-profile/api/v1/products/orders/pos` with product code, delivery groups, quantity, address source, and coordinates |
| TC-POS-009 | Wallet picker not shown | 1. Create a new PoS order | No wallet picker is shown; a read-only note states devices activate on the Main Wallet |
| TC-POS-010 | Add Products action | 1. Open Products section 2. Click "Add Products" | Available registration products list loads from `GET /emi-profile/api/v1/products` |
| TC-POS-011 | Add Products — not-implemented error | 1. Select one or more products 2. Click submit | A clear "not-implemented" error is shown (API not yet available) |
| TC-POS-012 | Loading state | 1. Open Products section with slow network | Loading indicator is shown while data loads |
| TC-POS-013 | Empty state | 1. Log in with a user with no assigned products 2. Open Products | Appropriate empty state message is displayed |
| TC-POS-014 | Server error handling | 1. Simulate server error on Products API | User-friendly error message is shown with retry option |
| TC-POS-015 | Prevent repeated submission | 1. Click Submit on a PoS order request 2. Quickly click Submit again | Only one request is sent; duplicate submission is prevented |

### 1.2 Onboarding PoS Request Flow
**Related Tasks:** [EMI-5781](https://digitalcash.atlassian.net/browse/EMI-5781) (Android), [EMI-5783](https://digitalcash.atlassian.net/browse/EMI-5783) (iOS), [EMI-5785](https://digitalcash.atlassian.net/browse/EMI-5785) (Web)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-POS-016 | Products step in registration | 1. Start business registration 2. Proceed to Products step | Product list shows: Wallet (required), PoS Terminals (optional), Bill Payment, and Payouts |
| TC-POS-017 | PoS card inline expansion | 1. On Products step, select PoS Terminals card | Card expands inline with "Request devices now" and "Skip - set up later" options |
| TC-POS-018 | Skip device setup | 1. Select PoS Terminals 2. Click "Skip - set up later" | PoS stays enabled; skipped/setup-later message shown; "Actually, request now" option is available |
| TC-POS-019 | Request devices now flow | 1. Select PoS Terminals 2. Click "Request devices now" | PoS sub-flow opens: Devices & Delivery > Review |
| TC-POS-020 | Devices & Delivery — single location | 1. Enter number of devices 2. Select "One location" delivery mode 3. Select address (National Address or Custom Map Pin) | Delivery configuration is set for a single location |
| TC-POS-021 | Devices & Delivery — split per device | 1. Enter number of devices 2. Select "Split per device(s)" 3. Add/remove location groups | Split delivery groups are configured correctly |
| TC-POS-022 | Review step | 1. Complete Devices & Delivery 2. Proceed to Review | Review shows total devices, delivery group breakdown, addresses, and confirmation message |
| TC-POS-023 | Return to Products step after confirm | 1. Confirm device order on Review step | Returns to Products step showing inline PoS order ready state with device count, delivery summary, Edit and Remove actions |
| TC-POS-024 | Registration completion with device order | 1. Confirm device order 2. Complete registration | PoS order is created and visible in My Products > PoS > Orders |
| TC-POS-025 | Registration completion with skipped devices | 1. Skip device setup 2. Complete registration | No device order is created; message shows devices can be requested later from My Products > PoS |
| TC-POS-026 | Validation — zero device count | 1. Enter 0 devices 2. Try to proceed | Validation error is shown |
| TC-POS-027 | Validation — split groups not summing | 1. Split delivery mode 2. Set group quantities that don't sum to total | Validation error is shown |
| TC-POS-028 | Prevent double submission | 1. Click confirm 2. Quickly click confirm again | Only one submission is processed |

### 1.3 Admin PoS Order Management
**Related Task:** [EMI-5786](https://digitalcash.atlassian.net/browse/EMI-5786)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-POS-029 | Admin Products > PoS Orders listing | 1. Log in as admin 2. Navigate to Products > PoS Orders | All PoS device orders across all users are displayed |
| TC-POS-030 | Admin KPI cards | 1. Open PoS Orders page | KPI cards show: Open orders, Awaiting export, With provider, Active |
| TC-POS-031 | Filtering | 1. Apply filter by status, order type, account/user, or submitted date | Results are filtered accordingly |
| TC-POS-032 | Bulk selection | 1. Select multiple orders from the table | Selected orders are highlighted and bulk actions become available |
| TC-POS-033 | Order detail drawer | 1. Click on an order row | Drawer shows Summary, Delivery groups table, Devices in this order, and full Timeline |
| TC-POS-034 | Manual status transitions | 1. Select an order 2. Transition status through: Requesting → Validating → Approved → Sent to Provider → Shipping → Activating → Active | Each status transition is enforced server-side; timeline updated |
| TC-POS-035 | Download Excel | 1. Bulk-select Approved orders 2. Click "Download Excel" | Excel is generated with one row per delivery group (Order Ref, Name, Wallet, etc.) |
| TC-POS-036 | Mark as Sent to Provider | 1. After exporting, click "Mark as Sent to Provider" | Selected orders transition to "Sent to Provider" status |
| TC-POS-037 | Upload TIDs | 1. Fill TID column in exported Excel 2. Upload via "Upload TIDs" | TIDs are validated (uniqueness, count match); mapped to Main Wallet; order moves to Active/Partially Active; import summary shown |
| TC-POS-038 | Cancellation before Sent to Provider | 1. Select an order before "Sent to Provider" status 2. Cancel | Order is cancelled successfully |
| TC-POS-039 | Cancellation after Sent to Provider blocked | 1. Select an order with "Sent to Provider" or later status 2. Try to cancel | Cancellation is blocked |
| TC-POS-040 | Termination lifecycle | 1. Initiate termination 2. Follow: Termination Requested → Pending Return → Devices Returned → Deactivating → Terminated | Each transition completes and timeline is updated |
| TC-POS-041 | Audit logging | 1. Perform any admin action (status change, export, import) | Action is logged with admin identity, timestamp, and optional note |

### 1.4 BE — PoS Backend Services
**Related Tasks:** [EMI-5787](https://digitalcash.atlassian.net/browse/EMI-5787), [EMI-5788](https://digitalcash.atlassian.net/browse/EMI-5788), [EMI-5789](https://digitalcash.atlassian.net/browse/EMI-5789), [EMI-5790](https://digitalcash.atlassian.net/browse/EMI-5790)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-POS-042 | Card Service renamed | 1. Check service discovery, API docs, CI/CD | Card Service is renamed to Product Management Service across all references |
| TC-POS-043 | PoS order creation event | 1. Submit a PoS order request via Profile Service | Event is published with user ID, product code, wallet ID, device count, delivery config, and timestamp |
| TC-POS-044 | Order workflow transitions | 1. Create order 2. Transition through all valid statuses | Each transition is valid and timeline entries are appended |
| TC-POS-045 | Invalid status transition blocked | 1. Try to transition from Requesting directly to Active | Transition is rejected |
| TC-POS-046 | Duplicate pending order validation | 1. Submit a PoS order 2. Submit another identical order while first is pending | Second order is rejected as duplicate |
| TC-POS-047 | Device creation per order | 1. Create a PoS order with N devices | N device placeholders are created, each associated with order, delivery group, and Main Wallet |
| TC-POS-048 | TID mapping and activation | 1. Import TIDs for an order's devices | TIDs are mapped, encrypted, wallet codes retrieved; devices activated; order status updated to Active |
| TC-POS-049 | TID uniqueness validation | 1. Import a TID that already exists on the platform | Validation error returned for duplicate TID |
| TC-POS-050 | Partial activation | 1. Import TIDs for only some devices in an order | Order moves to "Partially Active"; remaining devices stay pending |
| TC-POS-051 | Excel export content | 1. Export approved orders | Excel contains: Order Ref, Name, Main Wallet, Wallet Code, Delivery Group, Device Count, Delivery Type, Address, Status, empty TID column |
| TC-POS-052 | Excel import validation — mismatched order | 1. Upload Excel with wrong Order Ref | Validation error in import summary |
| TC-POS-053 | Excel import partial support | 1. Upload Excel with some valid and some invalid rows | Valid rows processed; invalid rows skipped; summary shows processed/successful/failed/skipped counts |

### 1.5 PoS Bugs
**Related Tasks:** [EMI-5818](https://digitalcash.atlassian.net/browse/EMI-5818), [EMI-5819](https://digitalcash.atlassian.net/browse/EMI-5819), [EMI-5820](https://digitalcash.atlassian.net/browse/EMI-5820), [EMI-5821](https://digitalcash.atlassian.net/browse/EMI-5821), [EMI-5746](https://digitalcash.atlassian.net/browse/EMI-5746)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-POS-054 | No order created with 0 devices (EMI-5818) | 1. Submit products registration with PoS selected but no delivery groups (skip devices) | No PoS order is created when device count is 0 |
| TC-POS-055 | Submit device request button functional (EMI-5819) | 1. Register user, skip device setup 2. Log in 3. Products > Manage POS > New device 4. Complete setup, click Review 5. Click Submit Request | Submit Request button is clickable and request is submitted |
| TC-POS-056 | POS page 3-tab layout (EMI-5820) | 1. Log in 2. Menu > Products > Manage POS | POS page shows 3 tabs: Dashboard (active devices, devices by location, recent orders, view all link), Orders, Devices |
| TC-POS-057 | B2B user cannot retrieve admin orders (EMI-5821) | 1. Log in with B2B account 2. Call `GET /api/v1/pos/orders` | Only the user's own orders are returned; admin orders are not exposed |

---

## 2. Payment Links

### 2.1 Bill/Wallet Payment Link Resolution & Payment
**Related Task:** [EMI-5463](https://digitalcash.atlassian.net/browse/EMI-5463)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-PL-001 | Payment link URL handling | 1. Open a payment link URL in the Customer app | App resolves the token and shows the appropriate flow |
| TC-PL-002 | Token validation — valid token | 1. Open a valid payment link | Token validated; payment summary displayed for the link type (bill or wallet) |
| TC-PL-003 | Token validation — invalid/expired token | 1. Open an invalid or expired payment link | Error message for invalid/expired/disabled link |
| TC-PL-004 | Payer information form | 1. Proceed past validation 2. Fill payer info: mobile, email, name, national ID 3. Select payment method | Form fields are validated; payment method selection works |
| TC-PL-005 | Wallet link — amount input validation | 1. Open a wallet-type link 2. Enter amount below minimum | Validation error shown for minimum amount |
| TC-PL-006 | Wallet link — amount above maximum | 1. Enter amount above maximum | Validation error shown |
| TC-PL-007 | OTP verification step | 1. Complete payer info 2. Proceed to OTP (when configured) | OTP is sent and verification step works |
| TC-PL-008 | Full navigation flow | 1. Complete Link Entry → Summary → Payer Info → OTP → Payment → Result | All steps transition correctly with proper state |

### 2.2 Update Payment Links Flow (Remove Payer Info Step)
**Related Tasks:** [EMI-5791](https://digitalcash.atlassian.net/browse/EMI-5791) (Android), [EMI-5792](https://digitalcash.atlassian.net/browse/EMI-5792) (iOS), [EMI-5793](https://digitalcash.atlassian.net/browse/EMI-5793) (Web), [EMI-5794](https://digitalcash.atlassian.net/browse/EMI-5794) (BE)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-PL-009 | Payer info removed from bill payment link | 1. Open a bill payment link 2. Proceed through checkout | No payer info screen is shown; checkout info resolved from link owner's profile |
| TC-PL-010 | Payer info removed from wallet transfer link | 1. Open a wallet transfer link 2. Proceed through checkout | No payer info screen; info resolved automatically |
| TC-PL-011 | Incomplete owner profile error | 1. Open a payment link where owner profile has missing info | Clear error message shown indicating profile info is incomplete |
| TC-PL-012 | Backward compatibility | 1. Test with older payment links | Flow handles gracefully |

### 2.3 Payment Link Bugs
**Related Tasks:** [EMI-5774](https://digitalcash.atlassian.net/browse/EMI-5774), [EMI-5775](https://digitalcash.atlassian.net/browse/EMI-5775), [EMI-5814](https://digitalcash.atlassian.net/browse/EMI-5814)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-PL-013 | Bill payment link update-status no 500 (EMI-5774) | 1. Start bill payment link transaction 2. Complete or cancel from HyperPay | Status update completes without 500 error |
| TC-PL-014 | Cancelled payment link — no infinite loading (EMI-5775) | 1. Open bill payment link 2. Go to card payment page 3. Cancel transaction | Verify payment step shows proper result or cancellation state, no infinite loading |
| TC-PL-015 | Bill payment link does not redirect to wallet (EMI-5814) | 1. Create a bill payment link 2. Paste link in browser or scan QR | Flow opens bill payment, not wallet payment |

---

## 3. Transaction Summary & Financial Calculations

### 3.1 Standardize Transaction API Response
**Related Task:** [EMI-5492](https://digitalcash.atlassian.net/browse/EMI-5492)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-TXN-001 | New response payload — fields mapped | 1. Initiate any transaction 2. Check API response | Response contains `id`, `amount`, `txnReference`, `batchTransactionReference`, `status`, `isOtpRequired`, `transactionTypeCode` |
| TC-TXN-002 | checkoutId → txnReference migration | 1. Check all affected endpoints | `checkoutId` is removed; same value is at `txnReference` |
| TC-TXN-003 | draftTransactionId → txnReference | 1. Check affected endpoints | `draftTransactionId` is now `txnReference` |
| TC-TXN-004 | Summary endpoint rename — customer | 1. Call `/api/v1/bank-transaction/customer/summary/open` | Returns open summary with `originalAmount`, `commission`, `vat`, `totalAmountToBeSent`, `receiverCurrency`, `totalAmountToBeReceived` |
| TC-TXN-005 | Summary endpoint rename — business | 1. Call `/api/v1/bank-transaction/business/summary/open` | Returns correct open summary response |

### 3.2 New Transaction Summary Display
**Related Task:** [EMI-5576](https://digitalcash.atlassian.net/browse/EMI-5576)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-TXN-006 | Top-up summary label | 1. Create a top-up transaction 2. View summary | Label shows "total amount to be received"; value comes from `totalAmount` in API response |
| TC-TXN-007 | Bank transfer summary label | 1. Create a bank transfer 2. View summary | Label shows "total amount to be sent" |
| TC-TXN-008 | Bill/QR payment summary label | 1. Create a bill or QR payment 2. View summary | Label shows "total amount to be paid" |
| TC-TXN-009 | Wallet transfer summary details | 1. Create a wallet transfer 2. View summary | Shows transaction type, destination profile name, unified number, purpose of transfer, notes |
| TC-TXN-010 | General summary structure | 1. View any transaction summary | Shows: transaction type first, then transaction-specific details, then financial breakdown (original amount, commission, VAT, total with correct label) |

### 3.3 Commission & VAT Display Bugs
**Related Tasks:** [EMI-5614](https://digitalcash.atlassian.net/browse/EMI-5614), [EMI-5699](https://digitalcash.atlassian.net/browse/EMI-5699), [EMI-5805](https://digitalcash.atlassian.net/browse/EMI-5805)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-TXN-011 | W2W destination commission/VAT (EMI-5614) | 1. Perform W2W transfer with destination commission 2. View summary | Commission, VAT, and rounded amounts are correctly calculated for destination |
| TC-TXN-012 | Commission/VAT display on transaction page (EMI-5699) | 1. Perform a w2w transaction with commission/VAT 2. Open the transaction summary page | Commission and VAT display for the destination correctly |
| TC-TXN-013 | Source vs destination amounts (EMI-5805) | 1. Create a transaction 2. Check amounts for sender and receiver | Source amount displays correctly for sender; destination amount displays correctly for receiver; original amount shown (not calculated amount with commission/VAT) |

---

## 4. OTP & Authentication

**Related Tasks:** [EMI-5578](https://digitalcash.atlassian.net/browse/EMI-5578), [EMI-5682](https://digitalcash.atlassian.net/browse/EMI-5682), [EMI-5684](https://digitalcash.atlassian.net/browse/EMI-5684), [EMI-5685](https://digitalcash.atlassian.net/browse/EMI-5685), [EMI-5709](https://digitalcash.atlassian.net/browse/EMI-5709), [EMI-5769](https://digitalcash.atlassian.net/browse/EMI-5769), [EMI-5800](https://digitalcash.atlassian.net/browse/EMI-5800), [EMI-5808](https://digitalcash.atlassian.net/browse/EMI-5808), [EMI-5750](https://digitalcash.atlassian.net/browse/EMI-5750), [EMI-5817](https://digitalcash.atlassian.net/browse/EMI-5817)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-OTP-001 | OTP max attempts — flow restart (EMI-5578) | 1. Start a top-up or bank transfer 2. Reach OTP step 3. Enter invalid OTP until max attempts exceeded | Error detected; in-progress state reset; user navigated back to first screen of the transaction flow |
| TC-OTP-002 | OTP max attempts — fresh flow | 1. After max OTP exceeded and restart 2. Begin the flow again | New flow behaves as a fresh transaction attempt; no reuse of invalid state |
| TC-OTP-003 | Bill payment link OTP max attempts — no 500 (EMI-5684) | 1. Open bill payment link 2. Reach OTP step 3. Enter invalid OTP until max attempts | Proper error message returned (not 500 Internal Server Error); user returns to first page |
| TC-OTP-004 | Bill payment QR OTP max attempts — no 500 (EMI-5685) | 1. Open customer app 2. Scan bill QR 3. Enter invalid OTP until max attempts | Proper error message (not 500); user can return to first page |
| TC-OTP-005 | Change password OTP delivery (EMI-5682) | 1. As business user, request change password | OTP message is delivered to the business user |
| TC-OTP-006 | Release payment — OTP popup navigation (EMI-5709) | 1. Open customer app 2. Create pay on delivery transaction 3. Release the payment | User is navigated to the OTP popup without errors |
| TC-OTP-007 | Add beneficiary OTP — no 403 (EMI-5769) | 1. Log in to business profile 2. Navigate to Add Beneficiary 3. Proceed to OTP step 4. Click Resend OTP | New OTP is generated and sent (no 403 Unauthorized error) |
| TC-OTP-008 | Add beneficiary — OTP sent (EMI-5800) | 1. Open business app (biller user) 2. Add a new beneficiary 3. Observe OTP step | OTP is sent; no authorization error on retry |
| TC-OTP-009 | OTP hashing in notification log (EMI-5808) | 1. Trigger any OTP 2. Check notification log | OTP values are hashed in the notification log |
| TC-OTP-010 | Session token in business registration (EMI-5750) | 1. Start business registration 2. Verify OTP | `sessionToken` is captured from OTP verify response |
| TC-OTP-011 | Session token sent on protected APIs (EMI-5750) | 1. After OTP verification, call registration APIs | `Authorization: Bearer <session_token>` is sent on protected endpoints |
| TC-OTP-012 | Session token NOT sent on pre-auth APIs (EMI-5750) | 1. Call `/register/mobile/otp`, `/register/mobile/otp/resend`, `/register/verify/otp` | No session token header sent on these endpoints |
| TC-OTP-013 | Session token 401 handling (EMI-5750) | 1. Use expired session token 2. Call a protected API | User is required to restart from OTP verification |
| TC-OTP-014 | Session token cleared on completion (EMI-5750) | 1. Complete registration flow | Session token is cleared |
| TC-OTP-015 | Password reset — no Forbidden page (EMI-5817) | 1. Admin Portal > Manage Admin Users > Reset Password 2. Set new password 3. Log in with new password | Login succeeds; no redirect to Forbidden page |

---

## 5. HyperPay SDK Upgrade

**Related Tasks:** [EMI-5759](https://digitalcash.atlassian.net/browse/EMI-5759) (Android), [EMI-5760](https://digitalcash.atlassian.net/browse/EMI-5760) (iOS)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-SDK-001 | Android app builds with SDK 7.11.0 | 1. Build EMI Business Android app with new SDK | Build succeeds with JDK 17 and API Level 35 |
| TC-SDK-002 | Android successful transaction | 1. Initiate a payment on Android 2. Complete the transaction | Payment completes successfully with new SDK |
| TC-SDK-003 | Android 3DS verification | 1. Initiate a payment requiring 3DS | 3DS flow completes correctly with updated certificate |
| TC-SDK-004 | iOS app builds with SDK 7.11.0 | 1. Build EMI Customer iOS app with new frameworks | Build succeeds with Xcode 26; frameworks embedded and signed |
| TC-SDK-005 | iOS successful transaction | 1. Initiate a payment on iOS 2. Complete the transaction | Payment completes successfully with new SDK |
| TC-SDK-006 | iOS 3DS verification | 1. Initiate a payment requiring 3DS | 3DS flow completes correctly |

---

## 6. Product Catalog & Pricing

**Related Tasks:** [EMI-5659](https://digitalcash.atlassian.net/browse/EMI-5659) (BE), [EMI-5664](https://digitalcash.atlassian.net/browse/EMI-5664) (Admin FE), [EMI-5713](https://digitalcash.atlassian.net/browse/EMI-5713), [EMI-5729](https://digitalcash.atlassian.net/browse/EMI-5729), [EMI-5810](https://digitalcash.atlassian.net/browse/EMI-5810)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-PROD-001 | Create product — required fields | 1. Admin > Create Product 2. Fill Product Name, Code, Description, Type, Personas, Status | Product is created with all required fields |
| TC-PROD-002 | Product types | 1. Create products with each type: Wallet, Payment Gateway, Reporting Suite, Other | All types are available and saved correctly |
| TC-PROD-003 | Applicable Personas — multi-select | 1. Create product 2. Select multiple personas (Biller, Merchant, Customer, All) | Multi-select works correctly |
| TC-PROD-004 | Product Status options | 1. Create products with Active, Inactive, Coming Soon status | All status options work; Coming Soon appears greyed/unselectable in registration |
| TC-PROD-005 | Product Code read-only on edit | 1. Edit an existing product | Product Code field is read-only |
| TC-PROD-006 | Disable product with active subscribers | 1. Set an active product with subscribers to Inactive | Confirmation prompt is shown before disabling |
| TC-PROD-007 | Inactive product hidden from registration | 1. Set a product to Inactive 2. Start new registration | Product is not visible in registration but remains in existing accounts |
| TC-PROD-008 | Fee configuration — all types | 1. Configure fee with Percentage, Flat Fee, and Hybrid types | Fee Type, Fee Value, Flat Component (Hybrid), Billing Cycle, SAR currency are saved |
| TC-PROD-009 | Volume fee tiers | 1. Add up to 5 volume fee tiers to a product | All tiers are saved; adding a 6th is blocked |
| TC-PROD-010 | Pricing history | 1. Change a product fee 2. Check pricing history | History shows timestamp, previous value, new value, admin; history is immutable |
| TC-PROD-011 | Product limits | 1. Set hourly/daily/monthly/yearly limits (maxCount, maxAmount) | Limits are saved and returned in API response |
| TC-PROD-012 | Product displayed as free on edit (EMI-5713) | 1. Create a free product 2. Edit the product | Free toggle is correctly shown as enabled |
| TC-PROD-013 | Product limitation fields returned (EMI-5729) | 1. Add/edit product with limits 2. GET product | Response includes `defaultProductAmountLimitation` and `productCountLimitation` (not null) |
| TC-PROD-014 | Add Product page UI (EMI-5810) | 1. Business Portal > Products > Add Product | Page renders correctly without graphical artifacts; user can add products |

---

## 7. Contract Management

**Related Tasks:** [EMI-5660](https://digitalcash.atlassian.net/browse/EMI-5660), [EMI-5661](https://digitalcash.atlassian.net/browse/EMI-5661), [EMI-5711](https://digitalcash.atlassian.net/browse/EMI-5711), [EMI-5752](https://digitalcash.atlassian.net/browse/EMI-5752), [EMI-5756](https://digitalcash.atlassian.net/browse/EMI-5756)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-CTR-001 | Create contract template | 1. Create template with Name, Code, Persona, Content, Effective Date | Template is created with auto-generated Code and Status=Draft |
| TC-CTR-002 | Dynamic placeholders | 1. Add placeholders: company_name, unified_number, national_id, iban, etc. in template content | Placeholders are recognized and replaceable |
| TC-CTR-003 | Publish template | 1. Create template with content and effective date 2. Publish | Template status changes to Published; version auto-incremented |
| TC-CTR-004 | Only one published version per persona | 1. Publish a new version for a persona that already has a published template | Previous published version is auto-archived; new one is Published |
| TC-CTR-005 | Published template not editable | 1. Try to edit a Published template | Editing is blocked; admin must create a new version |
| TC-CTR-006 | Publish without effective date — validation (EMI-5711) | 1. Try to publish template without Effective Date | Validation error returned |
| TC-CTR-007 | Publish with duplicate name — validation (EMI-5711) | 1. Try to publish template with a duplicate name | Validation error returned |
| TC-CTR-008 | Publish with no content — validation (EMI-5711) | 1. Try to publish template with empty content | Validation error returned |
| TC-CTR-009 | Edit template — type change blocked (EMI-5756) | 1. Edit a template 2. Try to change the TYPE | Validation error returned |
| TC-CTR-010 | Edit template — date change blocked (EMI-5756) | 1. Edit a template 2. Try to change the DATE | Validation error returned |
| TC-CTR-011 | Signed contracts audit | 1. Navigate to Contracts Audit page 2. Filter by Persona, version, date range, registration status | Signed contract records shown with user name, version, timestamp, method, download link |
| TC-CTR-012 | Download signed contract PDF (EMI-5661) | 1. Click download on a signed contract | PDF downloads via secure authenticated URL |
| TC-CTR-013 | Immutability of signed contracts (EMI-5661) | 1. Try to delete or modify a signed contract record | Operation is blocked; records are immutable |
| TC-CTR-014 | Date range filter for contracts (EMI-5752) | 1. Make a date range request for contracts | Returns relevant contract data (not empty results) |

---

## 8. MOZN Anti-Fraud Integration

**Related Tasks:** [EMI-5419](https://digitalcash.atlassian.net/browse/EMI-5419) (Study), [EMI-5725](https://digitalcash.atlassian.net/browse/EMI-5725) (Environment), [EMI-5741](https://digitalcash.atlassian.net/browse/EMI-5741) (Webhook), [EMI-5742](https://digitalcash.atlassian.net/browse/EMI-5742) (Non-Financial), [EMI-5743](https://digitalcash.atlassian.net/browse/EMI-5743) (Financial)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-MOZN-001 | MOZN module as external service | 1. Verify MOZN integration module exists as an external service dependency | Module is registered and reachable |
| TC-MOZN-002 | Transaction logging in MongoDB | 1. Trigger a MOZN API call 2. Check MongoDB logs | Request and response are logged in MongoDB for audit |
| TC-MOZN-003 | CastleMock mock endpoints | 1. Call MOZN APIs against CastleMock | Mock endpoints return sample responses |
| TC-MOZN-004 | Webhook callback API | 1. Send a webhook callback from MOZN (simulated) | Callback is received, validated, and processed |
| TC-MOZN-005 | Webhook retry handling | 1. Simulate failed webhook processing | Retry mechanism handles the failure |
| TC-MOZN-006 | Non-financial — Customer Login | 1. Customer logs in | MOZN validation triggered for login event; fraud decision processed |
| TC-MOZN-007 | Non-financial — Customer Registration | 1. Register a new customer | MOZN validation triggered for registration |
| TC-MOZN-008 | Non-financial — Reset Password | 1. Request password reset | MOZN validation triggered |
| TC-MOZN-009 | Non-financial — Create Beneficiary | 1. Add a new beneficiary | MOZN validation triggered |
| TC-MOZN-010 | Non-financial — Update Profile Status | 1. Update profile status | MOZN validation triggered |
| TC-MOZN-011 | Non-financial — Trust Device | 1. Trust a new device | MOZN validation triggered |
| TC-MOZN-012 | Non-financial — Update Customer Details | 1. Update customer details via Wathiq | MOZN validation triggered |
| TC-MOZN-013 | Financial operations validation | 1. Initiate any financial transaction (transfer, payment, top-up) | Transaction sent to MOZN for validation before processing; fraud scoring and approval/rejection handled |
| TC-MOZN-014 | MOZN rejection blocks transaction | 1. Simulate a MOZN rejection for a financial transaction | Transaction is blocked and user is notified |

---

## 9. Multi-Omnibus & Transaction Processing

**Related Tasks:** [EMI-5251](https://digitalcash.atlassian.net/browse/EMI-5251), [EMI-5258](https://digitalcash.atlassian.net/browse/EMI-5258), [EMI-5344](https://digitalcash.atlassian.net/browse/EMI-5344), [EMI-5444](https://digitalcash.atlassian.net/browse/EMI-5444), [EMI-5575](https://digitalcash.atlassian.net/browse/EMI-5575), [EMI-5745](https://digitalcash.atlassian.net/browse/EMI-5745), [EMI-5771](https://digitalcash.atlassian.net/browse/EMI-5771), [EMI-5803](https://digitalcash.atlassian.net/browse/EMI-5803)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-MO-001 | Failed transaction handling (EMI-5251) | 1. Simulate a failed transaction in the Multi-Omnibus module | Failed transaction is handled correctly; unit verification passes |
| TC-MO-002 | Incoming transaction processing (EMI-5258) | 1. Trigger incoming transaction via EOD job | Incoming transaction is processed and integrated with Multi-Omnibus module |
| TC-MO-003 | Fee matrix save and cache (EMI-5344) | 1. Update fee matrix values 2. Check Redis cache | Fee matrix updates are saved correctly and cached properly in Redis |
| TC-MO-004 | Transaction log metadata table (EMI-5444) | 1. Process a payment link transaction 2. Check metadata table | Metadata record created and linked to main transaction; auditability maintained; no sensitive data in logs |
| TC-MO-005 | Admin transaction log grouping (EMI-5745) | 1. Open admin transaction log view 2. Find related transactions | Transactions are grouped by batch transaction reference (Batch Txn Ref) |
| TC-MO-006 | Amount released after failed EOD (EMI-5771) | 1. Create bank transfer 2. Verify `reservedDebitBalance` includes amount 3. Run EOD with FAILED status | Amount is released back to user's `availableBalance` |
| TC-MO-007 | Correct error for insufficient funds (EMI-5803) | 1. Attempt bank transfer with `availableBalance: 1.85`, transaction: 1, commission: 7, VAT: 1.05 | Error shows "insufficient funds" (not `HOURLY_TRANSACTION_LIMITS_EXCEEDED`) |

---

## 10. Idempotency

**Related Task:** [EMI-5547](https://digitalcash.atlassian.net/browse/EMI-5547)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-IDP-001 | idempotencyKey header present on all APIs | 1. Initiate a payment flow 2. Capture API calls | `idempotencyKey` header is present on all listed mutation APIs |
| TC-IDP-002 | Same key reused within flow | 1. Start a top-up flow 2. Check all API calls in the flow (verify, update-status, etc.) | Same `idempotencyKey` is used across all related API calls |
| TC-IDP-003 | Unique key per flow initiation | 1. Start flow A 2. Start flow B | Each flow has a unique `idempotencyKey` |
| TC-IDP-004 | Key stored for flow duration | 1. Start a flow 2. Navigate through steps | Key persists for the duration of the flow |
| TC-IDP-005 | Duplicate request with same key | 1. Send same mutation request twice with same idempotencyKey | Second request does not create duplicate processing |

---

## 11. Roles, Groups & User Management

**Related Tasks:** [EMI-5582](https://digitalcash.atlassian.net/browse/EMI-5582), [EMI-5613](https://digitalcash.atlassian.net/browse/EMI-5613), [EMI-5693](https://digitalcash.atlassian.net/browse/EMI-5693), [EMI-5804](https://digitalcash.atlassian.net/browse/EMI-5804), [EMI-5815](https://digitalcash.atlassian.net/browse/EMI-5815), [EMI-5816](https://digitalcash.atlassian.net/browse/EMI-5816)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-ROLE-001 | Only related roles displayed (EMI-5582) | 1. Log in as business user 2. Navigate to Groups and Roles > Roles list | Only roles related to the user's context are displayed (not all roles) |
| TC-ROLE-002 | Edit roles and groups names (EMI-5613) | 1. Admin portal 2. Navigate to role/group 3. Edit name and description 4. Save | Name and description updated successfully |
| TC-ROLE-003 | Unlock admin staff (EMI-5693) | 1. Lock an admin staff 2. Click "Unlock" | Admin staff is unlocked successfully (no `ADMIN_USER_NOT_FOUND` error) |
| TC-ROLE-004 | Roles and privileges API returns data (EMI-5804) | 1. Call `/profile-service/api/v1/groups/roles/admin?page=0&size=10` | Returns expected roles and privileges data (not empty) |
| TC-ROLE-005 | Add new user — no 500 (EMI-5815) | 1. Business Portal > Manage Users > Add New User 2. Fill info 3. Submit | New user is created successfully (no 500 Internal Server Error) |
| TC-ROLE-006 | Edit user group — no 500 (EMI-5816) | 1. Admin Portal > Manage Admin Users 2. Select user 3. Edit user group 4. Save | User group is updated successfully (no 500 error) |

---

## 12. Bills Management

**Related Tasks:** [EMI-5647](https://digitalcash.atlassian.net/browse/EMI-5647), [EMI-5739](https://digitalcash.atlassian.net/browse/EMI-5739), [EMI-5776](https://digitalcash.atlassian.net/browse/EMI-5776), [EMI-5807](https://digitalcash.atlassian.net/browse/EMI-5807), [EMI-5809](https://digitalcash.atlassian.net/browse/EMI-5809), [EMI-5812](https://digitalcash.atlassian.net/browse/EMI-5812), [EMI-5813](https://digitalcash.atlassian.net/browse/EMI-5813)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-BILL-001 | VAT validation on Excel upload (EMI-5647) | 1. Upload Excel with VAT value other than 0% or 15% | Validation error returned; upload blocked |
| TC-BILL-002 | VAT valid values accepted | 1. Upload Excel with VAT = 0% 2. Upload Excel with VAT = 15% | Both uploads succeed |
| TC-BILL-003 | Customer can view bills with permission (EMI-5739) | 1. Log in as customer with bills permission 2. Navigate to bills | Bills are visible (no "You are not authorized" message) |
| TC-BILL-004 | Edit expired bill (EMI-5776) | 1. Log in as biller 2. Navigate to bills 3. Select expired bill 4. Edit details | Edit is allowed or a clear user-friendly error/message is shown (no raw 400 error) |
| TC-BILL-005 | Bills pagination (EMI-5807) | 1. Navigate to Bills page with many records 2. Click next page | Pagination works correctly; correct records displayed per page |
| TC-BILL-006 | Edit Single Bill (EMI-5809) | 1. Open a Single Bill 2. Click Edit 3. Modify a field 4. Submit | Bill is updated successfully (no 400 Bad Request) |
| TC-BILL-007 | Edit Detailed Bill (EMI-5809) | 1. Open a Detailed Bill 2. Click Edit 3. Modify a field 4. Submit | Bill is updated successfully |
| TC-BILL-008 | Bill summary auto-updates on VAT change (EMI-5812) | 1. Create Detailed Bill 2. Add item 3. Enable/disable VAT or change percentage | Bill Summary (VAT Amount, Grand Total) recalculates automatically without clicking "Apply Discount" |
| TC-BILL-009 | Excel upload & bill generation — no 500 (EMI-5813) | 1. Upload valid Excel file 2. Click Confirm | Bills are generated successfully (no 500 error) |

---

## 13. Business Registration & Onboarding

**Related Tasks:** [EMI-5748](https://digitalcash.atlassian.net/browse/EMI-5748), [EMI-5768](https://digitalcash.atlassian.net/browse/EMI-5768), [EMI-5777](https://digitalcash.atlassian.net/browse/EMI-5777), [EMI-5341](https://digitalcash.atlassian.net/browse/EMI-5341)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-REG-001 | Auto-approval on registration (EMI-5748) | 1. Complete business registration with all validations | Profile is automatically approved without manual admin step |
| TC-REG-002 | Auto-activation on registration (EMI-5748) | 1. Complete business registration | Profile is automatically activated and immediately available for operations |
| TC-REG-003 | Admin can still deactivate (EMI-5748) | 1. Auto-approved profile exists 2. Admin deactivates it | Profile is deactivated successfully |
| TC-REG-004 | Admin can still suspend (EMI-5748) | 1. Auto-approved profile exists 2. Admin suspends it | Profile is suspended successfully |
| TC-REG-005 | Fixed Merchant sign-up mode (EMI-5768) | 1. Start business registration (fixed Merchant mode enabled) | "Sign Up As" dropdown is hidden; static label "Signing up as Merchant" with supporting text is shown |
| TC-REG-006 | Merchant mode — no type change | 1. In fixed Merchant mode, try to change profile type | Profile type cannot be changed |
| TC-REG-007 | Activation email sent (EMI-5777) | 1. Register a new business user | Activation email with account access is sent to the user |

---

## 14. Wallet & QR Payments

**Related Tasks:** [EMI-5720](https://digitalcash.atlassian.net/browse/EMI-5720), [EMI-5755](https://digitalcash.atlassian.net/browse/EMI-5755)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-WAL-001 | QR wallet payment — no 500 (EMI-5720) | 1. Customer app 2. Open QR scanner 3. Scan wallet QR 4. Enter amount 5. Click Pay 6. Click Next from summary | Payment processes without 500 Internal Server Error |
| TC-WAL-002 | Create wallet payment — no 500 (EMI-5755) | 1. Customer app 2. Open QR payment 3. Scan code 4. Add value and complete | Wallet payment created successfully (no 500 error) |

---

## 15. Card Top-up

**Related Task:** [EMI-5549](https://digitalcash.atlassian.net/browse/EMI-5549)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-CARD-001 | Card top-up — no "Something went wrong" (EMI-5549) | 1. Customer app 2. Navigate to card modules 3. Create a top-up for the card | Top-up proceeds without "Something went wrong" error |
| TC-CARD-002 | Card top-up — successful flow | 1. Create card top-up 2. Complete OTP if required 3. Finish payment | Top-up completes successfully and balance is updated |

---

## 16. Security & UI

**Related Tasks:** [EMI-5762](https://digitalcash.atlassian.net/browse/EMI-5762), [EMI-5773](https://digitalcash.atlassian.net/browse/EMI-5773)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-SEC-001 | Screenshot prevention (EMI-5762) | 1. Open sensitive screen (wallet, payment, profile) 2. Take a screenshot | Content is obscured or prevented in screenshot |
| TC-SEC-002 | Screen recording detection (EMI-5762) | 1. Start screen recording 2. Open sensitive screen | Sensitive content is hidden while recording/mirroring is active |
| TC-SEC-003 | App switcher protection (EMI-5762) | 1. Open sensitive screen 2. Switch to app switcher | Sensitive content obscured in app switcher preview |
| TC-SEC-004 | Normal navigation unaffected (EMI-5762) | 1. Navigate through app with protection enabled | Normal app flows work correctly |
| TC-SEC-005 | "else" word not shown (EMI-5773) | 1. Open Android business app 2. Perform an action 3. Send app to background 4. Return to app | No unexpected "else" text appears; response is correct |

---

## 17. File Upload & Validation

**Related Task:** [EMI-5811](https://digitalcash.atlassian.net/browse/EMI-5811)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-FILE-001 | Arabic filename upload (EMI-5811) | 1. Try to attach a file with Arabic file name (e.g., "اي بان.pdf") | File attaches successfully (no `FILE_NAME_INVALID` error) |
| TC-FILE-002 | Special character filename upload | 1. Try to attach a file with special characters like `(` in the name | File attaches successfully |

---

## 18. Miscellaneous Bugs & Tasks

**Related Tasks:** [EMI-5795](https://digitalcash.atlassian.net/browse/EMI-5795), [EMI-5806](https://digitalcash.atlassian.net/browse/EMI-5806), [EMI-5801](https://digitalcash.atlassian.net/browse/EMI-5801)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-MISC-001 | Production bug fixes verified (EMI-5795) | 1. Review all hot fixes from the sprint 2. Test in testing environment | All fixes pass verification |
| TC-MISC-002 | Wallet Balance Limits update button (EMI-5806) | 1. Open Wallet Balance Limits form 2. Fill in the form | Update button becomes active/enabled after filling in the form |
| TC-MISC-003 | Admin reports download — no 500 (EMI-5801) | 1. Open any admin report 2. Click download | Report downloads successfully (no 500 error) |

---

## 19. Architecture & Studies

**Related Tasks:** [EMI-5341](https://digitalcash.atlassian.net/browse/EMI-5341), [EMI-5419](https://digitalcash.atlassian.net/browse/EMI-5419), [EMI-5746](https://digitalcash.atlassian.net/browse/EMI-5746)

| TC ID | Title | Steps | Expected Result |
|-------|-------|-------|-----------------|
| TC-STUDY-001 | Architecture changes documented (EMI-5341) | 1. Review architecture change document | Current vs required architecture differences are documented |
| TC-STUDY-002 | MOZN integration plan (EMI-5419) | 1. Review MOZN API documentation review 2. Check technical integration plan | API endpoints, authentication, required data points, and events documented |
| TC-STUDY-003 | POS Product Analysis (EMI-5746) | 1. Review POS product analysis output | Analysis is complete and documented |

---

**Total Test Cases: 163**
**Total Sprint 71 Tasks Covered: 91**
