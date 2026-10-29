# Implementation and production-impact verification — 29 October 2026

Implementation is complete locally. Real-device acceptance and release checks remain outstanding. The current request authorizes implementation and a local commit; no new production rollout was performed.

Baseline: `f6b4a23d3c1b54d931e507f5850699f7a7a9b00a`, the preceding release reported deployed by the operator on 28 October. The candidate is the staged implementation reviewed against that baseline, then committed on the current branch. These results apply to its source changes, not the unrelated environment-example or memory edits left in the workspace.

## Required gates

| Check | Result |
|---|---|
| `npm run typecheck` | Passed repeatedly, including route type generation and the final source changes |
| `npm run lint` | Passed |
| `TEST_DATABASE_ADMIN_URL=postgres://localhost:5432/postgres npm test` | 373 passed, 55 suites, zero failures/skips; full suite ran once at the end |
| `npm run build` | Passed after the review fixes, including all 27 generated static pages |
| Focused Staff Check-In flow and Account access tests | 17 passed; existing agreed seams retained |
| Final source/whitespace checks | Passed |
| New-release CI / Docker image | Not run here: no new push or production image rollout was performed |

The database endpoint was verified as the local Homebrew PostgreSQL 17 service. Browser fixtures and the suite used freshly migrated disposable databases; application databases and live credentials were not modified. All disposable test databases were removed; the final metadata query reported zero remaining `stem_test_*` databases.

## Browser verification

Checked the production build on loopback with installed Chrome and cached Playwright, real authentication/Server Actions, disposable databases and synthetic Registrations/Accounts. SMTP delivery was disabled. No browser framework or permanent test seam was added to the repository.

Red-before-green checks exercised the actual UI:

- A recorded arrival initially left the outer panel white: `[255,255,255,255]`; the same check passed after full-panel color ownership moved into the Staff result presentation.
- The phone navigation check initially found no bottom navigation; the same authenticated navigation/Account-sheet scenario passed after implementation.
- The review's 744×1133 tablet case initially lost its existing menu trigger; it passed after compact screen classification was separated from the old 768px mobile threshold.
- The Account sheet initially measured about 292px high in a 667×240 viewport. After bounding its height and enabling internal scrolling, the same short-height check passed with the sheet inside the viewport.

Final combined acceptance passed:

- Full-panel neutral/green/yellow/red presentation, no-Event-Day and session-ended warnings, invalid pass and inspection failure, and the agreed normal/confirm/retry/secondary button palette.
- Read-only preview and Cancel; real confirmation; existing timestamps and no duplicate on repeat; wrong-day warning; an HTTP confirmation response discarded after its real write, followed by the retained pass/day and a safe retry.
- Admin icons for all four sections plus Account, Staff Check-In/Account only, no ordinary links for an Account that must choose its password, nested Registration/Account-management highlighting and personal My Account kept distinct.
- Account bottom-sheet dismissal and focus restoration, My Account navigation and real Sign out. Signed-out pages and the separate Kiosk have no bottom navigation.
- Phone portrait/landscape layouts, no horizontal page overflow, hidden redundant sidebar trigger, content clearance and simulated keyboard/toolbar changes. A focus event without a viewport reduction kept the bar visible; a keyboard-sized reduction hid it; it stayed hidden during dismissal and returned after restoration.
- Simulated iPad layouts retained the existing menu; the dedicated 744×1133 tablet and 667×240 short-sheet cases passed after review fixes.

A separate regression harness reused the previous Staff desk integration: real QR video through html5-qrcode's existing ZXing fallback; continuous scanning and held-QR suppression; camera start/stop and permission denial; manual fallback; deleted/concurrently recorded passes; disabled/expired sessions; Staff/Admin entry-point guards; and separate-Kiosk immediate/current-day enforcement. It passed. Headless Chrome's native BarcodeDetector remained disabled only in this harness, as in the prior verification; product decoder configuration was unchanged.

Disposable local evidence (not permanent repository artifacts):

- `/tmp/back-office-visual-evidence/`: screenshots, result summary and server log.
- `/tmp/back-office-camera-regression/`: scanner/session/Kiosk regression evidence.
- `/tmp/back-office-short-sheet-evidence/` and `/tmp/back-office-ipad-mini-evidence/`: targeted browser checks.
- `/tmp/back-office-final-tests.KRCEQV`: the full-suite output.

