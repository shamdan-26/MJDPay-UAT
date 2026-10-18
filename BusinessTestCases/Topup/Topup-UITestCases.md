# Top-up: UI Test Cases

Scope: what the user SEES and CLICKS on the Top-up screens: every element, text, button, menu, state, colour, size, language and responsive behaviour. Business rules (limits, commission, ledger) stay in `Topup-BusinessTestCases.md` (`TUB-`).
Sources: `docs/ui-kb/Topup.md` and `Topup.generated.md` (elements, locators, copy), `docs/manual-test-cases/Topup.md` (`TUP-`), the existing UI specs in `Topup/ui/`, and a live style capture on dev on 2026-10-18 (computed styles of the form, summary and profile button).
Case IDs use the prefix `TUI-` (Top-up UI). Environment: dev, Merchant account, Arabic default (RTL). Text is quoted in Arabic first because that is what the app shows by default; English is the alternate language.

How to read the file:
- **Value source**: `Measured` = read from the live page on 2026-10-18 (computed style); `Doc` = taken from the UI KB or a manual case; `Capture` = not measured yet, the first run must record it and the value is then written here (Type `Open Question`).
- Colours are written as hex with the CSS `rgb()` in brackets so they can be asserted with `toHaveCSS`.
- Pri: P1 blocks use of the screen, P2 visible defect, P3 polish.
- "Existing automation" points to a spec that already proves the case, so nothing is written twice.

## Design tokens measured on dev (2026-10-18)

| Token | Hex (rgb) | Where it is used |
|---|---|---|
| Ink (primary text) | #0E1B2C (14, 27, 44) | Page title, balance amount, amount input, money amounts in the summary |
| Body text | #2D3B4F (45, 59, 79) | Payment method name, chip text, summary row text, Cancel text |
| Muted text | #5B6B82 (91, 107, 130) | Subtitle, summary row labels, quick-amount label, balance icon glyph |
| Faint text | #8794A8 (135, 148, 168) | "Current balance" label, wallet code |
| Border | #E4E8EF (228, 232, 239) | Unselected method card, chip, Cancel border |
| Surface grey | #EEF1F6 (238, 241, 246) | Balance icon buttons, currency box |
| Primary blue | #175FEC (23, 95, 236) | Proceed, Next, selected method border and text |
| Selected tint | #E8F1FE (232, 241, 254) | Selected method card background |
| Error red | #C81E1E (200, 30, 30) | Amount field border in the error state |
| White | #FFFFFF | Button text on blue, card backgrounds |
| Font (text) | system-ui | All Arabic and English labels |
| Font (numbers) | IBM Plex Mono | Amount input, wallet code, summary money amounts |

## A. Page layout and hero

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-01 | Page opens on the Top-up route inside the app shell | P1 | Functional | Page | Logged in | Open Top-up from the sidebar | URL is /business/main/transfer/top-up; sidebar, header and the form are all shown | Doc | TopupShellUI, TopupNavigation |
| TUI-02 | Title text | P1 | Functional | Page title h1 | Form step | Read the heading | "شحن الرصيد" (English: "Top up") | Measured | TopupFormUI |
| TUI-03 | Title style | P3 | Visual | Page title h1 | Form step | Read computed style | Colour #0E1B2C, 28px, weight 600, system-ui, not clipped | Measured | TopupStyleFormUI |
| TUI-04 | Subtitle text | P2 | Functional | Page subtitle | Form step | Read the text under the title | Arabic subtitle about adding funds to the business wallet by card (English: "Add funds to your business wallet using a card or wallet supported in Saudi Arabia") | Measured | TopupFormUI |
| TUI-05 | Subtitle style | P3 | Visual | Page subtitle | Form step | Read computed style | Colour #5B6B82, 14.5px, weight 500; sits under the title with no overlap | Measured | TopupStyleFormUI |
| TUI-06 | Page has one main heading | P3 | Functional | h1 | Every step | Count h1 elements | Exactly one h1 per step; its text changes with the step (form, summary) | Doc | TopupStyleFormUI |
| TUI-07 | Page is right-to-left in Arabic | P2 | Functional | html dir | Arabic default | Read html dir | dir is rtl; text is right-aligned; the sidebar is on the right | Doc | TopupFormUI |
| TUI-08 | No horizontal page scroll at desktop width | P2 | Visual | Page | 1920 and 1366 wide | Open the form | No horizontal scrollbar; content does not overflow the main panel | Capture | TopupStyleFormUI (record only) |

