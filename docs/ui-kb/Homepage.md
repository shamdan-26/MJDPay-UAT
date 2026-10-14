# Homepage - UI logic

Post-login dashboard of the Business portal: greeting, wallet balance card, quick actions, bills overview, sub-wallets panel, last transactions, header (notifications, profile menu) and the app sidebar.
Locators: [Homepage.generated.md](Homepage.generated.md) (6 page objects) plus the shared ones in [Shared.generated.md](Shared.generated.md) (`DashboardPage`, `HomepageSidebarPage`, `HomepageQuickActionsPage`, `AppShellPage`, `HomePage`). Sidebar, profile menu and logout are described in more detail in Shared.md.

| Item | Value | Source |
|---|---|---|
| Route | `/business/main/home` | Homepage/HomePageHelper.ts:15; manual HP-01 |
| Page title | `EMI - Business` | manual-test-cases/HomePage.md HP-02 |
| Who can see it | Any signed-in Business user. Items such as Manage Accounts, Groups & Roles, Card Management appear in the sidebar; per-role visibility is not documented | manual HP-65 to HP-68 |
| Unauthenticated visit | Redirects to `/business/auth/login` (spec asserts it; one earlier note says dev did not enforce it reliably) | functional/HomepageSession.spec.ts:19-23; project memory homepage_split_and_speed |
| Default language | Arabic on dev/UAT; sidebar, quick actions and menu text are matched in both languages | pageElements/Shared/HomepageQuickActionsPage.ts:22 |
| Test accounts | ACCOUNT_1 (has transaction history), ACCOUNT_2 (T9446, no history by design); one account per worker, sessions restored from `playwright/.auth/homepage-account<N>.json` | HomePageHelper.ts:46-81; project memory homepage_test_accounts |

## Pages and sections

| Page/step | URL | Section | Where on screen | Purpose |
|---|---|---|---|---|
| Home | `/business/main/home` | Page heading `pageHeading` (`#header-page-title`, text "Home") | Top bar | Page title |
| Home | same | Greeting: `greetingText` ("Good morning / afternoon / evening"), `greetingSubtitle` ("...happening with your wallet today"), `lastLoginText` (`section.mp-greet .meta`) | Top of content | Welcome and last login time |
| Home | same | Balance card: `currentBalanceLabel`, `balanceAmountText` (`#balance-amount`), `balanceVisibilityToggle`, `walletQrButton`, `walletSettingsButton`, `walletBalanceSar` (`#balance-container`) | Below greeting | Wallet balance and wallet shortcuts |
| Home | same | Quick actions: `quickActionsHeading`, `quickActionsSubtitle`, 4 cards | Content | Shortcuts to Topup, Wallet transfer, Cashout, Receive payment |
| Home | same | Bills overview: `billsOverviewHeading`, `billsChartToggle`, `billsCardsToggle`, `billsPaidLabel`, `billsUnpaidLabel`, `billsViewAllLink` | Content | Paid vs unpaid bills |
| Home | same | Sub-wallets panel: `subWalletsHeading`, `subWalletsManageLink`, `subWalletsEmptyMessage` | Content (side panel) | Sub-wallet list or empty state |
| Home | same | Last transactions (`lastTransactionsContainer`): `transactionHeaderCells`, `transactionRows`, `transactionTotalText`, `transactionViewAllLink`, empty state | Content | Latest 10 transactions |
| Header | all pages | `notificationsIcon` / `notificationsBell`, `notificationsPanel`, `notificationsHeading`, `profileTrigger` (`#ddl_profile`) | Top bar | Notifications and profile menu |
| Profile menu | all pages | Initials, company name, email, phone, Settings heading, Profile, notifications toggle, dark-mode toggle, language, wallet configuration/setup, FAQs, Logout | Dropdown under avatar | Account settings and logout |
| Sidebar | all pages | `#sideNav-sidenav`: logo, collapse button, section labels (Money, Manage, Products), links, brand name, avatar, sign out | Left (right in RTL) | Navigation |

