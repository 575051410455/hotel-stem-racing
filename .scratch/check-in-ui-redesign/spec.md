# Spec: Centered Staff Check-In desk with preview and confirmation

Status: ready-for-human

Implementation and local checks completed on 27 October 2026. Real-iPad/VoiceOver acceptance and rollout remain outstanding; see [verification](verification.md).

This implements the design agreed in the 27 October 2026 interview, recorded in `context.md`. Vocabulary follows `GLOSSARY.md`; ADR 0006 establishes explicit confirmation at the staffed desk, alongside the Account boundaries in ADRs 0003 and 0004.

## Problem Statement

Staff find the current Check-In desk cluttered and difficult to operate. Its narrow vertical column puts the Event Day choices, large result square, camera, manual input and Kiosk explanation below one another. Staff cannot reliably see the active input and its result together, and it is unclear whether a result belongs to the previous Attendee or whether the desk is ready for the next one.

The current scan action records a Check-In immediately. The organiser wants Staff to see the Attendee and relevant status first, then deliberately confirm arrival. A lost confirmation response must not be presented as proof that nothing was recorded. The redesign must preserve duplicate protection, existing Event Day rules and Account permissions while making these stages obvious.

## Solution

Replace the staffed Check-In desk with a working station centered horizontally and vertically in the content below the Back Office header. On an iPad in landscape, place the camera and compact Pass Code entry on the left and the Attendee preview, status and confirmation actions on the right. Center the preview content and actions within their panel. Show Event Day choices above as a row that wraps. Collapse the sidebar when entering the desk, with its menu trigger still available.

Both QR scanning and manual submission first inspect an Event Pass without recording arrival. Hold the current Attendee for **Confirm Check-In** or **Cancel**. Confirmation records at most one Check-In for the reviewed Event Day, then automatically makes the desk ready for a different Attendee. Distinguish the last result from the scanner's current readiness. An already-recorded or invalid pass offers **Scan next** instead of a confirmation action.

Use short English text, prominent names and statuses, and text plus icons alongside color. Provide explicit recovery for camera failure, session expiry and an uncertain confirmation response. Remove Kiosk-mode entry from the staffed desk and make old Staff Kiosk-mode links open the new desk. The separate Kiosk retains its existing workflow.

## User Stories