## B. Balance card

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-09 | Balance label text and style | P2 | Functional | Balance label | Form step | Read the label | "الرصيد الحالي" (English: "Current balance"); colour #8794A8, 11px, weight 600 | Measured | TopupFormUI |
| TUI-10 | Balance amount format and style | P1 | Functional | Balance amount | Known balance | Read the amount | Shown as 0.00 with thousands separator (for example 5,000.00); colour #0E1B2C, 22px, weight 700 | Measured | TopupFormUI |
| TUI-11 | Balance matches the wallet | P1 | Functional | Balance amount | Known balance | Compare with the home page balance | The same number is shown on both screens | Doc | TopupHappyPath |
| TUI-12 | Wallet code format and style | P2 | Functional | Wallet code | Form step | Read the code | Text "· رمز المحفظة" followed by the code in the pattern AAA-XXXXXXXXXX-NN; colour #8794A8, 11.5px, IBM Plex Mono | Measured | TopupFormUI |
| TUI-13 | QR button | P2 | Functional | Generate QR button | Form step | Inspect and click it | Accessible name "إنشاء رمز QR"; 32x32; background #EEF1F6; glyph #5B6B82; radius 8px; pointer cursor; click opens the QR action | Measured | TopupStyleFormUI |
| TUI-14 | Wallet settings button | P2 | Functional | Wallet settings button | Form step | Inspect and click it | Accessible name "إعدادات المحفظة"; same style as the QR button; click opens wallet settings | Measured | TopupStyleFormUI |
| TUI-15 | Balance card stays on the summary step | P2 | Functional | Balance card | Summary step | Reach the summary | Label, amount, wallet code and both icon buttons are still shown with the same style | Measured | TopupSummaryUI |
| TUI-16 | Balance card is hidden on the result screens | P2 | Functional | Balance card | Result step | Finish or fail a payment | The balance card is not shown on the success, pending and failed screens | Doc | TopupSuccessUI, TopupPendingUI, TopupFailureUI |
| TUI-17 | Balance card hover and focus | P3 | Visual | Icon buttons | Form step | Hover, then Tab to each icon button | Hover changes the background; keyboard focus shows a visible ring | Capture | TopupStyleFormUI (record only) |

## C. Payment method cards

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-18 | Section label | P2 | Functional | Payment methods label | Form step | Read the label | "طرق الدفع" (English: "Payment Methods") above the cards | Doc | TopupFormUI |
| TUI-19 | Three cards in a radio group | P1 | Functional | Method cards | Form step | Count the cards | Exactly three: mada, VISA, MASTER, in a radio group, in that order | Measured | TopupFormUI |
| TUI-20 | Card names | P2 | Functional | Method cards | Form step | Read each card | "mada مدى MADA"; "بطاقة فيزا VISA"; "بطاقة ماستر كارد MASTER" | Measured | TopupFormUI |
| TUI-21 | Each card has a logo | P2 | Visual | Method logos | Form step | Check each card | mada shows an svg logo, VISA an image, MASTER a logo; none broken or blank | Measured | TopupFormUI |
| TUI-22 | Unselected card style | P2 | Visual | Method card | Fresh form | Read computed style | Text #2D3B4F; background #FFFFFF; border 1px solid #E4E8EF; radius 14px; size 348x72; pointer cursor | Measured | TopupStyleFormUI |
| TUI-23 | Nothing is selected by default | P1 | Functional | Method cards | Fresh form | Read aria-checked | All three are aria-checked=false | Measured | TopupFormUI |
| TUI-24 | Selected card style | P1 | Visual | Method card | VISA clicked | Read computed style | aria-checked=true; text #175FEC; background #E8F1FE; border 1px solid #175FEC; a check mark is shown | Measured | TopupFormUI |
| TUI-25 | Only one card is selected | P1 | Functional | Method cards | mada then VISA | Click mada, then VISA | mada returns to the unselected style; VISA has the selected style | Doc | TopupFormUI |
| TUI-26 | Clicking the selected card keeps it selected | P3 | Functional | Method card | VISA selected | Click VISA again | VISA stays selected (no toggle off) or is cleared; record which | Capture | TopupStyleFormUI (record only) |
| TUI-27 | Keyboard use | P2 | Functional | Method cards | Form step | Tab to the group, use arrows or Space | Focus is visible on each card; Space or Enter selects the focused card | Capture | TopupStyleFormUI (record only) |
| TUI-28 | Card hover | P3 | Visual | Method card | Fresh form | Hover each card | Border or background changes; cursor is pointer | Capture | TopupStyleFormUI (record only) |

