# Check-In UI redesign: design conversation

Status: ready-for-agent

This records the completed design interview requested on 27 October 2026 and the organiser's final confirmation of shared understanding. It is the agreed input for a specification and implementation tickets. Domain terms follow `GLOSSARY.md`; Account permissions follow ADRs 0003 and 0004.

## Problem

The organiser finds the current Check-In interface difficult to use and wants its UI redesigned. They selected these primary problems: **A — a cluttered screen requiring scrolling**, and **C — unclear Check-In results and readiness for the next Attendee**.

## Confirmed decisions

1. **Primary audience and scope:** the Staff/Admin-operated desk at `/admin/check-in`. The separate Attendee-operated Kiosk is not the initial design target. Shared behavior must be considered before changing components used by both.
2. **Primary device:** an iPad or tablet in landscape orientation. The design should also accommodate phones and computers.
3. **Primary outcomes:** keep the desk's main work visible together, make the latest Check-In result immediately understandable, and make readiness for the next Attendee clear.
4. **Primary input:** camera QR scanning, with compact manual Pass Code entry as a fallback. Opening the page must not immediately summon the iPad keyboard.
5. **Request/result flow:** process one Attendee at a time. While a request is pending, show a clear checking state and hold additional submissions. Once the current Check-In result is complete, automatically become ready for the next Attendee; distinguish readiness from the last Attendee's result. The scan now leads to the separate confirmation stage accepted in Q8.
6. **Wrong-day rule:** preserve the ability to record a Check-In for an Event Day the Attendee did not select. Make the recorded outcome primary and the wrong-day warning explicit; repeated Check-Ins show the original time, and invalid passes indicate that no Check-In was recorded.
7. **Staff language:** retain English, using shorter status text consistent with the rest of the Back Office.
8. **Explicit confirmation:** the requested `redeem` means reviewing the scanned Attendee and status, then pressing **Confirm Check-In** to record the Check-In. A scan itself must not record it. This is not a separate gift, meal or benefit-redemption feature. See ADR 0006.
9. **Event Day choices:** display the choices as an inline row that wraps onto another line when space is limited. This replaces the proposed hidden Change day control. Keep the current-day default and make a manually chosen other day clear.
10. **Kiosk entry on the Staff desk:** remove the Kiosk-mode entry and explanatory content from this page. The separate `/kiosk` page remains outside this redesign's initial scope, as established in Q1.
11. **Hold the current preview:** keep the scanned Attendee visible and stop accepting further QR input until Staff choose **Confirm Check-In** or **Cancel**. The camera preview may remain live; cancellation before confirmation records nothing.
12. **Special-case previews:** an Attendee already checked in for the selected Event Day shows the original time and **Scan next**, with no confirmation action. An Attendee who did not register for that day shows a warning but can still be confirmed. Distinguish already recorded, awaiting confirmation and newly recorded states.
13. **Landscape layout:** camera and compact Pass Code input on the left; Attendee preview/result and a large confirmation action on the right; wrapping Event Day choices above. Collapse the Back Office sidebar on entry to this page while retaining the menu trigger.
14. **Camera startup:** show **Start camera** on entry. One explicit tap opens the camera, which stays open between Attendees until Staff stop it.
15. **Event Day during a preview:** bind confirmation to the Event Day visibly reviewed by Staff. Lock the day choices until confirmation or cancellation; do not silently change the recording day during an active item.
16. **Uncertain confirmation outcome:** if the connection fails after confirmation, retain the same Attendee and Event Day with **Unable to confirm result** and **Retry confirmation**. Do not assert that nothing was recorded; retry must obtain the authoritative outcome without recording a duplicate Check-In.
17. **Manual-input parity:** Enter after typing a Pass Code opens the read-only preview. It does not confirm the Check-In. Dismiss the on-screen keyboard after submitting the code so the preview and confirmation action can be read.
18. **Same QR after success:** suppress reopening the completed Attendee while that QR remains in view. Re-presenting it after removal may inspect it again; a different Attendee's QR can be read immediately when the desk is ready.
19. **Information hierarchy and status cues:** make the Attendee name and current status prominent; show Attendee Role, Pass Code and Event Day as secondary details. Use a neutral preview before confirmation, green only for a confirmed recording, yellow for an already-recorded Check-In and red for an invalid pass. Every state also has explicit text and an icon, rather than relying on color alone.
20. **Narrow screens:** stack Attendee information/results and confirmation actions above the camera and manual entry. Allow scrolling when space or zoom requires it; never clip a name, explanatory text or action to enforce a fixed height.
21. **Legacy Staff Kiosk-mode links:** opening `/admin/check-in?kiosk=1` must show the redesigned Staff desk rather than entering the old automatic Kiosk mode. The separate `/kiosk` page retains its existing behavior and Account boundaries.
22. **Recovery:** camera failure leaves manual Pass Code entry available alongside **Retry camera**. Session expiry blocks confirmation and offers **Sign in again**; after signing in, inspect the Event Pass again before confirming. **Cancel** or **Scan next** must not immediately reopen the same QR still in view.
23. **Verification:** test read-only inspection, confirmation and safe retry through the existing Registration module with a fresh real database, and desk transitions through one pure Staff Check-In flow seam. Include a real-iPad camera/touch check before deployment and regression checks of the separate Kiosk.
24. **Centering:** center the complete working station horizontally and vertically within the content area below the Back Office header. Center the preview/result content and actions within their panel. Keep sufficient width for the approved two-column landscape layout; use safe top alignment and scrolling when screen size, keyboard or zoom makes centering impractical, rather than clipping content.
25. **Delivery target:** the organiser confirmed completion before the Event begins on 31 October 2026 and accepted the proposed pre-freeze schedule. Plan validation and rollout before the existing 29 October freeze, rather than assuming permission to deploy during it.

