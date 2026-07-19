# QA Handoff — `data-testid` Locators for Language-Agnostic Automation

**From:** Frontend team (emi-ewallet-business / MajdPay business portal)
**To:** QA automation team
**Re:** Your report *"Test Automation Report: Arabic Language Localization Locator Issues"*
**Status:** ✅ Frontend changes merged for the critical flows below. Update your Playwright Page Objects accordingly.

---

## 1. Context — you were right about the root cause

Your diagnosis was correct: the tests fail in Arabic because the locators match on **visible English text**
(`:has-text("Proceed")`, `getByRole('button', { name: /Next/i })`). When the app switches to Arabic the
text becomes `متابعة` / `التالي` / `إلغاء`, so those selectors find nothing and time out.

Note this is **not an app bug** — the app renders correctly in both languages. The fix is to stop
depending on language-specific text. We've done the preferred fix on our side: **added stable
`data-testid` attributes**. These are metadata, identical in every language, theme, and dark mode.

**Action for you:** replace text-based locators with `page.getByTestId(...)` per the tables below.

```typescript
// ❌ Before (breaks in Arabic)
this.proceedButton = page.getByRole('button', { name: /Proceed/i });

// ✅ After (language-agnostic)
this.proceedButton = page.getByTestId('w2w-proceed-btn');
```

---

## 2. Naming convention we use

`data-testid="<feature>-<element>-<type>"` — kebab-case, English, stable. Examples:
`login-submit`, `w2w-proceed-btn`, `topup-otp-verify-btn`, `toast-message`.

If you need a new one added anywhere, ask us — do **not** derive locators from text or from the
auto-generated `id`s (those can change).

---

## 3. Shared components — one testid pattern reused everywhere

Some of these come from shared components, so the **same testid appears on every screen that uses them**.
Learn these once:

| Component | testid(s) | Notes |
|---|---|---|
| **Toast / snackbar** | `toast`, `toast-message`, `toast-close-btn` | `toast-message` = the detail text you assert on. Replaces `.toast-snackbar__detail`. |
| **Confirmation / action modal** | `<prefix>-submit-btn`, `<prefix>-cancel-btn` | Prefix is per-usage (see flows below). Default prefix when none set = `modal` → `modal-submit-btn` / `modal-cancel-btn`. |
| **Modal close (X)** | `modal-close-btn` | Same on all modals; scope it under the modal you're testing. |
| **OTP modal** (`app-otp-modal`) | `otp-input`, `otp-submit-btn`, `otp-cancel-btn`, `otp-resend-btn` | Used by Bill Payment. `otp-input` is the wrapper — type into it after focusing. |
| **Amount field** (`app-amount-field`) | `amount-input`, `amount-chip-<value>`, `amount-full-balance-toggle` | Default prefix `amount`. Chips: `amount-chip-500`, `amount-chip-1000`, `amount-chip-2000`, `amount-chip-5000`, `amount-chip-10000`. Used in Top-up & Bank transfer. |
| **Floating inputs** (`app-floating-label-input`) | value of the `testId` we pass per field | Password toggle: `<testId>-toggle-visibility`; clear (×): `<testId>-clear-btn`. If a field has no testid yet, fall back to its stable `id` (never its label). |

> ⚠️ The **inline OTP** inside the Transfer/Top-up flows (W2W, Bank) is a different widget from the
> shared OTP modal. Its **buttons** are tagged (see flow tables), but the OTP entry boxes are the
> `ngx-otp-input` library inputs (no testid) — focus the block and type the code, or ask us to add
> testids to the boxes if you need them.

---

## 4. Flow-by-flow locator map

### 4.1 Login  — `login.component.html`
| Element | New locator | Was |
|---|---|---|
| Mobile number field | `getByTestId('login-username')` | text/label |
| Password field | `getByTestId('login-password')` | text/label |
| Password show/hide | `getByTestId('login-password-toggle-visibility')` | icon |
| Login submit | `getByTestId('login-submit')` | `name: /log in/i` |

### 4.2 Language switch  — header + auth layout
| Element | New locator | Was |
|---|---|---|
| English toggle | `getByTestId('lang-en')` | `#text_languageItem:has-text("EN")` |
| Arabic toggle | `getByTestId('lang-ar')` | `:has-text("العربية")` |
| Switch-language confirm | `getByTestId('switch-language-submit-btn')` | text |
| Switch-language cancel | `getByTestId('switch-language-cancel-btn')` | text |