## D. Amount field

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-29 | Placeholder | P2 | Functional | Amount input | Empty form | Read the placeholder | 0.00 | Doc | TopupFormUI |
| TUI-30 | Input style | P3 | Visual | Amount input | Form step | Read computed style | Colour #0E1B2C; 18px, weight 500, IBM Plex Mono; 54px high; no own border (the wrapper draws it) | Measured | TopupStyleFormUI |
| TUI-31 | Currency box | P2 | Visual | Currency box | Form step | Inspect | Riyal symbol shown in a #EEF1F6 box, 44x54, colour #2D3B4F, weight 600, left of the number in LTR and right in RTL as designed | Measured | TopupFormUI |
| TUI-32 | Field type | P3 | Functional | Amount input | Form step | Read attributes | Text input with decimal keypad, not type=number; no maxlength | Doc | TopupFormUI |
| TUI-33 | Accepts digits and up to two decimals | P1 | Boundary | Amount input | Form step | Type 10.55 | 10.55 stays as typed | Doc | TopupFormUI |
| TUI-34 | Rejects letters and symbols | P2 | Negative | Amount input | Form step | Type abc, #, + | Nothing is entered | Doc | TopupFormUI |
| TUI-35 | Third decimal is cut | P2 | Boundary | Amount input | Form step | Type 10.555 | Field shows 10.55 | Doc | TopupFormUI |
| TUI-36 | Minus sign is dropped | P2 | Negative | Amount input | Form step | Type -10 | Field shows 10 | Doc | TopupFormUI |
| TUI-37 | Paste is cleaned the same way | P2 | Negative | Amount input | Form step | Paste "1,0a0.5x" | Only valid characters remain | Doc | TopupFormUI |
| TUI-38 | Zero amount highlights the field in red | P1 | Negative | Amount field | Form step | Type 0, then leave the field | Field gets the error state: border 1px solid #C81E1E, radius 14px. By design NO error text is shown under it. Proceed disabled | Measured | TopupStyleFormUI |
| TUI-39 | Error clears when the amount is fixed | P2 | Functional | Amount field | Error showing | Type 500 | Red border and message disappear | Capture | TopupStyleFormUI (record only) |
| TUI-40 | Error state shows no text | P3 | Negative | Amount field | Error showing | Look under the field | No message text is shown; the red highlight is the only signal | Doc | TopupStyleFormUI |
| TUI-41 | Amount focus ring | P3 | Visual | Amount field | Form step | Click the field | A visible focus style is applied to the wrapper | Capture | TopupStyleFormUI (record only) |
| TUI-42 | Amount has an accessible name | P2 | Accessibility | Amount input | Form step | Read the accessible name | A name is exposed (today none: known gap) | Doc | TopupFormUI |