## Forms

The Homepage has no data-entry forms. The only controls that behave like fields are two toggles in the profile menu.

| Field | Element name | Type | Required | Rules/validation | Error message | Enabled when |
|---|---|---|---|---|---|---|
| Notifications switch | `notificationsToggle` (`#userSettings-notifications-toggle`) | toggle | No | Wrapper is clicked, not the hidden checkbox | - | Profile menu open |
| Dark mode switch | `darkModeToggle` (`#userSettings-dark-mode-toggle`) | toggle | No | Dark mode is on by default on dev/UAT | - | Profile menu open |
| Language | `languageButton` (`userSettings-language-button`), picker options "ENG" and "العربية" | picker | No | Opens a picker; a confirm modal can appear (`switch-language-submit-btn`) | - | Profile menu open |

Sources: pageElements/Shared/AppShellPage.ts:113-121; pageElements/Shared/DashboardPage.ts:136-145, 93-98.

## Tables and lists

### Last transactions (`#last-transactions-container`, ngx-datatable)

| Item | Detail | Source |
|---|---|---|
| Columns | Header cells (`transactionHeaderCells`) must mention transaction, amount, date, status; exact column list not recorded | ui/HomepageTransactionsPage.spec.ts |
| Rows | `transactionRows` (`datatable-body-row`); at most 10 | ui/HomepageTransactionsPage.spec.ts |
| Total | `transactionTotalText` shows "N total" | HomepageTransactionsPage.ts:21 |
| Sorting / filters / paging | None on the widget; "View All" opens the full list | manual HP-51 |
| View all | `transactionViewAllLink` (`<span id="view_all_transactions">`, not an anchor) goes to `/business/main/transactions` | functional/HomepageTransactions.spec.ts:30; project memory |
| Empty state | `transactionsEmptyState` (`#last-transactions-empty`): title "No transactions yet" (`.hc-lt-empty__ttl`), description "...once money moves through your wallet" (`.hc-lt-empty__desc`); no total, no View All | functional/HomepageTransactionsEmptyState.spec.ts:27-29; manual HP-52 to HP-55 |
| Row actions | None on the homepage | - |

### Bills overview

| Item | Detail | Source |
|---|---|---|
| View modes | `billsChartToggle` ("Chart") and `billsCardsToggle` ("Cards"); switching stays on Home | functional/HomepageBillsSection.spec.ts |
| Categories | "Paid" and "Unpaid" labels; zero shows 0 | functional/HomepageNegative.spec.ts:96 |
| View all | `billsViewAllLink` (`button.mp-bills__more`) goes to a URL containing `bills` | HomepageBillsSection.spec.ts:33 |

### Sub-wallets panel

| Item | Detail | Source |
|---|---|---|
| Content | Heading and Manage link; list rows not covered by specs | ui/HomepageSubWalletsPage.spec.ts |
| Empty state | "No sub-wallets yet" (`subWalletsEmptyMessage`) | HomepageSubWalletsPage.ts:15 |
| Manage | `subWalletsManageLink` (`button.mp-panel-more`) goes to a URL matching `sub-wallets` | functional/HomepageSubWallets.spec.ts:19 |

### Sidebar entries