1. As a Staff member, I want the active input and Check-In information visible together on an iPad in landscape, so that I can process an Attendee without scrolling between them.
2. As a Staff member, I want the working station centered in the available content area, so that the page feels focused and uses the screen effectively.
3. As a Staff member, I want a two-column landscape layout with the camera on the left and the result on the right, so that I can scan and inspect the outcome in one glance.
4. As a Staff member, I want the sidebar collapsed when I enter this desk, so that it does not consume the working area.
5. As a Staff member, I want the menu trigger to remain available, so that I can still navigate to the pages my Account may use.
6. As a Staff member, I want to start the camera with one explicit tap, so that I am ready before the browser asks for camera permission.
7. As a Staff member, I want the camera to stay open between Attendees, so that I do not repeat setup for every Event Pass.
8. As a Staff member, I want camera switching and stopping to remain available, so that I can use the appropriate camera on the device.
9. As a Staff member, I want a compact Pass Code input when scanning is unavailable, so that I can still check an Attendee in.
10. As a Staff member, I want opening the desk to leave the on-screen keyboard closed, so that it does not cover the camera or status.
11. As a Staff member, I want submitting a Pass Code with Enter to open the same preview as scanning, so that both input methods follow one workflow.
12. As a Staff member, I want the on-screen keyboard dismissed after submitting a code, so that I can inspect the preview and confirmation actions.
13. As a Staff member, I want to see the scanned Attendee's name and relevant Check-In status before anything is recorded, so that I can check the pass holder before confirming arrival.
14. As a Staff member, I want Attendee Role, Pass Code and Event Day shown as secondary information, so that I can resolve uncertainty without a crowded screen.
15. As a Staff member, I want an explicit Confirm Check-In action, so that presenting a QR alone does not create an arrival record at this desk.
16. As a Staff member, I want to cancel a preview without recording anything, so that an accidental scan can be discarded.
17. As a Staff member, I want the current Attendee held while I inspect or confirm them, so that another QR or manual submission cannot overwrite their information.
18. As a Staff member, I want a clear pending state and disabled repeat confirmation while a request is in progress, so that I know the desk is working on the current person.
19. As a Staff member, I want the desk to become ready automatically after a successful confirmation, so that I do not press Next for every Attendee.
20. As a Staff member, I want the previous result labeled separately from current readiness, so that a previous green result is not mistaken for a new successful Check-In.
21. As a Staff member, I want a different Attendee's QR accepted immediately once the desk is ready, so that the workflow does not impose a delay on everyone.
22. As a Staff member, I want a QR still held in view after completion, cancellation or Scan next to stay suppressed until removed, so that the same Attendee does not reopen immediately.
23. As a Staff member, I want an already-recorded Check-In to show its original time and Scan next, so that I can recognize a repeat without recording another arrival.
24. As a Staff member, I want to inspect a wrong-day warning before confirming, so that I can still admit an Attendee under the existing Event Day rules.
25. As a Staff member, I want the successful recorded outcome clear even when a wrong-day warning applies, so that I know what has already happened.
26. As a Staff member, I want an invalid Event Pass to state that no Check-In was recorded, so that I can ask for a valid code and continue deliberately.
27. As a Staff member, I want Event Day choices in a compact wrapping row, so that the choices remain visible without a large settings section.
28. As a Staff member, I want the desk to follow today's Event Day by default and make a chosen different day obvious, so that I can operate correctly and test before the Event.
29. As a Staff member, I want the reviewed Event Day locked during an active preview or confirmation, so that the write uses the same day I inspected.
30. As a Staff member, I want an uncertain confirmation to retain the same Attendee and day with Retry confirmation, so that I can recover without guessing whether arrival was recorded.
31. As an organiser, I want repeated or concurrent confirmations to preserve one Check-In per Registration and Event Day, so that retries and multiple desks do not create duplicate records.
32. As an organiser, I want confirmation to recheck current server state, so that an old or altered preview cannot override deletion, an existing Check-In or current authorization.
33. As a Staff member, I want camera failure to leave Pass Code entry and Retry camera available, so that a camera problem does not stop the desk completely.
34. As a Staff member, I want session expiry to stop confirmation and offer Sign in again, so that an expired session cannot silently fail or record under the wrong Account.
35. As a Staff member, I want to inspect the pass again after signing in, so that a stale preview is never confirmed automatically.
36. As a Staff member, I want concise English labels and status messages, so that the desk remains consistent with the Back Office and is quick to read.
37. As a Staff member, I want colors reinforced with explicit text and icons, so that I can distinguish preview, success, repeat and failure without relying on color alone.
38. As a Staff member using a phone, keyboard, zoom or a screen reader, I want all names, messages and actions available, so that the layout remains usable when the screen or input method changes.
39. As a Staff member opening an old Kiosk-mode bookmark for this page, I want the new confirmation desk, so that an old link does not silently restore immediate recording.
40. As an organiser, I want the separate Kiosk and Account boundaries preserved, so that the Staff redesign does not alter unattended Check-In or expose Registration browsing to Staff or Kiosk Accounts.
41. As a maintainer, I want preview and confirmation verified through the Registration module and desk transitions through one pure flow seam, so that tests protect behavior without depending on React internals.
42. As an organiser, I want the completed flow checked on a real iPad and ready before the Event, so that the redesign is useful at the entrance rather than merely passing desktop checks.

## Implementation Decisions

