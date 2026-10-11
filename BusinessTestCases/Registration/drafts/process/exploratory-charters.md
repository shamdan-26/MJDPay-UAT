# DRAFT — exploratory testing charters for Registration (unverified)

Session-based exploratory testing: 60–90 minute timeboxed sessions, one charter each, notes in the template below.
Use after any change to the wizard, and once per release for the high-risk charters (marked ★).

## Charter format
`Explore <area> with <resources/technique> to discover <risks>.` Record: setup, what was tried, bugs (with evidence),
questions, ideas for automation, % of time on test / bug investigation / setup.

## Charters
1. ★ **Resume paths** — Explore leaving the wizard at every step (close tab, kill network, switch device, wait 30 min) with
   the same mobile/CRN to discover where the applicant lands and whether any step is skipped or duplicated.
2. ★ **Two devices, one applicant** — Explore the same identity on phone and laptop at the same time to discover session
   collisions, duplicate profiles and stale-state submits.
3. ★ **Identity edge cases** — Explore Saudi ID vs Iqama, expired/inactive CRN, CRN of a branch, ID belonging to another
   person, name mismatches (Arabic vs English spelling) to discover wrong accept/reject decisions.
4. **Upload realism** — Explore real-world files (phone photos, scanned PDFs with stamps, 300-dpi images, HEIC, Arabic file
   names with spaces, files from cloud drives) to discover rejects of valid documents and accepts of invalid ones.
5. **Arabic-first usage** — Complete the whole journey in Arabic on a phone with Arabic keyboard and Arabic-Indic digits to
   discover mirrored-layout, numeral and truncation defects.
6. **Interrupted submits** — Explore tapping Next/Sign Up/Submit repeatedly, going Back mid-request, switching apps and
   toggling airplane mode to discover duplicates and stuck spinners.
7. **Products and money** — Explore selecting/deselecting products, PoS devices and delivery groups while watching totals,
   VAT and what the Contract finally lists, to discover mismatched amounts.
8. **Contract reading** — Explore scroll behaviour, zoom, language switch and download on long and short contract text to
   discover an agree checkbox that enables wrongly or contract text that differs from the PDF.
9. **Error messages** — Force every error you can (wrong OTP, expired OTP, duplicate, server down) and judge wording:
   specific? actionable? translated? leaking internals? consistent between toast and inline?
10. **Admin side-effects** — After a completed registration, explore the admin Business-accounts listing, activation emails,
    wallet and login to discover provisioning gaps (what the integration spec samples only once).
11. **Accessibility by hand** — Keyboard-only and screen reader (NVDA/VoiceOver) pass of the whole wizard (see checklist).
12. **Time** — Explore OTP boundaries (29s/30s/31s), session expiry while idle on each step, and clock changes on the device.

## Session note template
```
Charter:            Tester:            Date:        Build/env:
Duration (min):     Setup %  Test %  Bug %
Areas covered:
Bugs (id, title, evidence):
Questions / risks:
Automation ideas:
```