## E. Quick-amount chips

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-43 | Quick-amount label | P3 | Functional | Chip label | Form step | Read the label | "أو اختر المبلغ" followed by the currency; colour #5B6B82, 13px, weight 500 | Measured | TopupFormUI |
| TUI-44 | Five chips in order | P1 | Functional | Chips | Form step | Read the chips | 500, 1000, 2000, 5000, 10000, in that order | Measured | TopupFormUI |
| TUI-45 | Chip style | P3 | Visual | Chip | Form step | Read computed style | Text #2D3B4F, 13px, weight 500; background #FFFFFF; border 1px solid #E4E8EF; radius 999px (pill); 38px high; pointer | Measured | TopupStyleFormUI |
| TUI-46 | All chips enabled on a fresh form | P2 | Functional | Chips | Fresh form | Check state | All five are enabled | Doc | TopupFormUI |
| TUI-47 | Click fills the amount | P1 | Functional | Chip | Form step | Click 1000 | The amount field shows 1000 | Doc | TopupFormUI |
| TUI-48 | Active chip style | P2 | Visual | Chip | 1000 clicked | Read computed style after the animation ends | Class is-active; text #175FEC (the chip animates there; first measurement of #254785 was mid-transition); background and border: the settled values are recorded by the test and written here | Measured | TopupStyleFormUI |
| TUI-49 | Manual edit clears the active chip | P2 | Functional | Chip | 1000 active | Type 1500 | No chip is active and the field shows 1500 | Doc | TopupFormUI |
| TUI-50 | Chips wrap on a narrow screen | P3 | Visual | Chips | Phone width | Resize to 390 wide | Chips wrap to a second line without overflow | Capture | TopupStyleFormUI (record only) |

## F. Disclaimer and Proceed

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-51 | Disclaimer text | P2 | Functional | Disclaimer | Form step | Read the banner | "Disclaimer: We at MJD Pay do not store any of your card information." (Arabic equivalent in Arabic) | Doc | TopupFormUI |
| TUI-52 | Disclaimer style | P3 | Visual | Disclaimer | Form step | Read computed style | Record colour, size and any icon; readable contrast against its background | Capture | TopupStyleFormUI (record only) |
| TUI-53 | Proceed label | P1 | Functional | Proceed button | Form step | Read the label | "متابعة" (English: "Proceed") | Measured | TopupFormUI |
| TUI-54 | Proceed disabled style | P1 | Visual | Proceed button | Fresh form | Read computed style | Disabled; opacity 0.5; cursor not-allowed; same blue #175FEC with white text | Measured | TopupFormUI |
| TUI-55 | Proceed enabled style | P1 | Visual | Proceed button | Method and amount set | Read computed style | Enabled; opacity 1; background #175FEC; text #FFFFFF; 14.5px weight 600; radius 11px; 200x44; pointer | Measured | TopupFormUI |
| TUI-56 | Proceed stays disabled with one input missing | P1 | Functional | Proceed button | Form step | Method only, then amount only | Disabled in both cases | Doc | TopupFormUI |
| TUI-57 | Proceed disables again when the amount is cleared | P2 | Functional | Proceed button | Ready form | Clear the amount | Proceed is disabled again | Doc | TopupFormUI |
| TUI-58 | Proceed hover and focus | P3 | Visual | Proceed button | Ready form | Hover and Tab to it | Hover shade and a visible focus ring are shown | Capture | TopupStyleFormUI (record only) |