- Scope this redesign to the staffed Check-In desk used by Admin and Staff Accounts. Preserve the separate Kiosk's immediate Check-In behavior and existing Account restrictions. Remove the staffed desk's old Kiosk branch as well as its entry and explanatory content.
- Add read-only scan inspection to the Registration module. It resolves the same supported Pass Code, token and Event Pass link forms as Check-In, validates the Event Day, and returns the effective Event Day, the limited Attendee details needed at the entrance and any existing Check-In for that day. Inspection must not insert a Check-In or change counters or other Registration state.
- Keep confirmation as an authoritative Registration operation, reusing the established duplicate and wrong-day rules. Re-resolve and validate the submitted pass and reviewed Event Day at confirmation time. Do not trust Attendee fields, a client-side preview result or a claimed Account ID as authority to write.
- Guard Staff inspection and confirmation with current Admin/Staff authorization at their server entry points. Obtain the recording Account from the session. Do not add public preview endpoints, name search, contact details, full Registration detail access or pass resend for Staff.
- Share pass resolution and Event Day rules where appropriate so inspection and confirmation agree. Keep the existing unique Registration/Event Day constraint as the authority for concurrent and retried writes. No schema migration or preview-reservation table is expected.
- Return a read-only ready-to-confirm result for a valid pass with no existing Check-In. Return the original timestamp for an existing Check-In, a clear not-found result for an invalid or removed pass, and a no-Event-Day result when no valid day can be used. The browser must not infer successful recording from a successful lookup.
- Preserve the Event Day that the server resolved for the inspected pass through confirmation and retry, even if the clock advances while Staff review it. Lock date choices for the active item. After returning to idle, following today can use the server's current Event Day again; a deliberately selected day remains explicit.
- Recheck mutable state at confirmation. If another desk recorded the Check-In after preview, return the existing recorded outcome. If the Registration has been removed, report that it can no longer be checked in rather than using the stale preview.
- Use a pure **Staff Check-In flow** module as the one new browser-behavior seam. It owns active-item identity, reviewed day, readiness, preview/confirmation/pending/uncertain-result transitions, cancellation and stale-response rejection. Keep network calls, camera hardware and React rendering at its boundaries.
- Process one active Attendee at a time. Hold additional camera and manual submissions while inspecting, reviewing or confirming. Ignore responses that belong to an obsolete item. Disable actions that could submit the same confirmation again while its request is pending.
- Both camera and manual entry first inspect. The manual Enter key never confirms. Before confirmation, Cancel clears the preview and records nothing. An in-flight or uncertain confirmation must not offer cancellation as an undo of a possibly recorded Check-In.
- Model a lost confirmation response as an unknown outcome, retaining the same pass and Event Day with **Unable to confirm result** and **Retry confirmation**. Retry must use the authoritative idempotent confirmation path. Do not show **No Check-In recorded** for an ambiguous transport failure or automatically replay a confirmation after sign-in.
- After confirmed success, automatically accept a different Attendee and retain a clearly identified last result until the next item takes over. Keep **Ready to scan next** separate from last-result text. Clear the previous result as current work begins so it cannot stand for the new Attendee.
- An already-recorded or invalid pass has no Confirm action and offers **Scan next**. Wrong-day previews show a visible warning and can still be explicitly confirmed. After confirmation, make the recorded result primary with the wrong-day warning still visible.
- Keep preview neutral until recording is confirmed. Use green for a confirmed write, yellow for an existing Check-In, red for an invalid pass, and text/icons for every status. Show name and status most prominently, with Attendee Role, Pass Code and Event Day secondary. A warning must distinguish **awaiting confirmation** from **already recorded**.
- Use camera QR scanning as the primary input. Show **Start camera** on entry, default to the existing device camera preference and preserve switching/stopping. One start opens the camera for the session; holding input during preview should not repeatedly tear down and restart its stream.
- Suppress the just-handled QR while it remains in view after success, Cancel or Scan next. Rearm that QR after removal and re-presentation. A different pass can be read immediately when ready, and explicit retry of a failed confirmation must not depend on waving the QR at the camera again.
- Keep the existing serialized camera-operation and permission-recovery safeguards. Provide **Retry camera** and compact manual entry when the camera is unavailable. Do not autofocus the manual input on entry; dismiss the on-screen keyboard after submitting it.
- On session expiry, block further confirmation, show **Sign in again**, and require fresh inspection after signing in. Keep camera errors distinct from authorization errors and ambiguous confirmation outcomes.
- Center the complete working station horizontally and vertically below the page header. Keep enough working width for camera/input on the left and preview/result/actions on the right. Center content and controls within the result panel; do not recreate a narrow phone-width column or reserve a large square placeholder while idle.
- Display Event Day choices above the panels as a centered wrapping row. Default to the current Event Day, identify today, and emphasize any selected other day. Outside Event Days, prompt Staff to choose a configured day before a Check-In can be confirmed.
- Collapse the sidebar on entering this desk, retaining its menu trigger and normal user toggling. Keep the entry behavior scoped to this page rather than imposing a new global default on other Back Office pages.
- On narrow screens, stack preview/result/actions above camera/manual entry. Prefer safe top alignment and scrolling when available height, zoom or the keyboard makes vertical centering impractical. Preserve all content, long names, touch actions, keyboard focus and announced status changes.
- Render the new Staff desk for old staffed Kiosk-mode URLs. Retain the separately scoped Kiosk's camera/result behavior and server-enforced current-day rule for a Kiosk Account; do not route the Staff desk through the old immediate-recording UI.
- Use the existing Back Office design tokens and concise English copy. No new component library, camera dependency, browser test framework, separate redemption feature or new Account kind is required.

