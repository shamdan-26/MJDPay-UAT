# Manual Test Cases — HomePage (Post-Login Dashboard)

Context: the HomePage (`/business/main/home`) is the first screen a Business-portal user lands on after logging in. It combines a greeting/header, wallet balance card, quick actions, bills overview, sub-wallets panel, a last-transactions widget, notifications, a profile menu, and the app-wide sidebar navigation. This document covers the full dashboard experience for manual/exploratory execution — happy path, negative, edge-case, and security-relevant behavior — mirroring the existing Playwright automation under `BusinessTestCases/homepage/`.

Priority key: **P1** = blocks the release / core happy path, **P2** = important secondary behavior, **P3** = edge case / polish.

---

## A. Page identity — URL, title & greeting

Context: basic landing checks confirming the user reaches the right page with the right chrome after login.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-01 | Redirects to homepage after login | Log in with valid merchant credentials | User lands on `/business/main/home` | P1 |
| HP-02 | Correct browser tab title | Land on the homepage | Browser tab title reads "EMI - Business" | P3 |
| HP-03 | "Home" page heading shown | Land on the homepage | A "Home" page heading is visible | P2 |
| HP-04 | Time-based greeting shown | Land on the homepage | A greeting message (e.g. time-of-day based) is visible | P2 |
| HP-05 | Wallet status subtitle shown | Land on the homepage | A subtitle describing wallet status appears under the greeting | P3 |
| HP-06 | Last login date/time shown | Land on the homepage | The Last Login date and time are visible | P2 |

---

## B. Header / top bar

Context: the top bar hosts the profile trigger and notifications icon, visible on every homepage load.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-07 | Profile trigger visible | Land on the homepage | The profile trigger (avatar/name) is visible in the header | P2 |
| HP-08 | Notifications icon visible | Land on the homepage | The notifications icon is visible in the header | P2 |

---

## C. Notifications panel

Context: clicking the notifications icon opens an in-page panel; clicking again closes it.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-09 | Open notifications panel | Click the notifications icon | The notifications panel and its heading become visible | P2 |
| HP-10 | Close notifications panel on second click | With the panel open, click the notifications icon again | The panel/heading is no longer visible | P2 |

---

## D. Profile menu

Context: the profile trigger opens a dropdown with account-level actions, including logout.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-11 | Logout option present in profile menu | Open the profile menu | A "Logout" item is visible | P1 |
| HP-12 | Profile/settings option present | Open the profile menu | A profile or settings entry is visible alongside logout | P2 |

---

## E. Logo

Context: the MJD Pay logo sits in the sidebar and should always keep the user inside the app.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-13 | Logo visible in sidebar | Land on the homepage | The MJD Pay logo is visible in the sidebar | P3 |
| HP-14 | Logo click stays in-app | Click the sidebar logo | User remains on a URL within the app domain (e.g. redirected to/stays on the homepage) | P2 |

---

## F. Balance card

Context: the balance card shows the current wallet balance with a visibility toggle plus shortcuts to the wallet QR and wallet settings.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-15 | "Current Balance" label shown | Land on the homepage | The "Current Balance" label is visible | P3 |
| HP-16 | Wallet balance amount shown | Land on the homepage | The wallet balance (SAR) container is visible | P1 |
| HP-17 | Balance visibility toggle present | Land on the homepage | The balance visibility toggle button is visible | P2 |
| HP-18 | Hiding the balance changes the display | Click the balance visibility toggle | The displayed balance text changes (e.g. masked) from its original value | P1 |
| HP-19 | Un-hiding restores the balance | With the balance hidden, click the toggle again | The balance display is restored to its original value | P1 |
| HP-20 | Hidden balance does not leak numeric value | Toggle the balance to hidden | The balance container's text does not show the raw numeric amount (masked/obscured) | P1 |
| HP-21 | Wallet QR button present | Land on the homepage | The Wallet QR button is visible | P2 |
| HP-22 | Wallet QR opens QR view | Click the Wallet QR button | A QR dialog opens, or the user is navigated to the wallet-links page | P2 |
| HP-23 | Wallet Settings button present | Land on the homepage | The Wallet Settings button is visible | P2 |
| HP-24 | Wallet Settings navigates away | Click the Wallet Settings button | User is navigated away from the homepage to a wallet settings screen | P2 |

---

## G. Quick actions

