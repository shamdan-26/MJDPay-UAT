# DRAFT — real-device and browser-engine coverage for Registration (unverified)

The suite runs desktop Edge and emulated viewports. The wizard is likely used mostly on phones, where real behaviour
differs: virtual keyboard, touch targets, SMS one-time-code autofill, Safari quirks.

## Target matrix (adjust to analytics)
| Tier | Device / browser | Why |
|---|---|---|
| 1 | iPhone (latest iOS) Safari | Safari/WebKit date, input, `100vh`, autofill quirks |
| 1 | Pixel / Samsung Galaxy (Android 13+) Chrome | largest KSA Android share |
| 2 | Samsung Internet | default browser on Samsung phones |
| 2 | Low-end Android (2 GB RAM, Android 10) Chrome | performance budgets, jank |
| 2 | iPad Safari | tablet layout (768 px) |
| 3 | Huawei Browser / in-app WebViews (WhatsApp, Instagram) | links opened from messages |

## Where to run
1. **Playwright device emulation** (free, in CI): `devices['iPhone 14']`, `devices['Pixel 7']`, `devices['iPad (gen 7)']` —
   see `RegistrationMobileDevices.draft.ts`. Covers viewport, touch, UA, DPR; NOT real keyboard/autofill.
2. **BrowserStack / Sauce Labs real devices** (paid): run the same mocked specs through their Playwright integration or
   do a manual pass using the checklist below.
3. **Own devices**: manual pass before each release.

## Manual real-device checklist (10 minutes per device)
- Mobile field opens the numeric keypad; Next is reachable above the keyboard without scrolling.
- OTP boxes: iOS/Android offers the SMS code above the keyboard and fills all six boxes; paste works.
- Rotate portrait ↔ landscape on OTP and Contract: nothing clipped; keyboard does not cover Verify.
- Upload IBAN/VAT: file picker offers camera/gallery/files; a 4 MB photo uploads on mobile data.
- Arabic RTL: no mirrored icons pointing the wrong way, numerals consistent, no overflow on a 320 px screen.
- Dark mode follows the OS setting; contrast readable in sunlight (brightness high).
- Back gesture/button does not lose progress; refresh resumes.
- Pinch-zoom allowed (accessibility); text at 200% system font size is not truncated.
- Slow network (3G profile): spinners shown, no double-submit on repeated taps.