The checks used temporary harnesses outside the repo. One combined run under concurrent test load timed out during fixture sign-in, and another fixture setup correctly hit the existing per-IP sign-in limit. The final browser checks ran with distinct fixture IPs and sequential server ownership and passed. Product rate limits were unchanged. These infrastructure failures are not counted as successful checks.

## Standards

The independent Standards review found zero documented violations and zero substantive baseline smells. Request-time session reads remain under Suspense, browser props contain only menu fields, destination permissions remain shared, and action styling stays scoped to the Staff desk. The follow-up review of the final fixes also reported zero findings.

## Spec

The independent Spec review found two P2 issues: the original screen-size rule included smaller iPads, and the original Account sheet could exceed a short landscape viewport. Both were reproduced, corrected and rechecked. The follow-up review reported zero unresolved Spec findings. Hardware acceptance was explicitly excluded from claims based on source or emulation.

## dev-check-prod assessment

**VERDICT: BLOCKED for production rollout.** Local implementation and checks are complete; required real-device evidence, release-SHA CI and the scheduling decision for the active freeze are still missing. **POST-DEPLOY: NOT VERIFIED for this candidate.** The previous release's healthy startup is not post-deploy evidence for these changes.

Evidence commands run against the staged candidate:

```sh
git diff --cached --exit-code f6b4a23 -- src/lib/db src/lib/auth src/lib/registrations src/lib/server src/proxy.ts drizzle Dockerfile docker-compose.yml next.config.ts package.json package-lock.json
```

Result: exit `0`, empty output. The schema, committed migrations, domain operations, auth rules/composition, Event Pass codec, Proxy, package lock and container configuration are unchanged in this release. This limits the finding to the reviewed diff; it does not independently inspect current production drift or secrets.

| Area | Impact and evidence |
|---|---|
| Registration / existing data | No domain or schema change in the above diff; full real-database suite passed. New CSS is scoped to the signed-in phone shell and Staff UI. No production write was made. |
| Existing Event Passes | Codec, stored UUID/Pass Code schema, public pass routing and email generation have no diff. Confirmation/repeat browser regressions and the database suites passed with existing synthetic passes. Live Attendee passes were not exposed or used for test arrival records. |
| Accounts / Back Office | Intentional menu presentation change. Shared access rules and server guards are unchanged; authenticated browser checks covered Admin, Staff, must-change-password, sign-out and Kiosk restrictions. Only name/email and the permitted Account kind reach the new menu. |
| Staff desk / separate Kiosk | Intentional full-panel colors, action palette and phone navigation. Existing lifecycle and authoritative writes are unchanged; 17 focused pure tests, database tests and real Server Action/scanner checks passed. Kiosk receives neither the bar nor Staff-only action styling. Device camera/VoiceOver behavior remains unverified. |

An unchanged schema is not a claim that migrations are automatically a no-op on every database. The operator previously supplied a seven-entry production journal whose hashes/timestamps matched the baseline. Reconfirm production identity/history if state changes before the next rollout; the local test journal is not production evidence. Preserve the existing auth/action keys and database volume.

## Required before release

- [ ] Real iPhone Safari, portrait and landscape: safe area, icon touch targets, glass readability and VoiceOver names/current-section indication.
- [ ] Real iPhone keyboard open/close on Pass Code and other forms; rotate with keyboard open, scroll with Safari toolbars moving, and verify the bar hides/restores without blocking controls or leaving gaps. Emulated viewport changes are supplemental evidence only.
- [ ] Real iPad, including a smaller iPad when available: existing sidebar/drawer, desk layout, camera permissions/start/switch/stop and manual fallback. Regression-check the separate Kiosk on real hardware.
- [ ] Record tester/device/browser/date/outcome for those checks. Tickets 04–06 retain the outstanding acceptance instead of treating simulated devices as completion.
- [ ] Verify the final release commit on remote and its CI, including the Docker/Compose/nginx job. The previous release's CI is not the candidate's CI.
- [ ] Honor ADR 0004's 29 October–1 November 2026 freeze. This implementation request does not authorize a production scheduling exception. Prepare a verified private backup/off-server copy and a quiet rollout window under the operator guide before any later deployment.
- [ ] After a separately authorized rollout, verify the running revision/image, health and migration logs, existing Event Pass pages, Account access and Staff/Kiosk behavior; reload all desks/Kiosks. Keep post-deploy checks marked unverified until performed.

For keyboard integration background, the platform distinguishes the visual viewport from the layout viewport; the on-screen keyboard can shrink the former. See the [VisualViewport API documentation](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport). This explains the measurement boundary, not a guarantee that Chrome emulation proves Safari hardware behavior.