Context: shortcut cards to the most common merchant tasks — Topup, Wallet Transfer, Cashout, Receive Payment.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-25 | Quick actions heading & subtitle shown | Land on the homepage | The "Quick actions" heading and its "Shortcuts to common tasks" subtitle are visible | P3 |
| HP-26 | Topup card visible | Land on the homepage | The Topup quick action card (with description) is visible | P2 |
| HP-27 | Wallet Transfer card visible | Land on the homepage | The Wallet Transfer quick action card (with description) is visible | P2 |
| HP-28 | Cashout card visible | Land on the homepage | The Cashout quick action card (with description) is visible | P2 |
| HP-29 | Receive Payment card visible | Land on the homepage | The Receive Payment quick action card (with description) is visible | P2 |
| HP-30 | Topup card navigates to Topup | Click the Topup quick action card | User is navigated to the Topup page | P1 |
| HP-31 | Wallet Transfer card opens flow | Click the Wallet Transfer quick action card | Either a transfer dialog opens, or the user is navigated to a transfer-related URL | P1 |
| HP-32 | Cashout card opens flow | Click the Cashout quick action card | Either a dialog opens, or the user is navigated to a cashout/transfer URL | P1 |
| HP-33 | Receive Payment card opens flow | Click the Receive Payment quick action card | Either a dialog opens, or the user is navigated away from the homepage | P1 |

---

## H. Bills overview

Context: a Paid/Unpaid summary with a Chart/Cards view toggle and a link to the full Bills page.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-34 | Bills overview heading shown | Land on the homepage | The Bills overview section heading is visible | P3 |
| HP-35 | Chart/Cards toggle buttons present | Land on the homepage | Both the Chart toggle and the Cards toggle are visible | P2 |
| HP-36 | Paid/Unpaid labels present | Land on the homepage | The "Paid" and "Unpaid" category labels are visible | P2 |
| HP-37 | View All link present | Land on the homepage | The Bills "View All" link is visible | P2 |
| HP-38 | Switching to Cards view | Click the Cards toggle | The view switches to Cards; user remains on the homepage | P2 |
| HP-39 | Switching back to Chart view | From Cards view, click the Chart toggle | The view switches back to Chart; user remains on the homepage | P2 |
| HP-40 | View All navigates to Bills | Click the Bills "View All" link | User is navigated to the Bills page | P1 |
| HP-41 | Zero paid bills shown as 0 | View Bills overview on an account with no paid bills | The Paid category shows a 0/empty value, not an error or stale data | P2 |
| HP-42 | Zero unpaid bills shown as 0 | View Bills overview on an account with no unpaid bills | The Unpaid category label/value is visible and consistent with no unpaid bills | P2 |

---

## I. Sub-wallets panel

Context: a panel summarizing the merchant's sub-wallets, with a management shortcut and an empty state when none exist.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-43 | Sub-wallets panel heading shown | Land on the homepage | The Sub-wallets panel heading is visible | P3 |
| HP-44 | Sub-wallets Manage link present | Land on the homepage | The Sub-wallets "Manage" link is visible | P2 |
| HP-45 | Empty sub-wallets message shown | Land on the homepage with an account that has no sub-wallets | A clear empty-state message is shown in the panel | P2 |
| HP-46 | Manage link navigates | Click the Sub-wallets "Manage" link | User is navigated to the sub-wallets management page | P1 |

---

## J. Last transactions widget

Context: a table of the account's most recent transactions (capped at 10 rows) with a link to the full Transactions page, and a distinct empty state for accounts with no history.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-47 | Transactions container visible | Land on the homepage with an account that has transaction history | The last-transactions container is visible | P1 |
| HP-48 | At most 10 rows shown | View the last-transactions table on an account with more than 10 transactions | No more than 10 rows are displayed | P2 |
| HP-49 | Column headers present | View the last-transactions table | Column headers referencing transaction/amount/date/status are visible | P2 |
| HP-50 | Total row count shown | View the last-transactions table | A total transaction count is displayed below the table | P2 |
| HP-51 | View All link present and navigates | Click the transactions "View All" link | User is navigated to `/business/main/transactions` | P1 |
| HP-52 | Empty-state title shown for new accounts | Land on the homepage with an account that has no transaction history | An empty-state title reading "No transactions yet" (or equivalent) is shown | P2 |
| HP-53 | Empty-state description shown | Same as HP-52 | A description mentioning that transactions will appear once money moves through the wallet is shown | P3 |
| HP-54 | No total count in empty state | Same as HP-52 | No transaction total count is shown alongside the empty state | P2 |
| HP-55 | No View All link in empty state | Same as HP-52 | No "View All" link is shown alongside the empty state | P2 |

---

## K. Sidebar navigation