## Testing Decisions

- Test externally observable behavior at the two agreed seams, using the existing Node test runner through tsx. Tests should survive changing a helper, SQL shape or React component structure. Do not mock the Registration module's internals or assert private call order.
- **Registration module, real fresh database:** prove that repeated inspection leaves Check-In history empty and that explicit confirmation records arrival once with the session-derived recording Account and reviewed day. Inspect outcomes through the module's public operations, such as Registration detail, rather than creating a second persistence-testing interface.
- At this seam cover Pass Code/token/link resolution, invalid or removed Registration, no Event Day, chosen other Event Day, wrong-day preview and confirmation, existing Check-In timestamp, two desks confirming after the same preview, a retry after an earlier successful write whose response was lost, and the clock advancing after inspection without silently changing the reviewed day.
- **Pure Staff Check-In flow:** test camera/manual inspection parity, one active item, pending-input locking, explicit confirmation versus cancellation, locked day, automatic readiness after success, Scan next, retained item/day on unknown outcome, safe retry, blocked confirmation after session expiry, and ignored stale responses. Keep browser/network/camera orchestration outside the pure seam and do not add React-internal or route-mocking tests.
- The existing Check-In integration tests provide the database setup and duplicate-rule prior art. Existing pure camera-preference, pass-recognition and Account access tests provide the pure-module pattern. Fake only the boundaries permitted by the repository, including the clock when needed.
- Perform local integration checks through the real Staff-facing entry points: unauthorized, Staff, Admin, disabled or expired session; inspection without writing; confirmation and retry; deletion or a concurrent Check-In between preview and confirmation; and legacy staffed Kiosk-mode URLs. Confirm that no contact or broader Registration data is added to Staff responses.
- Check the redesigned desk at representative iPad landscape dimensions with the sidebar collapsed and expanded, then phone/portrait and desktop widths. Include long Thai/English names, date-row wrapping, keyboard-only operation, zoom and status announcements. Centering must yield to scrolling rather than hiding content or actions.
- Use a real iPad and real camera before deployment to verify permission/start/switch/stop, preview holding, manual keyboard dismissal, a QR held continuously after confirmation or cancellation, removal/re-presentation, and immediate acceptance of the next different QR. Simulated video or viewport checks do not establish these hardware behaviors.
- Regression-check the separate Kiosk for automatic Check-In, current-day enforcement, camera startup, repeated scans, result clearing, session-expiry recovery and its existing restricted Account boundary. Shared UI/scanner changes must not impose the Staff confirmation step on it.
- Run typecheck, lint, the full test suite and the production build before committing implementation. Record any unavailable real-device or deployment validation honestly rather than marking it passed.

## Out of Scope

- Redesigning the separate Attendee-operated Kiosk or adding a confirmation step to that workflow.
- Restoring the old automatic Kiosk mode within the Staff Check-In page.
- Gift, meal, voucher or other entitlement redemption. The agreed action is Confirm Check-In.
- Name search, contact lookup, pass resend, Registration editing or extra browsing permissions for Staff or Kiosk Accounts.
- Changing the rule that an Attendee may be checked in on an Event Day they did not register for, or allowing duplicate Check-Ins for one Registration and Event Day.
- Undoing or deleting a recorded Check-In, offline recording, background confirmation queues, or automatic replay of a confirmation after reauthentication.
- Adding a Check-In history browser, throughput dashboard, sound-notification system or unrelated Back Office redesign.
- Replacing authentication, the database, the QR scanner dependency, the component library or the deployment architecture.
- Deploying during the existing freeze without an explicit scheduling decision, or treating this specification as authorization to change production data.

## Further Notes

- The agreed layout and all interview answers are retained in `context.md`. ADR 0006 records the trade-off between immediate scanning throughput and Staff review before writing an arrival record.
- Existing Account boundaries remain governed by ADRs 0003 and 0004. The added Staff inspection operation is a lookup by presented Event Pass, not the Staff name-search capability rejected by ADR 0004.
- The current staffed desk and separate Kiosk share scanner and result components and the immediate Check-In action. Implementation must account for those consumers rather than assuming that a shared change affects only the staffed page.
- Delivery is intended before the Event begins on 31 October 2026. Plan implementation, validation and rollout before the Back Office freeze beginning 29 October; the organiser did not explicitly lift that freeze.
- Real-device camera checks and production rollout are acceptance activities distinct from a passing build. Their results must be recorded when performed; no such validation is claimed by this specification.