| Entry | Element name | Id | Target | Source |
|---|---|---|---|---|
| Home | `homeLink` / `Home_NavButton` | `sideNav-menu-item-0` | `/business/main/home`, marked active | AppShellPage.ts:78; manual HP-57 |
| Transactions | `transactionsLink` | `sideNav-menu-item-1` | `/business/main/transactions` | functional/HomepageSidebarNavigation.spec.ts:22 |
| Topup | `topupLink` | `sideNav-menu-item-2` | URL contains `top-up` | HomepageSidebarNavigation.spec.ts:42 |
| Transfer (panel) | `transferPanel` | `sideNav-expansion-panel-link-3` | Expands: Cashout (`withdrawLink`, `...-3-0`), Wallet Transfer (`walletTransferLink`, `...-3-1`), International Transfer (`internationalTransferItem`, `...-3-2`, "Soon", inert) | HomepageSidebarNavigation.spec.ts; manual HP-73 to HP-76 |
| Bills | `billsLink` | `sideNav-menu-item-4` | URL contains `bills` | HomepageSidebarNavigation.spec.ts:64 |
| Payment Links | `paymentLinksLink` | `sideNav-menu-item-5` | URL contains `payment-links` | :69 |
| Sub-Wallets | `subWalletsLink` | `sideNav-menu-item-6` | URL contains `sub-wallets` | :74 |
| SADAD | `sadadItem` | `sideNav-menu-item-7` | "Soon", inert (stays on Home) | manual HP-64, HP-80 |
| Manage Accounts (panel) | `accountManagementPanel` | `sideNav-expansion-panel-link-8` | Expands: Manage Users (`...-8-0`, URL contains `users`), Manage Beneficiary (`...-8-1`, `beneficiar`) | :92, :98 |
| Manage Products | `invoiceItemsLink` (id 9) / `productsLink` (id 10) | `sideNav-menu-item-9` / `-10` | `products-management` | :103 |
| Groups & Roles | `groupsRolesLink` | `sideNav-menu-item-11` | URL contains `group` or `role` | :108 |
| Card Management | `cardManagementLink` | `sideNav-menu-item-12` | URL contains `card` | :113 |

Note: AppShellPage maps id 9 to "invoice items" and id 10 to "products", while `HomepageSidebarPage.manageProductsLink` matches "Manage Products / بنود الفاتورة" (invoice items text). See gaps.

## Buttons, links and actions

| Element | Where | What it does | Enabled/visible when | Result/next screen |
|---|---|---|---|---|
| `balanceVisibilityToggle` (`#balance-visibility-button`) | Balance card | Hides or shows the balance; hidden value must not show the raw number | Always | Same page; `balanceAmountText` changes then restores |
| `walletQrButton` (`#balance-generate-qr-text`) | Balance card | Opens wallet QR | Always | `/business/main/home/wallet-links` |
| `walletSettingsButton` | Balance card | Opens wallet settings | Always | Leaves Home (URL not asserted) |
| `quickActionTopupCard` ("Add money via card") | Quick actions | Opens Topup | Always | URL contains `top-up` |
| `quickActionWalletTransferCard` ("Send to another wallet") | Quick actions | Opens transfer | Always | A dialog or a URL containing `transfer` |
| `quickActionCashoutCard` ("Send to any Saudi IBAN") | Quick actions | Opens cashout | Always | A dialog or a URL matching `cashout` or `transfer` |
| `quickActionReceivePaymentCard` ("Generate a wallet QR") | Quick actions | Opens the QR | Always | A dialog or navigation away from Home |
| `billsChartToggle` / `billsCardsToggle` | Bills overview | Switches view | Always | Same page |
| `billsViewAllLink` | Bills overview | Opens bills | Always | Bills page |
| `subWalletsManageLink` | Sub-wallets panel | Opens sub-wallet management | Always | Sub-wallets page |
| `transactionViewAllLink` | Last transactions | Opens full list | Only when there are transactions | `/business/main/transactions` |
| `notificationsIcon` | Header | Toggles the notifications panel (second click closes) | Always | Panel with heading "Notifications" |
| `profileTrigger` (`#ddl_profile`) | Header | Toggles the profile menu | Always | Dropdown |
| `logoutItem` (`#btn_profile_logout`) / sidebar `logoutButton` (`#logout`) | Profile menu / sidebar | Opens the logout confirmation | Always | Modal with `proceedButton` (`modal-submit-btn`, "Proceed/متابعة") |
| `proceedButton` | Logout modal | Confirms logout | Modal open | `/business/auth/login`; home not reachable again |
| `collapseButton` (`#sideNav-toggle-button`), `mobileMenuToggle` (`#header-menu-toggle`) | Sidebar / header | Collapse sidebar or open it on small screens | Always | Same page |
| `logoLink` (sidebar logo `#sideNav-logo`) | Sidebar | Stays in the app (redirects within the domain) | Always | App URL |