## G. Summary step

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-59 | Heading and subtitle | P1 | Functional | Page heading | Proceed clicked | Read heading and subtitle | "ملخص إضافة الأموال" (English: "Top-up Summary"); subtitle "راجع التفصيل قبل المتابعة إلى الدفع." (the live copy spells it التفصيل; the manual doc expects التفاصيل: see Findings) | Measured | TopupSummaryUI |
| TUI-60 | URL does not change | P3 | Functional | Page | Summary step | Read the URL | Still /transfer/top-up | Doc | TopupSummaryUI |
| TUI-61 | Six rows in order | P1 | Functional | Summary rows | Summary step | Read the rows | Transaction type, Payment method, Original amount, Commission, VAT, Total amount to be received | Measured | TopupSummaryUI |
| TUI-62 | Row labels | P2 | Functional | Row labels | Summary step | Read the labels | "نوع العملية", "طريقة الدفع", "المبلغ الأصلي", "العمولة", "ضريبة القيمة المضافة", "إجمالي المبلغ المراد استلامه" | Measured | TopupSummaryUI |
| TUI-63 | Label style | P3 | Visual | Row labels | Summary step | Read computed style | Colour #5B6B82, 14px, weight 400 | Measured | TopupStyleSummaryUI |
| TUI-64 | Transaction type value | P2 | Functional | Row value | Merchant account | Read the value | "إضافة أموال للتاجر" for a Merchant | Measured | TopupSummaryUI |
| TUI-65 | Payment method value follows the choice | P1 | Functional | Row value | Each of the three methods | Proceed with each method | Row shows the chosen method name | Measured | TopupSummaryUI |
| TUI-66 | Original amount equals the entered amount | P1 | Functional | Row value | Amount 500 | Read the row | 500.00 | Measured | TopupSummaryUI |
| TUI-67 | Money format | P2 | Visual | Money amounts | Summary step | Read the four amounts | Four .money-amount values, each with 2 decimals; IBM Plex Mono, 14px weight 500, colour #0E1B2C | Measured | TopupSummaryUI |
| TUI-68 | Total row is emphasised | P2 | Visual | Total value | Summary step | Read computed style | 16px, weight 700 (larger and bolder than the other amounts) | Measured | TopupStyleSummaryUI |
| TUI-69 | Total is consistent with the rows | P1 | Functional | Total row | Amount 500 | Compare the rows | Live: commission 5.00, VAT 0.75, total 505.75 (500 + 5.00 + 0.75). This does NOT match the rule in the business cases (total = amount - commission). Record for Dev/PO | Measured | TopupStyleSummaryUI |
| TUI-70 | Cancel button | P1 | Functional | Cancel button | Summary step | Read and click it | Label "إلغاء"; outline style: text #2D3B4F, transparent background, border 1px solid #E4E8EF, radius 11px, 95x44; click returns to the form | Measured | TopupSummaryUI |
| TUI-71 | Next button | P1 | Functional | Next button | Summary step | Read it | Label "التالي"; background #175FEC; text #FFFFFF; no border; radius 11px; 100x44; enabled | Measured | TopupSummaryUI |
| TUI-72 | Next shows a loading state | P2 | Functional | Next button | Summary step | Click Next | A spinner or loading text shows and the button cannot be clicked twice | Doc | None |
| TUI-73 | Cancel then Proceed again keeps the amount | P2 | Functional | Form | Summary step | Cancel, Proceed | Same amount and method are summarised again | Doc | TopupSummaryUI |
| TUI-74 | Reload on the summary | P3 | Functional | Page | Summary step | Reload | The page loads without an error screen | Doc | TopupSummaryUI |
| TUI-75 | Browser Back on the summary | P3 | Functional | Page | Summary step | Press Back | Returns to the home page | Doc | TopupSummaryUI |
| TUI-76 | Summary as a modal | P3 | Open Question | Summary | Different entry point | Reach the summary from the home quick action | Record whether it is inline or a modal; the buttons carry the modal test ids | Capture | None |

