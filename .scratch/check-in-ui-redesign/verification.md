# Staff Check-In redesign verification — 27 October 2026

Implementation is complete locally. Production rollout remains gated on the real-iPad acceptance below. No deployment or production-data change was performed.

## Automated checks

- `npm run typecheck`: passed, including Next route type generation.
- `npm run lint`: passed.
- `npm test`: 373 tests passed, 55 suites, zero failures/skips. The full suite ran once; the final presentation-only change moved announcements to a persistent status region and retained native headings.
- `npm run build`: passed with Cache Components enabled, including the final presentation changes.
- Focused new seams: six real-database Registration tests and eight pure Staff Check-In flow tests passed. They cover read-only lookup, supported pass formats, limited returned data, concurrency/retry, existing timestamps, wrong-day admission, invalid/deleted passes, reviewed-day preservation across midnight, input locks, stale responses, session expiry and held-QR handling.
- Two independent code-review axes against implementation baseline `8b3bd56079b6f6606cd8cce4f2dfeb09440c7379`: Standards — no findings; Spec — no findings. A follow-up review of the persistent live region and scanner comment/name cleanup also found no regressions.

## Local browser integration

Checked the production build on loopback using cached Playwright and installed Chrome, without adding a browser framework or dependency to the repository. The harness created a freshly migrated disposable database, synthetic Registrations and Admin/Staff/Kiosk Accounts. It used real authentication and Server Actions. These checks are supplemental integration evidence, not a new permanent test seam.

- Staff and Admin inspection opens a preview with zero Check-Ins; Cancel leaves zero. Confirmation records one Check-In with the signed-in Account.
- Manual Enter inspects only, dismisses input focus, and locks further input/date changes during review. The page does not autofocus the input on entry.
- Existing and invalid passes cannot be confirmed. Wrong-day arrival remains an explicit decision, then shows recorded success plus the warning.
- After a real confirmation write, the harness discarded its HTTP response. The desk retained the Attendee/day, showed Unable to confirm result, offered Retry confirmation without Cancel, and retrieved the original Check-In without duplication.
- A Registration removed after preview returns an invalid-pass result on confirmation. A Check-In recorded by another desk after preview returns the original recorded outcome, with one row.
- A disabled Staff Account cannot confirm an existing preview. Expired-session recovery goes through sign-in and opens a fresh idle desk without replaying confirmation.
- Browser-level camera permission denial shows Retry camera and leaves manual entry enabled.
- Anonymous requests redirect to sign-in. Invalid-session and Kiosk requests to both Staff entry points return signed-out rather than previewing or recording.
- The separate Kiosk automatically starts its scanner and processes the QR through its immediate action without a Staff confirmation. On the actual off-Event date, both a normal scan and a Kiosk action supplying a forged configured day return not-an-event-day and record nothing; its Account is redirected from the Staff desk to `/kiosk`.
- Legacy `/admin/check-in?kiosk=1` renders the Staff desk with no Staff Kiosk entry.
- Layout checked at 1024×768, 768×1024, 390×844, 512×384 (small/zoom-equivalent viewport), and 1440×900, including a long Thai name. No horizontal overflow; confirmation stays reachable by scrolling; narrow screens place result/actions above camera/input; date choices wrap. Sidebar entry collapse and manual toggling were checked.
- A QR video through the real scanner library exercises continuous scanning, read-only preview, Cancel/success suppression while the same QR remains visible, manual deliberate reinspection, and camera stopping. The pure flow tests additionally cover removal/re-presentation and immediate admission of a different QR.

Camera environment limitation: Chrome's native `BarcodeDetector.detect()` did not settle in this headless environment. Camera integration therefore used the browser flag `--disable-blink-features=BarcodeDetector` to exercise html5-qrcode's existing ZXing fallback. Product decoder configuration was unchanged. This does not establish native-decoder or iPad camera behavior.

Temporary, synthetic-only browser evidence is in `/tmp/staff-desk-evidence/` (screenshots and `result.json`); test output is in `/tmp/staff-desk-full-tests.log` and `/tmp/staff-desk-browser.log`. These paths are local, disposable artifacts rather than committed acceptance evidence.

## Required before rollout

- [ ] On a real iPad in landscape, verify camera permission allow/deny, Retry camera, front/back preference and switching, stopping, and a continuously running preview between Attendees.
- [ ] Hold the same real QR through Confirm, Cancel and Scan next: it must stay suppressed. Remove/re-present it, then try a different QR immediately when ready. Check under entrance lighting and realistic processing load. The implementation uses a 1.2-second interval without a successful decode as its removal proxy; validate that threshold on the actual device.
- [ ] Verify manual on-screen keyboard dismissal, touch controls, date wrapping, long names, sidebar states, portrait/short-height scrolling and actual browser zoom.
- [ ] Verify VoiceOver announces the changed status and Attendee in the persistent live region, with useful keyboard focus and explicit confirmation.
- [ ] Regression-check the separate Kiosk on a real device, including automatic camera startup and immediate Check-In on the current Event Day, duplicate suppression, result clearing and session-expiry recovery. Off-Event-Day enforcement and database rules can be checked locally; device behavior still needs acceptance.
- [ ] Record device/browser, tester, date and outcome here, then perform rollout before the 29 October freeze. The existing freeze has not been lifted.

Tickets 02 and 03 stay ready-for-human for these device/release checks; code implementation is complete. This record does not mark unavailable hardware validation as passed.