The organiser accepted Q1 and Q2, selected A and C for Q3, accepted the recommendations for Q4–Q8, requested wrapping Event Day choices for Q9, requested no Kiosk entry for Q10, and accepted Q11–Q23. In the final Q24 response, they confirmed the overall design, added horizontal and vertical centering, and specified completion before the Event. The interview's design frontier is closed.

## Layout reference

The working station is centered within the available page content, with the sidebar collapsed on entry. The header's menu trigger remains available. Event Day choices form a centered wrapping row above the two panels.

```text
                    Event Day choices (wrap)
              +----------------+----------------------+
              | Camera preview | Status and name      |
              |                | Role / Pass Code/day |
              | Camera controls| Confirm Check-In     |
              | Pass Code entry| Cancel               |
              +----------------+----------------------+
```

This is a structure reference, not a final visual mockup. Status text/icons/colors follow the confirmed decisions; the panels do not become fixed square placeholders. Narrow screens stack the result and actions first.

## Current behavior established from source

- The desk stacks an Event Day picker, a large square result, camera controls, manual Pass Code/link entry and a separate Kiosk-mode explanation in a narrow centered column.
- Camera and typed input use the same Server Action and Registration module. New submissions replace the visible result immediately; earlier requests can still finish and record Check-Ins even when their response is no longer shown.
- A Check-In can be recorded for an Event Day the Attendee did not select. The current amber result is already recorded, not a request for permission to record it. Repeated scans do not record another Check-In for the same Registration and Event Day.
- A lost response does not prove that a Check-In was not recorded. Retrying is protected by the Registration module's uniqueness rule.
- Staff/Admin can choose an Event Day. A Kiosk Account is constrained to the server's current Event Day. Staff name search and pass resend are reserved for Admin by ADR 0004.
- The desk currently uses English. Kiosk instructions are Thai with English alongside.
- No redemption or benefit-fulfillment concept was found in current product code, glossary or specifications. The current Check-In Server Action has no preview-only operation: a valid new scan immediately records a Check-In. A confirmation-after-preview decision would therefore require a behavior change, not only a different button label.

Source anchors: `src/app/admin/(back-office)/check-in/`, `src/app/kiosk/`, `src/lib/registrations/check-in.ts`, `src/lib/auth/access.ts`, and ADR 0004. Findings are from code inspection, not observed device sessions.

## Agreement

The 27 October interview is resolved. The organiser confirmed shared understanding; specification and ticket synthesis can use those decisions. The 28 October colors and mobile-navigation follow-up below is also resolved: after accepting Q1–Q8, the organiser requested conversion to a specification. Its accepted scope is published separately as [Back Office status colors and mobile navigation](../back-office-status-and-mobile-navigation/spec.md). Subsequent changes to Check-In behavior, Account boundaries or the pre-freeze schedule should be identified explicitly.

## Verification and delivery

- Use the existing **Registration module with a real fresh test database** to verify that inspecting a scanned pass records no Check-In, confirmation records at most one Check-In for the reviewed Event Day, concurrent or retried confirmations remain idempotent, and wrong-day/invalid/deleted/already-recorded cases return authoritative outcomes. Confirmation must recheck current server state; preview information alone is not authority to write.
- Use one pure **Staff Check-In flow** seam for preview/confirm/cancel, pending-input locking, retained Attendee/day on an uncertain confirmation, and ignoring stale responses. Name this seam explicitly in the later specification before writing its tests; do not introduce route or React-internal mocks.
- Check the interface on a real iPad in landscape with its actual camera and touch controls, plus phone/portrait, keyboard, zoom and screen-reader feedback. Verify that the separate Kiosk still works and old Staff Kiosk-mode links open the new desk.
- Run the repository's typecheck, lint, full tests and production build before committing implementation.
- Target validation and rollout before the Back Office freeze beginning 29 October 2026, as recorded in ADR 0004. Any later change would need an explicit scheduling decision rather than assuming the freeze was lifted.