## H. OTP step

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-77 | OTP step appears after Next | P1 | Functional | OTP widget | OTP enabled | Click Next | The OTP widget replaces the summary on the same URL | Doc | TopupOtpUI |
| TUI-78 | Instruction text | P2 | Functional | OTP subtitle | OTP step | Read the text | "A code has been sent to you, in order to continue with the top up process." (Arabic equivalent in Arabic) | Doc | None |
| TUI-79 | Mini summary above the boxes | P3 | Functional | OTP summary | OTP step | Read it | Shows the operation and the total amount to be received, in capital letters | Doc | None |
| TUI-80 | Six boxes | P1 | Functional | OTP boxes | OTP step | Count the boxes | Six single-character boxes, empty at start | Doc | TopupOtpUI |
| TUI-81 | Box style and focus | P3 | Visual | OTP boxes | OTP step | Read computed style | Record border, radius and size; the first box is focused and shows a focus style | Capture | None |
| TUI-82 | Digits only | P2 | Negative | OTP boxes | OTP step | Type a, #, 5 | Only the digit is kept; focus moves to the next box | Doc | TopupOtpUI |
| TUI-83 | Countdown text and format | P2 | Functional | Countdown | OTP step | Read it | "تنتهي صلاحية الرمز خلال MM:SS" counting down from about 01:00 | Doc | TopupOtpUI |
| TUI-84 | Resend disabled while counting | P2 | Functional | Resend link | OTP step | Look at it during the countdown | Disabled and styled as disabled (record colour) | Doc | TopupOtpUI |
| TUI-85 | Resend enabled at 00:00 | P2 | Functional | Resend link | Countdown ended | Look at it | Enabled; click restarts the timer; typed digits stay | Doc | TopupOtpFlow |
| TUI-86 | Verify button states | P1 | Functional | Verify button | OTP step | Empty, partial, full | Disabled until six digits; (the field auto-submits on the sixth digit) | Doc | TopupOtpFlow |
| TUI-87 | Cancel button | P1 | Functional | Cancel button | OTP step | Click Cancel | Returns to the form; balance unchanged | Doc | TopupOtpUI |
| TUI-88 | Wrong code error | P1 | Negative | Error message | OTP step | Enter a wrong code | An error is shown (record text and colour); the gateway does not open | Capture | None |
| TUI-89 | Button style on the OTP step | P3 | Visual | OTP buttons | OTP step | Read computed style | Record colours; primary Verify uses the primary blue #175FEC | Capture | None |

## I. Gateway popup

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-90 | Popup opens once | P1 | Functional | Popup window | OTP done | Complete the OTP | One new window at /business/hyperpay/top-up with checkoutId and paymentMethod | Doc | TopupGatewayUI |
| TUI-91 | Popup shows the card form | P1 | Functional | Card form | Popup open | Look at the form | Card number, expiry, card holder, CVV and Pay now are shown | Doc | TopupGatewayUI |
| TUI-92 | Card number and CVV are in gateway frames | P1 | Functional | Card fields | Popup open | Inspect frames | Card number and CVV sit in iframes from the gateway host, not in the MJD Pay page | Doc | TopupSecurity |
| TUI-93 | Field placeholders | P3 | Functional | Card fields | Arabic | Read the placeholders | Card number "رقم البطاقة", expiry "شهر / سنة", holder "اسم حامل البطاقة", CVV "رمز التحقق (CVV)" | Doc | None |
| TUI-94 | Pay now state | P2 | Functional | Pay now | Popup open | Empty, then filled | Disabled until the fields are complete (exact rule not confirmed) | Doc | None |
| TUI-95 | Popup language and direction | P3 | Functional | Popup | Arabic | Read direction | Matches the app language | Capture | None |
| TUI-96 | Popup blocked message | P2 | Functional | Banner | Pop-ups blocked | Finish the OTP | Banner "Please allow pop-ups to continue the payment." on the form | Doc | None |