## File-review coverage

Candidate: **24/24 files classified (100%)**. This is review coverage, not test coverage.

| File | Category | Reviewed effect |
|---|---|---|
| `.agents/skills/dev/dev-check-prod.md` | Agent guidance | Project-specific production review workflow; excluded from Docker image. |
| `.scratch/back-office-status-and-mobile-navigation/issues/01-full-panel-check-in-colors.md` | Tracker | Slice criteria, dependencies and honest completion/acceptance status; excluded from image. |
| `.scratch/back-office-status-and-mobile-navigation/issues/02-staff-action-colors.md` | Tracker | Slice criteria, dependencies and honest completion/acceptance status; excluded from image. |
| `.scratch/back-office-status-and-mobile-navigation/issues/03-phone-glass-navigation.md` | Tracker | Slice criteria, dependencies and honest completion/acceptance status; excluded from image. |
| `.scratch/back-office-status-and-mobile-navigation/issues/04-phone-orientation.md` | Tracker | Slice criteria, dependencies and honest completion/acceptance status; excluded from image. |
| `.scratch/back-office-status-and-mobile-navigation/issues/05-phone-keyboard.md` | Tracker | Slice criteria, dependencies and honest completion/acceptance status; excluded from image. |
| `.scratch/back-office-status-and-mobile-navigation/issues/06-integrated-release-verification.md` | Tracker | Slice criteria, dependencies and honest completion/acceptance status; excluded from image. |
| `.scratch/back-office-status-and-mobile-navigation/spec.md` | Specification | Accepted Q1–Q8 and existing testing seams; excluded from image. |
| `.scratch/back-office-status-and-mobile-navigation/verification.md` | Verification | This evidence and release-readiness report; excluded from image. |
| `.scratch/check-in-ui-redesign/context.md` | Design record | Accepted follow-up and link to the new specification; excluded from image. |
| `src/app/admin/(back-office)/_shell/back-office-destinations.ts` | Runtime UI | Shared destination/permission definitions and current-section matching; routes unchanged. |
| `src/app/admin/(back-office)/_shell/back-office-nav.tsx` | Runtime UI | Sidebar consumes shared destinations; existing sidebar behavior retained. |
| `src/app/admin/(back-office)/_shell/back-office-sidebar.tsx` | Runtime UI | Hide the old presentation only in phone mode. |
| `src/app/admin/(back-office)/_shell/current-phone-navigation.tsx` | Runtime UI | Server session read below Suspense; limited menu props and password-change restriction. |
| `src/app/admin/(back-office)/_shell/page-header.tsx` | Runtime UI | Remove redundant phone toggle; preserve larger-screen toggle. |
| `src/app/admin/(back-office)/_shell/phone-navigation-layout.tsx` | Runtime UI | Phone classification and scoped keyboard/navigation state with listener cleanup. |
| `src/app/admin/(back-office)/_shell/phone-navigation.tsx` | Runtime UI | Role-filtered icon bar, current section and bounded accessible Account sheet. |
| `src/app/admin/(back-office)/_shell/staff-account-dropdown.tsx` | Runtime UI | Share existing Account display/type with the phone sheet. |
| `src/app/admin/(back-office)/check-in/camera-scanner.tsx` | Runtime UI | Color only non-Kiosk camera controls; decoder/lifecycle unchanged. |
| `src/app/admin/(back-office)/check-in/check-in-desk.tsx` | Runtime UI | Use the persistent full-panel result component and scoped normal-action color. |
| `src/app/admin/(back-office)/check-in/staff-action-styles.ts` | Runtime UI | Local Staff action palette; global Button unchanged. |
| `src/app/admin/(back-office)/check-in/staff-check-in-result.tsx` | Runtime UI | Full-panel status colors and recovery/action presentation; lifecycle unchanged. |
| `src/app/admin/(back-office)/layout.tsx` | Runtime UI | Phone shell, request-time menu boundary and signed-in safe-area viewport. |
| `src/app/globals.css` | Runtime UI | Scoped glass/clearance/scroll-padding styles; no public/Kiosk shell match. |

Additional workspace changes, outside the candidate: **2/2 classified**. `.env.example` is the pre-existing configuration/credential-template edit and `memory.md` is the pre-existing handoff update. Neither is staged or committed with this feature; secret values are not reproduced. Combined candidate/workspace classification is **26/26** with no unknown file category.