## Documentation approach

Record confirmed UI decisions here as the interview progresses. Existing domain terms cover the discussion: **Confirm Check-In** records the existing Check-In, rather than introducing a redemption entitlement. ADR 0006 captures the meaningful change from immediate recording to preview and explicit confirmation at the staffed desk. Reversible presentation choices remain in this conversation document.

## Follow-up: status colors, buttons and mobile navigation — 28 October 2026

Status: ready-for-agent

After the production rollout, the organiser reported that the green/red/yellow status backgrounds appeared to be missing at `/admin/check-in` and supplied the idle `Ready to scan next` HTML. Source inspection found that the outer right-hand panel stays neutral and the result colors belong to smaller inner cards. The supplied idle HTML does not establish whether colors fail to render after a recorded, existing or invalid-pass outcome.

Confirmed in the follow-up:

- **Q1 — Color area:** apply the status background to the entire right-hand result panel, including its surrounding space, rather than only the inner message card.
- **Q2 — Color meaning:** idle, inspecting and an unconfirmed preview stay neutral. A newly recorded Check-In is green; an existing Check-In is yellow; an invalid Event Pass is red. A wrong-day preview retains a yellow warning, and successful confirmation shows green with that warning still visible. Keep the existing distinction between readiness and the previous Attendee's last result.
- **Q3 — Action-button colors:** Confirm Check-In is green with white text; Cancel is white with a gray border and dark text; Inspect pass, Scan next, Start camera and Sign in again are blue with white text; Retry confirmation, Retry inspection and Retry camera are amber with dark text; Switch camera and Turn off camera are white with a gray border and dark text. Button boundaries and focus indicators must remain clear on the colored result-panel backgrounds.
- **Q4 — Recovery and unavailable states:** session expiry, no usable Event Day, inspection failure and uncertain confirmation use a yellow result-panel background. Uncertain confirmation retains the explanation that a Check-In may already have been recorded and offers Retry confirmation. Inspecting and confirming remain neutral while pending. Red continues to mean an invalid Event Pass.

- **Q5 — Mobile appearance:** fixed bottom **glass** navigation with a translucent blurred background and rounded corners. The organiser explicitly selected **icons only**, overriding the proposed visible short labels. Preserve accessible names for every icon-only control and a clear active-page indicator. Leave room above the iPhone Home indicator/safe area.
- **Q6 — Scope:** replace the sidebar navigation throughout the signed-in Back Office on phones in both portrait and landscape. Desktop/iPad retain the existing sidebar. The separate Kiosk retains its navigation-free layout; this change does not add navigation to sign-in pages.
- **Q7 — Destinations and Account access:** Admin sees icons for Registrations, Check-In, Email, Accounts and Account. Staff sees Check-In and Account. Account opens a bottom sheet with My Account and Sign out. Preserve current authorization, active-section matching and the My Account recovery path for an Account that must change its password.
- **Q8 — Keyboard:** hide the bottom navigation temporarily while the on-screen keyboard is open and restore it when the keyboard closes. Reserve content clearance when the navigation is visible so it does not cover inputs, results or confirmation actions.

The organiser accepted Q1–Q8, with the explicit icons-only choice for Q5, then explicitly requested conversion to a specification. The combined scope is published as [Back Office status colors and mobile navigation](../back-office-status-and-mobile-navigation/spec.md), marked ready-for-agent. This request authorizes specification synthesis; application implementation, commit, push and production rollout remain separate work.

Source facts for the navigation discussion: the existing mobile breakpoint is below 768px, independent of the public 735px `tab:` breakpoint. Mobile uses a left drawer; a wide iPhone landscape viewport can receive the desktop sidebar. Admin navigation has Registrations, Check-In, Email and Accounts; Staff has Check-In. My Account and Sign out are in the sidebar Account menu, including the must-change-password recovery path. The separate Kiosk has its own layout without Back Office navigation.

These are reversible UI choices using the existing domain terms; no new glossary term or ADR is needed for the visual changes alone. The original Check-In behavior, Account boundaries and deployment scheduling constraints remain in force.

The organiser invoked implementation on 29 October 2026. Local code, tests and review are recorded in the [follow-up verification](../back-office-status-and-mobile-navigation/verification.md); real-device acceptance and release readiness remain separate. The existing deployment freeze has not been lifted.
