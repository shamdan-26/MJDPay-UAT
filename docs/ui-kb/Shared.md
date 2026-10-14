# Shared - UI logic

Page objects and components used by more than one module: the authenticated app shell (sidebar, header, profile menu), the Dashboard helper, the OTP widget, language and theme controls, the toast and confirmation modals, and two Admin Portal page objects.
Locators: [Shared.generated.md](Shared.generated.md) (11 page objects). `LoginPage` is described in Login.md, `HomepageSidebarPage` / `HomepageQuickActionsPage` / `HomePage` in Homepage.md, `BankTransferPage` and `TransactionsPage` are listed below only as shared helpers.

| Item | Value | Source |
|---|---|---|
| Merchant portal | `/business/...` (BASE_URL `https://dev-emi.dg-cash.app`) | Login/LoginHelper.ts:6 |
| Admin portal | `/admin/...`: login `/admin/auth/login`, OTP config `/admin/main/configuration/otp`, limits `/admin/main/limitations-management/wallet-limitations` | pageElements/Shared/AdminOtpConfigPage.ts:30-33; AdminLimitsApi.ts |
| Gateway | `https://gateway-dev-emi.dg-cash.app` | Login/helpers/loginApi.ts:7 |
| Who can see it | App shell: every signed-in Business user. Admin pages: admin accounts only (a separate SPA with its own login and OTP) | AdminOtpConfigPage.ts:5-9 |
| Shared component testids | Toast, confirmation modal, OTP modal, amount field, floating inputs (see Business rules) | QA-DATA-TESTID-HANDOFF.md section 3 |
| Default language and theme | Arabic and dark mode by default on dev/UAT | LoginPage.spec.ts LG-PAGE-03; DashboardPage.ts:64-70 |

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| App shell | all `/business/main/*` | Sidebar `#sideNav-sidenav`: `sidebarLogo` / `logos`, `collapseButton`, `sectionLabels`, nav entries (see list below), `userSettingsButton`, `logoutButton`, `brandName` | Left (mirrored in RTL) | Navigation, company identity, sign out |
| App shell | same | Top bar: `mobileMenuToggle`, `topNavTitle` / `headerTitle` (`#header-page-title`), `notificationsBell`/`notificationsIcon`, `profileAvatar` / `profileTrigger` (`#ddl_profile`) | Top | Page title, notifications, profile menu |
| Profile dropdown | same | `profileMenuInitials`, `profileMenuCompanyName`, `profileMenuEmail`, `profileMenuPhone`, `settingsMenuItem`, `profileMenuItem`, `notificationsToggle`, `darkModeToggle`, `languageSelector`, `walletConfigurationMenuItem`/`walletSetupLink`, `faqsMenuItem`, `logoutItem` | Dropdown under avatar | Account menu |
| Logout confirmation | modal | `proceedButton` (`modal-submit-btn`) | Centre modal | Confirm sign out |
| Language switch confirmation | modal | `switchLanguageConfirmButton` (`switch-language-submit-btn`), cancel `switch-language-cancel-btn` | Centre modal | Confirm language reload |
| Dashboard widgets | `/business/main/home` | `walletBalanceSar`, `lastTransactionsContainer`, `lastLoginText` | Home content | Used by Login and Homepage specs |
| OTP step / modal | Login (full screen); Forgot password, Bill payment (modal `div.my-modal-container`); Bank, W2W, Top-up (inline widget) | `OtpPage` heading, boxes, countdown, buttons | Centre | Second factor |
| Admin login | `/admin/auth/login` | `usernameInput`, `passwordInput`, `loginButton`, `accountLockedNotice`, `unlockAccountLink`, then a 6-box OTP step | Centre | Sign in to admin SPA |
| Admin OTP configuration | `/admin/main/configuration/otp` | `functionOtpTab`, `firstRowOptionsButton`, `editOperationsMenuItem`, `operationsModal` | Content | Which OTP setting each operation uses |
| Admin Manage Limits | `/admin/main/limitations-management/wallet-limitations` | Wallet balance, Transaction and Count limits (driven by API, UI only opened so the SPA sends an authenticated request) | Content | Limit configuration |
| Transactions list | `/business/main/transactions` | `lastTransactionRow` and cells (`datatable-body-cell` 3 = amount, 5 = status, 6 = view more) | Content | Used to read the latest transaction |
| Bank transfer page | Bank transfer flow | Hero (`pageTitle`, `pageSubtitle`), balance card, amount field, IBAN card, summary, OTP recap | Content | Shared by BankTransfer specs |