## J. Result screens

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-97 | Success title and text | P1 | Functional | Result texts | Paid | Read them | Title "دفعة ناجحة"; description "تمت معالجة دفعتك بنجاح" | Doc | TopupSuccessUI |
| TUI-98 | Success icon | P2 | Visual | Status icon | Paid | Inspect | Icon has class is-success; green tone (record colour) | Capture | TopupSuccessUI (class only) |
| TUI-99 | Success amount and reference | P2 | Functional | Result details | Paid | Read the screen | The amount and a transaction reference are shown | Doc | TopupSuccessUI |
| TUI-100 | Pending title and icon | P1 | Functional | Result | Gateway code 3 | Read them | Title "الدفعة قيد التأكيد"; icon is-pending; no success toast | Doc | TopupPendingUI |
| TUI-101 | Pending icon colour | P3 | Visual | Status icon | Pending | Inspect | Amber or neutral tone (record colour) | Capture | None |
| TUI-102 | Failed title and text | P1 | Functional | Result | Gateway code 2 or 4 | Read them | Title "فشلت الدفعة"; description about the payment being unsuccessful | Doc | TopupFailureUI |
| TUI-103 | Failed icon colour | P2 | Visual | Status icon | Failed | Inspect | Icon is-failed; red tone (record colour) | Capture | TopupFailureUI (class only) |
| TUI-104 | OK button | P1 | Functional | OK button | Any result | Read and click it | Label "موافق" (English: "OK"); primary style; click returns to an empty form | Doc | TopupSuccessUI, Pending, Failure |
| TUI-105 | Result is announced | P2 | Accessibility | Live region | Any result | Check aria-live | The result text sits in a polite live region | Doc | Success, Pending, Failure |
| TUI-106 | Reload on a result | P3 | Functional | Page | Any result | Reload | No second popup and no second payment | Doc | Success, Failure |
| TUI-107 | Only the result is shown | P2 | Functional | Page | Any result | Look at the page | Form, summary and balance card are hidden; sidebar and header stay | Doc | Success, Pending, Failure |

