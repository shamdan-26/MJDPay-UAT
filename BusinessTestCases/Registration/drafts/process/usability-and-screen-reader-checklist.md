# DRAFT — usability heuristics and screen-reader checklist for Registration (unverified)

Axe-core (see `ui/shared/RegistrationAccessibility.spec.ts`) finds roughly a third of accessibility issues. This manual
checklist covers the rest. Run once per release and after UI redesigns. Record pass / fail / n.a. and a screenshot per fail.

## A. Screen reader pass (NVDA + Firefox/Chrome on Windows; VoiceOver + Safari on iPhone)
| # | Check | Step |
|---|---|---|
| A1 | Page title announced and changes meaningfully per step | all |
| A2 | Heading structure is logical (one h1, steps as h2) | all |
| A3 | Form fields announce label, required state, hint and error together | Mobile, Info, Financial, Verification |
| A4 | OTP boxes announce "digit N of 6"; paste fills all; focus moves automatically; errors are announced without moving focus | OTP |
| A5 | Dialog traps focus, Esc closes (if allowed), focus returns to the trigger | OTP, any confirm |
| A6 | Dropdowns announce selected value and option count; type-ahead works | Financial |
| A7 | File upload announces progress, success and failure | Verification |
| A8 | Countdown (OTP, Nafath) is not announced every second (no chatty live region) but expiry is | OTP, Nafath |
| A9 | Step indicator announces current step ("step 2 of 4") | all |
| A10 | Error toasts use `role=alert`/live region and persist long enough to read | all |

## B. Keyboard-only
- Every control reachable with Tab in visual order; no focus trap outside dialogs; visible focus ring (≥ 3:1 contrast).
- Enter submits forms; Space toggles checkboxes/radios; arrow keys move within radio groups and listboxes.
- Skip link or logical first focus; no keyboard-inaccessible custom controls (profile cards, product cards, upload area).

## C. Visual / cognitive
- Text contrast ≥ 4.5:1 in light **and** dark; error colour not the only error indicator.
- Zoom to 200% and 400%: no loss of content, no horizontal scroll at 320 CSS px.
- Respect `prefers-reduced-motion`; no flashing; timers can be extended or restarted (resend).
- Plain-language error messages that say what to do next; consistent button labels (Next/Back/Cancel) across steps.

## D. Nielsen heuristics (quick scoring 0–4 each, note evidence)
1. Visibility of system status (spinners, progress, save state)  2. Match with the real world (Arabic business terms: CRN =
السجل التجاري)  3. User control and freedom (Back keeps data, Cancel confirms)  4. Consistency and standards  5. Error
prevention (input masks, disabled Next with reason)  6. Recognition rather than recall (hints under fields)  7. Flexibility
(paste, autofill, resume)  8. Minimalist design  9. Help users recover from errors  10. Help and documentation (contact
support link on failure).

## E. Findings log
`id | step | heuristic/WCAG ref | severity (blocker/major/minor) | evidence | proposed fix`