### App shell navigation (by id, `AppShellPage`)

| Entry | Element name | Id |
|---|---|---|
| Home | `homeLink` | `sideNav-menu-item-0` |
| Transactions | `transactionsLink` | `sideNav-menu-item-1` |
| Topup | `topupLink` | `sideNav-menu-item-2` |
| Transfer panel > Withdraw / Wallet transfer / International transfer | `transferPanel`, `withdrawLink`, `walletTransferLink`, `internationalTransferItem` | `sideNav-expansion-panel-link-3`, `sideNav-child-menu-item-3-0`, `-3-1`, `-3-2` |
| Bills | `billsLink` | `sideNav-menu-item-4` |
| Payment links | `paymentLinksLink` | `sideNav-menu-item-5` |
| Sub-wallets | `subWalletsLink` | `sideNav-menu-item-6` |
| SADAD | `sadadItem` | `sideNav-menu-item-7` |
| Account management panel > Users / Beneficiaries | `accountManagementPanel`, `userManagementLink`, `beneficiaryLink` | `sideNav-expansion-panel-link-8`, `sideNav-child-menu-item-8-0`, `-8-1` |
| Invoice items | `invoiceItemsLink` | `sideNav-menu-item-9` |
| Products | `productsLink` | `sideNav-menu-item-10` |
| Groups and roles | `groupsRolesLink` | `sideNav-menu-item-11` |
| Card management | `cardManagementLink` | `sideNav-menu-item-12` |

Source: pageElements/Shared/AppShellPage.ts:78-95. Section labels (AR): "الأموال", "إدارة", "المنتجات".

## Forms

### OTP widget (`OtpPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Code boxes | `inputs` (role textbox "One time password input", or `div.my-modal-container input`) | single-digit boxes | Yes | Digits only; auto-advance; paste fills all; Backspace on empty box goes back. Forgot-password modal has 6 boxes. Login box count not asserted | `errorMessage` (text "invalid otp / please try again" or `.mp-otp-error`, `[role=alert]`) | Always |
| Countdown | `countdownTimer` ("Code ends in MM:SS" / "ينتهي الرمز" / "تنتهي صلاحية الرمز") | text | - | `getRemainingSeconds()` parses MM:SS | - | - |
| Verify / Confirm | `verifyButton` (`otp-submit-btn`, or flow-specific `w2w-otp-verify-btn`, `bank-amount-otp-verify-btn`, `bank-confirm-otp-verify-btn`, `topup-otp-verify-btn`) | button | - | Disabled until all digits entered; most widgets auto-submit on the last digit; label "Verify" on Login, "Confirm" on Forgot password | - | All boxes filled |
| Resend | `resendButton` (`otp-resend-btn` and flow variants) | button | - | Disabled during countdown; clears boxes when used | - | Countdown ended |
| Cancel | `cancelButton` (`otp-cancel-btn` and flow variants) | button | - | Closes the dialog or returns to the previous step | - | Always |
| Close (x) | `closeButton` | button | - | Only on the modal variant | - | Always |

Sources: pageElements/Shared/OtpPage.ts; QA-DATA-TESTID-HANDOFF.md section 3 (note: inline OTP in W2W/Bank is a different widget; its boxes have no testid).