Context: the app-wide left-hand navigation, reachable from every page, including expandable Transfer and Manage Accounts submenus and "Soon" (disabled) items.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-56 | Sidebar container visible | Land on the homepage | The sidebar navigation container is visible | P2 |
| HP-57 | Home link present and active | Land on the homepage | The Home link is visible and marked active (class or `aria-current="page"`) | P2 |
| HP-58 | Transactions link present | Land on the homepage | The Transactions link is visible in the sidebar | P2 |
| HP-59 | Topup link present | Land on the homepage | The Topup link is visible in the sidebar | P2 |
| HP-60 | Transfer item present | Land on the homepage | The Transfer item is visible in the sidebar | P2 |
| HP-61 | Bills link present | Land on the homepage | The Bills link is visible in the sidebar | P2 |
| HP-62 | Payment Links item present | Land on the homepage | The Payment Links item is visible in the sidebar | P2 |
| HP-63 | Sub-Wallets link present | Land on the homepage | The Sub-Wallets link is visible in the sidebar | P2 |
| HP-64 | SADAD item marked "Soon" | Land on the homepage | The SADAD sidebar item is visible and labeled "Soon" | P3 |
| HP-65 | Manage Accounts item present | Land on the homepage | The Manage Accounts item is visible in the sidebar | P2 |
| HP-66 | Manage Products link present | Land on the homepage | The Manage Products link is visible in the sidebar | P2 |
| HP-67 | Groups & Roles link present | Land on the homepage | The Groups & Roles link is visible in the sidebar | P2 |
| HP-68 | Card Management link present | Land on the homepage | The Card Management link is visible in the sidebar | P2 |
| HP-69 | Logged-in company name shown | Land on the homepage | The logged-in company/brand name is visible in the sidebar | P3 |
| HP-70 | Transactions link navigates | Click the Transactions sidebar link | User is navigated to `/business/main/transactions` | P1 |
| HP-71 | Home link returns from another page | From the Transactions page, click the Home link | User returns to `/business/main/home` | P1 |
| HP-72 | Topup sidebar link navigates | Click the Topup sidebar link | User is navigated to the Topup page | P1 |
| HP-73 | Transfer submenu expands to reveal Cashout | Click the Transfer item | The submenu expands and the Cashout sub-link becomes visible | P2 |
| HP-74 | Transfer submenu reveals Wallet Transfer | Click the Transfer item | The Wallet Transfer sub-link becomes visible | P2 |
| HP-75 | Transfer submenu shows International Transfer as "Soon" | Click the Transfer item | The International Transfer sub-link is visible and labeled "Soon" | P3 |
| HP-76 | "Soon" International Transfer link is inert | Click the International Transfer ("Soon") sub-link | User remains on the homepage; no navigation occurs | P2 |
| HP-77 | Bills sidebar link navigates | Click the Bills sidebar link | User is navigated to the Bills page | P1 |
| HP-78 | Payment Links sidebar link navigates | Click the Payment Links sidebar link | User is navigated to the Payment Links page | P2 |
| HP-79 | Sub-Wallets sidebar link navigates | Click the Sub-Wallets sidebar link | User is navigated to the Sub-Wallets page | P2 |
| HP-80 | "Soon" SADAD link is inert | Click the SADAD ("Soon") sidebar item | User remains on the homepage; no navigation occurs | P2 |
| HP-81 | Manage Accounts submenu expands | Click the Manage Accounts panel | The submenu (Manage Users / Manage Beneficiary) becomes visible | P2 |
| HP-82 | Manage Users sub-link navigates | Expand Manage Accounts, click Manage Users | User is navigated to the Users management page | P2 |
| HP-83 | Manage Beneficiary sub-link navigates | Expand Manage Accounts, click Manage Beneficiary | User is navigated to the Beneficiary management page | P2 |
| HP-84 | Manage Products link navigates | Click the Manage Products sidebar link | User is navigated to the Products management page | P2 |
| HP-85 | Groups & Roles link navigates | Click the Groups & Roles sidebar link | User is navigated to the Groups/Roles page | P2 |
| HP-86 | Card Management link navigates | Click the Card Management sidebar link | User is navigated to the Card Management page | P2 |

---

## L. Logout

Context: logging out goes through a confirmation dialog before the session is actually destroyed. These cases end the session — always execute them last within a test cycle for a given account.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-87 | Logout confirmation dialog appears | Open the profile menu and click "Logout" | A confirmation dialog with a proceed/confirm button appears | P1 |
| HP-88 | Confirming logout ends the session | Confirm logout from the dialog | User is redirected to the login page and can no longer reach the homepage without logging in again | P1 |

---

## M. Session persistence & unauthenticated access