Sources: functional/HomepageBalanceCard.spec.ts; HomepageQuickActions.spec.ts; HomepageNotifications.spec.ts; HomepageLogout.spec.ts; HomepageLogo.spec.ts.

## Conditions and states

| Condition | Effect on UI | Source |
|---|---|---|
| Account with transactions | Last-transactions table with up to 10 rows, total text and View All | ui/HomepageTransactionsPage.spec.ts |
| Account without transactions (ACCOUNT_2) | Empty state shown; no total count, no View All | HomepageTransactionsEmptyState.spec.ts |
| Balance hidden | `#balance-amount` text changes (masked); not a plain 2+ digit number | HomepageSecurity.spec.ts:43; HomepageBalanceCard.spec.ts |
| Balance shown again | Original text restored | HomepageBalanceCard.spec.ts:23-33 |
| No sub-wallets | Empty message visible | functional/HomepageNegative.spec.ts |
| No paid or unpaid bills | Labels still shown with 0 | HomepageNegative.spec.ts:90-100 |
| Transactions, bills, sub-wallet or wallet API returns 503 | Page stays on Home, widget container/heading still visible, sidebar intact | HomepageNegative.spec.ts:33-72, 104-112 |
| Widgets return empty data | Greeting still shown, no navigation away | HomepageNegative.spec.ts:73-85 |
| Page refresh | Stays on `/business/main/home` | HomepageSession.spec.ts:15-17 |
| Time of day | Greeting reads Good morning / afternoon / evening | HomepageGreetingPage.ts:14 |
| Sidebar item marked "Soon" (SADAD, International Transfer) | Visible, no navigation on click | manual HP-64, HP-75, HP-76, HP-80 |
| Dev/UAT default | Dark mode on by default; only the logo variant matching the theme is rendered | DashboardPage.ts:64-70 |
| Sidebar `userSettings-image-container` id is duplicated (sidebar button and dropdown div) | Locators are scoped to the sidebar | AppShellPage.ts:98 |
| Both profile switches share id `toggle-button-input` | Addressed by position (notifications first, dark mode second) | AppShellPage.ts:115-116 |
| Language switch | Confirm modal may appear (`switch-language-submit-btn`, `switch-language-cancel-btn`) | QA-DATA-TESTID-HANDOFF.md section 4.2 |

## Business rules

| Rule | Detail | Source |
|---|---|---|
| Landing | A successful login lands on `/business/main/home` | LG-79 (Login/functional/04-session/LoginHappyPath.spec.ts) |
| Last transactions limit | At most 10 rows | manual HP-48 |
| Hidden balance privacy | Raw balance must not leak when hidden | manual HP-20 |
| No secrets in the page | No password, token, secret, API key in URL, no Bearer token in HTML, no sensitive query parameters | HomepageSecurity.spec.ts; manual HP-97 to HP-99 |
| No raw i18n keys, no unhandled JS errors on load | Quality checks | manual HP-100, HP-101 |
| Logout needs confirmation | Profile menu or sidebar Sign out opens a confirmation modal | HomepageLogout.spec.ts |
| Session ends on logout | Home cannot be reached again without login | manual HP-88 |

## Messages