## K. Sidebar

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-108 | Logo and collapse button | P2 | Functional | Sidebar top | Any step | Look at the top | MajdPay logo and a collapse button | Doc | TopupShellUI |
| TUI-109 | Collapse and expand | P2 | Functional | Collapse button | Expanded | Click twice | Sidebar narrows, then returns to its original width | Doc | TopupShellUI |
| TUI-110 | Section labels | P3 | Functional | Section labels | Any step | Read them | Funds, Management, Products (Arabic equivalents in Arabic) | Doc | TopupShellUI |
| TUI-111 | Top-up entry is highlighted | P2 | Visual | Menu item | Top-up open | Look at the menu | The Add Funds item has the active style; others do not (record colours) | Capture | TopupShellUI (class only) |
| TUI-112 | Top-level links go to the right routes | P1 | Functional | Menu links | Any step | Read each href | Each link points to its documented route | Doc | TopupShellUI |
| TUI-113 | Transfer group expands | P2 | Functional | Menu group | Any step | Click Transfer | Withdraw, Wallet Transfer and International Transfer (coming soon) appear | Doc | TopupShellUI |
| TUI-114 | Account Management group expands | P2 | Functional | Menu group | Any step | Click it | User Management and Beneficiary Management appear | Doc | TopupShellUI |
| TUI-115 | Disabled "coming soon" items | P2 | Functional | SADAD, International Transfer | Any step | Click and press Enter | No link, no navigation, shown as disabled (record colour and opacity) | Doc | TopupShellUI |
| TUI-116 | Footer buttons | P2 | Functional | Sidebar footer | Any step | Look at the footer | Company or user block and a logout button (accessible name "تسجيل الخروج"; 40x40; glyph #5B6B82; radius 12px) | Measured | TopupShellUI |
| TUI-117 | Logout | P1 | Functional | Logout button | Any step | Click it | The session ends and the login page opens | Doc | None |

## L. Header and profile menu

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-118 | Header content | P2 | Functional | Header | Any step | Look at the header | Page title, notification bell, profile avatar | Doc | TopupShellUI |
| TUI-119 | Notification bell name | P2 | Accessibility | Bell | Any step | Read the accessible name | A name is exposed (today none: known gap) | Doc | TopupShellUI |
| TUI-120 | Avatar style | P3 | Visual | Avatar | Any step | Read computed style | Round avatar with initials; record size and colours | Capture | None |
| TUI-121 | Profile menu is closed at start | P3 | Functional | Profile menu | Any step | Look at the page | The menu is hidden until the avatar is clicked | Doc | TopupShellUI |
| TUI-122 | Profile menu items | P2 | Functional | Profile menu | Menu open | Read the items | Settings, Profile, Notifications, Dark Mode, Language, Wallet Setup, Logout | Doc | TopupShellUI |
| TUI-123 | Language button style | P3 | Visual | Language button | Menu open | Read computed style | Label "العربية"; colour #1582EE; background #F1F5F9; radius 7px; bold | Measured | TopupPreferencesUI |
| TUI-124 | Menu closes on outside click and Escape | P3 | Functional | Profile menu | Menu open | Click outside, then reopen and press Escape | The menu closes both times | Capture | None |

## M. Language, theme and responsive

| ID | Title | Pri | Type | Element | Preconditions | Steps | Expected result | Value source | Existing automation |
|---|---|---|---|---|---|---|---|---|---|
| TUI-125 | Switch to English | P1 | Functional | Language | Arabic | Choose English | Page is LTR; title is "Top up"; every label on the form switches; no Arabic is left on the form | Doc | TopupPreferencesUI |
| TUI-126 | Language survives reload | P2 | Functional | Language | English chosen | Reload | Still English | Doc | TopupPreferencesUI |
| TUI-127 | Every step in English | P2 | Functional | All steps | English | Walk the form, summary and OTP | Texts match the English column of the KB; no untranslated keys or mixed languages | Capture | None |
| TUI-128 | Dark mode | P2 | Visual | Theme | Light | Turn Dark Mode on and off | Page background and text swap and swap back; text stays readable | Doc | TopupPreferencesUI |
| TUI-129 | Dark mode on the form | P3 | Visual | Form | Dark mode on | Look at cards, chips, buttons | Cards, chips and buttons keep enough contrast; record the dark colours | Capture | None |
| TUI-130 | Phone width layout | P2 | Visual | Page | 390 wide | Open the form | Hamburger menu shown; sidebar hidden; cards stack; chips wrap; no horizontal scroll | Doc | TopupShellUI |
| TUI-131 | Tablet width layout | P3 | Visual | Page | 768 wide | Open the form | Layout adapts without overlap | Capture | None |
| TUI-132 | Keyboard order | P2 | Accessibility | Page | Form step | Press Tab repeatedly | Focus moves in a logical order: methods, amount, chips, Proceed; the focus ring is always visible | Capture | TopupFormUI (one step) |
| TUI-133 | Colour contrast | P3 | Accessibility | Text | Form step | Check key pairs | Body text, muted text and faint text meet 4.5:1 on white; faint text #8794A8 on white is below 4.5:1 and should be reviewed | Measured | TopupStyleFormUI |

## Findings from the live capture (2026-10-18)

| # | Finding | Evidence |
|---|---|---|
| F1 | A zero amount highlights the field with a #C81E1E border and shows no error text (confirmed as the intended design by the user, 2026-10-18). The old KB line "Amount should be more than 0" and the skipped `TopupFormUI` case expect a message that is not part of the design | Probe state `form-zero-amount` |
| F2 | Summary for 500: commission 5.00, VAT 0.75, total 505.75. This adds the fee on top of the amount. The business cases say total = amount - commission with VAT inside the commission. One of them is wrong | Probe state `summary` |
| F3 | Summary subtitle reads "راجع التفصيل" (the manual doc expects "التفاصيل"). The KB already lists this spelling as the expected one in `TopupSummaryUI` | Probe state `summary` |
| F4 | The faint text colour #8794A8 on white is about 3:1, below the 4.5:1 minimum for small text (balance label and wallet code) | Computed colours |
| F5 | Disabled Proceed is the normal blue at 50% opacity with a not-allowed cursor | Probe state `form-fresh` |
| F6 | Not captured in this pass: OTP step, gateway popup, result screens, sidebar items, hover and focus states, dark mode. Those cases are marked `Capture` | Probe did not reach them |

## Automation summary

| Layer | Count | Note |
|---|---|---|
| Already proven in `Topup/ui` | see the "Existing automation" column | Not rewritten |
| New and measurable now (Measured) | cases whose value is filled in | Can use `toHaveCSS` on the values above |
| Capture first | cases marked `Capture` | First run records the value, then it is written into this file and asserted |