Context: the homepage should survive a refresh while authenticated, and must never be reachable without a valid session.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-89 | Refresh keeps user on homepage | While logged in on the homepage, refresh the browser | User remains on `/business/main/home` | P1 |
| HP-90 | Unauthenticated access redirects to login | With no active session, navigate directly to the home URL | User is redirected to the login page | P1 |

---

## N. API failure & empty-data resilience

Context: the homepage aggregates several independent widget APIs (transactions, bills, sub-wallets, wallet balance). A failure in any one of them should degrade gracefully rather than break the page.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-91 | Transactions API failure doesn't crash the page | Simulate a 503 on the transactions endpoint, reload the homepage | User stays on the homepage; the last-transactions container is still visible (degrades gracefully) | P1 |
| HP-92 | Bills API failure doesn't crash the page | Simulate a 503 on the bills endpoint, reload the homepage | User stays on the homepage; the Bills overview heading is still visible | P1 |
| HP-93 | Sub-wallets API failure doesn't crash the page | Simulate a 503 on the sub-wallets endpoint, reload the homepage | User stays on the homepage; the Sub-wallets heading is still visible | P1 |
| HP-94 | Wallet balance API failure doesn't crash the page | Simulate a 503 on the wallet endpoint, reload the homepage | User stays on the homepage; the wallet balance container is still visible | P1 |
| HP-95 | Empty widget data doesn't break the page | Force transactions/bills endpoints to return empty payloads, reload the homepage | User stays on the homepage; the greeting text is still visible | P2 |
| HP-96 | Sidebar remains intact after a widget API failure | Simulate a failed widget API call, reload the homepage | All sidebar items (Home, Transactions, brand name) remain visible despite the failure | P2 |

---

## O. Security & edge cases

Context: checks that the homepage does not leak sensitive data through the URL, DOM, or console, and renders cleanly with no untranslated strings or unhandled errors.

| ID | Title | Steps | Expected Result | Priority |
|---|---|---|---|---|
| HP-97 | No credentials/tokens in the URL | Inspect the homepage URL | URL contains no password, token, secret, API key, or access-key substrings | P1 |
| HP-98 | No Bearer tokens rendered in page source | Inspect the rendered page HTML | No Bearer-token-like string appears in the HTML source | P1 |
| HP-99 | No sensitive query parameters | Inspect the homepage URL's query string | No parameter names reference token, auth, key, session, or password | P2 |
| HP-100 | No unhandled JS errors on load | Reload the homepage and monitor for uncaught exceptions | No critical unhandled JavaScript errors are raised (ignoring known-benign noise such as ResizeObserver/chunk-load warnings) | P2 |
| HP-101 | No raw i18n keys rendered | Inspect the visible page text | No raw untranslated translation keys (e.g. `some.key`) are shown to the user | P2 |

---

## Automated coverage note

This manual test suite mirrors the existing Playwright automation for the HomePage feature. The corresponding automated specs live under `BusinessTestCases/homepage/`:

**Functional:**
- `BusinessTestCases/homepage/functional/HomepageBalanceCard.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageBillsSection.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageLogo.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageLogout.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageNotifications.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageProfileMenu.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageQuickActions.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageSession.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageSubWallets.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageSidebarNavigation.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageTransactions.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageTransactionsEmptyState.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageNegative.spec.ts`
- `BusinessTestCases/homepage/functional/HomepageSecurity.spec.ts`

**UI (element/visibility assertions):**
- `BusinessTestCases/homepage/ui/HomepageBalanceCardPage.spec.ts`
- `BusinessTestCases/homepage/ui/HomepageBillsOverviewPage.spec.ts`
- `BusinessTestCases/homepage/ui/HomepageGreetingPage.spec.ts`
- `BusinessTestCases/homepage/ui/HomepageHeaderPage.spec.ts`
- `BusinessTestCases/homepage/ui/HomepageLogoPage.spec.ts`
- `BusinessTestCases/homepage/ui/HomepageQuickActionsPage.spec.ts`
- `BusinessTestCases/homepage/ui/HomepageSubWalletsPage.spec.ts`
- `BusinessTestCases/homepage/ui/HomepageUrlTitlePage.spec.ts`
- `BusinessTestCases/homepage/ui/HomepageSidebarNavigationPage.spec.ts`
- `BusinessTestCases/homepage/ui/HomepageTransactionsPage.spec.ts`

**Supporting helper:** `BusinessTestCases/homepage/HomePageHelper.ts` (login/session bootstrap, the two-account pool used to exercise both populated-transactions and empty-transactions states, and shared timing constants referenced throughout the specs above).