### 4.3 Wallet-to-Wallet (W2W) transfer
| Element | New locator |
|---|---|
| Unified number input | `getByTestId('w2w-unified-number')` |
| Check recipient | `getByTestId('w2w-check-recipient-btn')` |
| Proceed (to summary) | `getByTestId('w2w-proceed-btn')` |
| Summary → back/cancel | `getByTestId('w2w-summary-back-btn')` |
| Summary → transfer | `getByTestId('w2w-summary-transfer-btn')` |
| OTP cancel / verify / resend | `getByTestId('w2w-otp-cancel-btn')` / `w2w-otp-verify-btn` / `w2w-otp-resend-btn` |
| Success → OK | `getByTestId('w2w-result-ok-btn')` |
| Amount field / chips | `getByTestId('amount-input')` / `amount-chip-<value>` |

> There is also a **modal** variant of the W2W summary (`summary-wallet-to-wallet`) with
> `w2w-summary-cancel-btn` and `w2w-summary-transfer-btn`.

### 4.4 Bank transfer
| Step | Element | New locator |
|---|---|---|
| IBAN entry | IBAN input | `getByTestId('bank-transfer-iban-input')` |
| IBAN entry | Continue | `getByTestId('bank-transfer-continue-btn')` |
| Amount | Proceed | `getByTestId('bank-amount-proceed-btn')` |
| Amount | Amount field / chips | `getByTestId('amount-input')` / `amount-chip-<value>` |
| Summary | Cancel / Next | `getByTestId('bank-summary-cancel-btn')` / `bank-summary-next-btn` |
| OTP (amount step) | Cancel / Verify / Resend | `bank-amount-otp-cancel-btn` / `bank-amount-otp-verify-btn` / `bank-amount-otp-resend-btn` |
| Result | OK | `getByTestId('bank-amount-ok-btn')` |
| Confirmation step | Back / Proceed | `bank-confirm-back-btn` / `bank-confirm-proceed-btn` |
| Confirmation OTP | Cancel / Verify / Resend | `bank-confirm-otp-cancel-btn` / `bank-confirm-otp-verify-btn` / `bank-confirm-otp-resend-btn` |
| Confirmation result | OK | `getByTestId('bank-confirm-ok-btn')` |

### 4.5 Top-up
| Step | Element | New locator |
|---|---|---|
| Form | Amount field / chips | `getByTestId('amount-input')` / `amount-chip-<value>` |
| Form | Proceed | `getByTestId('topup-proceed-btn')` |
| Summary (inline) | Cancel / Next | `topup-summary-cancel-btn` / `topup-summary-next-btn` |
| Summary (modal) | Cancel / Next | `topup-summary-modal-cancel-btn` / `topup-summary-modal-next-btn` |
| OTP | Cancel / Verify / Resend | `topup-otp-cancel-btn` / `topup-otp-verify-btn` / `topup-otp-resend-btn` |
| Result | OK | `getByTestId('topup-result-ok-btn')` |

### 4.6 Bill payment
| Element | New locator |
|---|---|
| Get bill info | `getByTestId('bill-get-info-btn')` |
| OTP input / submit / cancel / resend | `otp-input` / `otp-submit-btn` / `otp-cancel-btn` / `otp-resend-btn` |
| Success → go home | `getByTestId('bill-payment-success-cancel-btn')` |
| Success → pay another bill | `getByTestId('bill-payment-success-submit-btn')` |

---

## 5. Not yet covered (please don't assume these exist yet)

`data-testid` is **live for the flows in section 4** (login, language, W2W, bank transfer, top-up,
bill payment) plus all shared components in section 3. The following areas are **not tagged yet** and
still need the shared components used or explicit testids added — flag to FE the ones you need next:

- Beneficiary management, Cards, My Products / POS, Sub-wallets, Transactions list & filters,
  User/Group management, Settings, Profile, Notifications, Payment Links, Home dashboard.

Where a page already uses our shared inputs/modals/toasts, those child testids (section 3) work today
even if the page isn't in section 4.

---

## 6. Please avoid the regex workaround

Your report's "Recommendation 3" (`/^(Proceed|متابعة)$/`) is high-maintenance and breaks again on any
copy change or a third language. Now that `data-testid` exists for these flows, prefer `getByTestId`.
For anything still missing a testid, request it from FE rather than adding bilingual regex.

---

## 7. Going forward

FE now runs a `testid-reviewer` check on every UI change, so new interactive elements should ship with
a `data-testid`. If you hit an untagged element, open a ticket / ping FE with the screen + element and
we'll add it using the convention in section 2.