| Trigger | Message (EN/AR if known) | Where shown |
|---|---|---|
| Page heading | "Home" | `pageHeading` |
| Greeting | "Good morning / afternoon / evening"; subtitle "...happening with your wallet today" | Greeting section |
| Balance label | "Current Balance" | `currentBalanceLabel` |
| Quick actions | EN "Quick actions" / "Shortcuts to common tasks"; AR "إجراءات سريعة" / "اختصار للمهام الشائعة" | Quick actions |
| Quick action cards | "Add money via card" / "إضافة أموال عبر بطاقة"; "Send to another wallet" / "الإرسال إلى محفظة أخرى"; "Send to any Saudi IBAN" / "الإرسال إلى أي آيبان سعودي"; "Generate a wallet QR" / "إنشاء رمز QR للمحفظة" | Cards |
| Bills labels | "Bills overview", "Chart", "Cards", "Paid", "Unpaid", "View All" | Bills overview |
| Sub-wallets empty | "No sub-wallets yet" | Panel |
| Transactions empty | "No transactions yet"; description mentions money moving through the wallet | Empty state |
| Transactions total | "N total" | Below table |
| Notifications | Heading "Notifications" | Notifications panel |
| Profile menu | AR "الإعدادات", "الملف الشخصي", "تهيئة المحفظة", "تسجيل الخروج"; EN "Settings", "Profile", "Wallet Setup", "Logout" | Dropdown |
| Sidebar sections | AR "الأموال", "إدارة", "المنتجات"; EN "Money", "Manage" | Sidebar |
| Sidebar "Soon" tag | "Soon" on SADAD and International Transfer | Sidebar |

## Backend/API touchpoints

| UI action | Endpoint | Notes |
|---|---|---|
| Home load: transactions | URL matching `**/transactions**` | Mocked as 503 in failure tests; real path not recorded |
| Home load: bills | URL matching `**/bills**` | Mocked 503 and `{paid:0, unpaid:0}` |
| Home load: sub-wallets | URL matching `**/sub-wallet**` | Mocked 503 |
| Home load: balance | URL matching `**/wallet**` | Mocked 503 |
| Sign-in for test sessions | `/auth/signin` and OTP verify via `support/global-setup.ts` | Sessions saved to `playwright/.auth/homepage-account<N>.json`; failing signin is watched by `watchAuthGatewayFailure` |
| Logout | not recorded | Confirmation modal then redirect |

## Known gaps and product defects

| Item | Evidence |
|---|---|
| Home dashboard has no data-testids; most locators are CSS ids, text or classes | QA-DATA-TESTID-HANDOFF.md section 5 |
| Last-transactions uses ngx-datatable, and "View All" is a span, not a link | project memory homepage_split_and_speed |
| `HomePageHelper` default BASE_URL is `https://uat.majdpay.com` (Login helper uses dev) | HomePageHelper.ts:15 |
| `HomePage.ts` still holds Java-era locators with positional XPath and best-effort guesses (Create Bill, Money Request) | pageElements/Shared/HomePage.ts:41-68 |
| `merchant2` (E9306) returns HTTP 423 locked on sign-in; unlock before running account-2 specs | Login-Test-Plan.md section 6 |
| Spreading 11 spec files across 2 accounts is slower than one file; login retry expected | project memory homepage_split_and_speed |
| Wallet Settings and quick action destinations asserted loosely (any dialog or URL) | HomepageQuickActions.spec.ts; HomepageBalanceCard.spec.ts:40-43 |
| Notifications panel locator is a broad CSS guess (`[class*="notif"], [role="dialog"]`) | HomepageHeaderPage.ts:13 |
| Unauthenticated-redirect check once reported as not enforced on dev | project memory homepage_split_and_speed |
| Sidebar ids 9 and 10 naming differs between `AppShellPage` and `HomepageSidebarPage` | AppShellPage.ts:92-93; HomepageSidebarPage.ts:72 |

## Open questions

| Question | Why open |
|---|---|
| Exact column names of the last-transactions widget | Spec accepts any of transaction/amount/date/status |
| Which user roles see which sidebar items | Not documented in the repo files read |
| Does the notifications panel list real items, and what is its empty text? | Only the heading is asserted |
| Where Wallet Settings leads | URL not asserted |
| Real API paths behind the widgets | Only wildcard mocks |
| Does the profile menu content differ for a biller account? | Biller account exists (`DEV_BILLER_*`) but no Homepage spec uses it |