### Admin login (`AdminOtpConfigPage`)

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Mobile / username | `usernameInput` | text | Yes | Admin mobile with +966 | - | Location permission granted |
| Password | `passwordInput` | password | Yes | - | - | Same |
| Log in | `loginButton` | button | - | Then a 6-box OTP step; gateway answers 423 when the account is locked | `accountLockedNotice` ("account locked" / "Unlock Account") with `unlockAccountLink` | Fields filled |

Note: the admin SPA shows a blocking `app-permission-overlay` until geolocation is granted (Riyadh in tests). Source: AdminOtpConfigPage.ts:58-66, 165-200.

## Tables and lists

| List | Columns / items | Behaviour | Source |
|---|---|---|---|
| Admin OTP configuration list | Rows of OTP settings; per-row menu `#otp-configurations-list-row-options-button` with "Edit Operations" | Opens the "All Operations" modal (`#operations-modal-container`) listing operation checkboxes (`#operations-modal-operation-checkbox-<n>`, name field `#input_type_text_name_standalone_<CODE>`) | AdminOtpConfigPage.ts:13-22 |
| Locked operation checkbox | Checked, disabled, class `disabled-checkbox` | Admin cannot detach it | AdminOtpConfigPage.ts `expectOperationLockedOn` |
| Admin limits | Transaction limit rows (type x risk level x platform): min, HOUR/DAY/MONTH/YEAR max amount; Count limits per period; Wallet min/max balance | Read and written through the gateway API | AdminLimitsApi.ts header |
| Transactions list (shared) | Row cells: amount (3), status (5), view more (6) | First row is the latest transaction; "View more" opens details with "batch Transaction Reference" | TransactionsPage.ts:15-19 |
| Profile dropdown | See Pages and sections | Closed with `closeProfileMenu()` so it does not leak into the next test | AppShellPage.ts:140 |

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `collapseButton` (`#sideNav-toggle-button`) | Sidebar | Collapses or expands the sidebar | Always | Same page |
| `mobileMenuToggle` (`#header-menu-toggle`) | Top bar | Opens the sidebar on small screens | Small viewport | Same page |
| `profileTrigger` / `profileAvatar` (`#ddl_profile`) | Top bar | Toggles the profile dropdown (`openProfileMenu` only clicks if closed) | Always | Dropdown |
| `languageSelector` > `englishToggle` (`lang-en`) / `arabicToggle` (`lang-ar`) | Profile menu or auth header | Switches language | Always | Confirm modal may appear; page reloads in the new language |
| `switchLanguageConfirmButton` | Language modal | Confirms the switch (typed form input is lost) | Modal open | Reload |
| `darkModeToggle` | Profile menu | Switches theme | Always | Same page |
| Header `themeToggle` ("Switch theme") | Auth pages | Switches light/dark; persists after reload | Always | Same page |
| `notificationsToggle` | Profile menu | Turns notifications on or off | Always | Same page |
| `walletConfigurationMenuItem` ("Wallet Configuration" / "تهيئة المحفظة") | Profile menu | Opens wallet setup | Always | Wallet setup page |
| `faqsMenuItem` | Profile menu | Opens FAQs | Always | FAQs page |
| `logoutItem` (`#btn_profile_logout`) / sidebar `logoutButton` (`#logout`) | Profile menu / sidebar | Opens logout confirmation | Always | `proceedButton` then `/business/auth/login` |
| `accountWidgetSignOutButton` | Sidebar | Same sign-out | Always | Same |
| `expandPanel(panel)` | Sidebar | Opens "Transfer" or "Account Management" so hidden child links show | Always | Child links visible |
| `operationsModalCloseIcon` | Admin modal | Closes the operations modal | Modal open | List |

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Arabic (default) | `html dir=rtl lang=ar`; sidebar on the right; all locators are bilingual | LoginLocalization.spec.ts; HomepageQuickActionsPage.ts:22 |
| Theme dark (default) | Only the logo variant for the active theme is rendered (the other is `display:none`) | DashboardPage.ts:64-70 |
| Language switch with typed input | Warning "Changing the language will reload the page..." with keep-editing and change buttons | Login/functional/05-first-login/FirstLoginUi.spec.ts LG-FIRST-19, 21 |
| Profile menu open | `logoutItem` visible; menu is a toggle, a second click closes it | DashboardPage.ts:166-172 |
| Duplicate ids | `userSettings-image-container` (sidebar button and dropdown div) and `toggle-button-input` (two switches) are duplicated, so locators are scoped or positional | AppShellPage.ts:98, 115 |
| OTP widget variants | Full-screen (Login), modal (Forgot password, Bill payment), inline (W2W, Bank, Top-up, with its own testids) | OtpPage.ts:24-50 |
| OTP auto-submit | Last digit triggers the request; button goes disabled and loading; explicit click only for Login and Forgot password | OtpPage.ts `verify()` |
| Dev OTP | Fixed `918512` accepted for every account; admin OTP also `918512` (6 boxes) | testAccounts.json; AdminOtpConfigPage.ts:36-41 |
| Admin location not granted | Blocking permission overlay hides the form | AdminOtpConfigPage.ts:58-66 |
| Admin SPA blank bootstrap | One hard refresh recovers it | AdminOtpConfigPage.ts `login` comments |
| Admin account locked | Gateway 423, locked notice with "Unlock Account" | AdminOtpConfigPage.ts:104-105 |
| Toast appears | Detail text in `toast-message`; `waitForToastClear` waits up to 3 s to appear and 8 s to disappear | toastMessages.ts |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Naming | `data-testid="<feature>-<element>-<type>"`, kebab-case, English, stable | QA-DATA-TESTID-HANDOFF.md section 2 |
| Toast | `toast`, `toast-message`, `toast-close-btn` | Handoff section 3 |
| Confirmation modal | `<prefix>-submit-btn`, `<prefix>-cancel-btn`; default prefix `modal`; close `modal-close-btn` | Handoff section 3 |
| OTP modal | `otp-input` (wrapper only), `otp-submit-btn`, `otp-cancel-btn`, `otp-resend-btn` | Handoff section 3 |
| Amount field | `amount-input`, `amount-chip-<value>` (500, 1000, 2000, 5000, 10000), `amount-full-balance-toggle` | Handoff section 3 |
| Floating inputs | `<testId>`, `<testId>-toggle-visibility`, `<testId>-clear-btn`; fall back to stable `id`, never the label | Handoff section 3 |
| Language | `lang-en`, `lang-ar`, `switch-language-submit-btn`, `switch-language-cancel-btn` | Handoff section 4.2 |
| Mandated OTP operations are locked on | LOGIN, registration, FORGET_PASSWORD, ADD_BENEFICIARY, transaction-topup, transaction-bill-payment, bank-transfer, WalletPayment, OTC-Transaction, CardTransactions: checkbox checked and disabled in the default OTP setting. ACTIVATE_EMAIL, PHYSICAL_CARD, UnlockAdminAccountviaEmail are not locked and not tested | OtpAdminConfig/OtpAdminConfig.spec.ts:18-30 |
| Limits model | Min top-up amount is the `min` of the Transaction limit row (type x risk x platform); periods are HOUR/DAY/MONTH/YEAR; no per-transaction max; never choose "ALL" risk or platform (warning modal) | AdminLimitsApi.ts header |
| Write = read URL with PUT | `GET|PUT /api/v1/limitations/admin-wallet-limitations`, `.../transaction-limitations`, `.../transaction-count-limitations` | AdminLimitsApi.ts header |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| OTP heading and text | "Enter OTP" / "أدخل رمز التحقق"; "A code has been sent to you" / "تم إرسال رمز التحقق"; forgot-password modal text mentions the Change Password Process | OTP widget |
| OTP countdown | "Code ends in MM:SS"; AR "ينتهي الرمز" / "تنتهي صلاحية الرمز خلال MM:SS" | OTP widget |
| Resend | "Click to resend" / "انقر لإعادة الإرسال"; "Didn't Receive Code?" | OTP widget |
| Wrong OTP | "Invalid OTP. Please try again." (EMI-TC-3125); AR "رمز التحقق غير صحيح", "حاول مرة أخرى" | OTP widget |
| Language switch | AR "تغيير اللغة سيعيد تحميل الصفحة، لذا ستفقد ما أدخلته في هذه الصفحة. هل تريد المتابعة؟" buttons "متابعة التعديل" / "تغيير" | Confirm modal |
| Logout | "Proceed" / "متابعة" | Confirm modal |
| Profile menu labels | AR "الإعدادات", "الملف الشخصي", "تهيئة المحفظة", "تسجيل الخروج"; EN "Settings", "Profile", "Wallet Setup/Configuration", "Logout", "FAQs" | Dropdown |
| Language options | "ENG" and "العربية" | Language picker |
| Admin locked account | "account ... locked" / "Unlock Account" | Admin login |
| Session expired | "Session expired. Please log in again." (HTTP 498) | Toast on login page |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Admin sign-in | Admin SPA login, then OTP | 423 when locked; OTP `918512` (6 boxes) |
| Admin OTP config | Admin SPA calls behind `/admin/main/configuration/otp` | Paths not recorded |
| Limits read/write | `GET|PUT /api/v1/limitations/admin-wallet-limitations`, `/transaction-limitations`, `/transaction-count-limitations` | Request headers are relayed from an authenticated SPA request; lookups `/api/v1/transaction-types`, `/risk-levels`, `/platform-type`, `/wallet-types`. PUT body field names are inferred from the SPA form (unverified) |
| OTP settings | `GET /otp/otp-settings/q?operationCode=<OP>` | Used by Login, Registration (`REGISTRATION`), Forgot password (`FORGET_PASSWORD`) |
| Shared OTP verify | Per flow: `/auth/verify/otp` (Login), `/emi-profile/api/v1/register/verify/otp` (Registration) | See each module |
| Bank transfer card/summary | Not recorded | `BankTransferPage` reads UI text only |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Home dashboard, Sub-wallets, Transactions, Settings, Profile, Notifications have no testids yet | QA-DATA-TESTID-HANDOFF.md section 5 |
| Admin portal is not in the testid handoff; locators are page-authored ids read from the live DOM (2026-09-09) | AdminOtpConfigPage.ts:19-21 |
| Duplicate ids in the app shell (`userSettings-image-container`, `toggle-button-input`) | AppShellPage.ts:98, 115 |
| Login OTP boxes have no testid; `otp-input` wrapper cannot be used per box | OtpPage.ts:21-29 |
| `HomePage.ts` keeps Java-era positional XPath and guessed locators | pageElements/Shared/HomePage.ts |
| `TransactionsPage` uses positional XPath on `datatable-row-wrapper[1]` and cell index | TransactionsPage.ts:15-19 |
| `AdminLimitsApi` PUT body and GET envelope never verified against a real write | AdminLimitsApi.ts header |
| Admin default credentials live in source (`ADMIN_MOBILE`, `ADMIN_PASSWORD`) as env fallbacks | AdminOtpConfigPage.ts:34-35 (values intentionally not copied here) |
| Admin SPA blank bootstrap on dev needs a reload | AdminOtpConfigPage.ts `login` |
| Admin account can be locked by repeated bad logins | AdminOtpConfigPage.ts:104-105 |

## Open questions

| Question | Why open |
|---|---|
| Login OTP box count (6 or 8) | Comment says 8-digit, other specs say 6; not asserted |
| Where Wallet Configuration, FAQs and Profile lead, and what they contain | No spec visits them |
| Is `sideNav-menu-item-9` "invoice items" or "Manage Products"? | AppShellPage and HomepageSidebarPage names differ |
| Admin OTP configuration endpoints | Only UI ids are recorded |
| What the notifications bell opens and its empty state | Only the panel heading is asserted |
| Do all roles see the same sidebar entries? | Not documented |
| Exact admin pages beyond OTP configuration and Manage Limits that Shared covers | Only these two page objects exist in Shared |
