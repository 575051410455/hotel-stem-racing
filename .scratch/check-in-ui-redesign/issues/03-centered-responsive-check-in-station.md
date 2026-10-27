# 03: Center the responsive Check-In station and make results clear

**What to build:** Staff can use the Check-In desk on an iPad in landscape with camera/input and preview/actions visible together in a centered working area. Event Day choices wrap, statuses are immediately understandable, and narrower screens retain every required action without clipping.

**Blocked by:** 01 — Inspect an Event Pass and confirm the Check-In.

**Status:** ready-for-human

- [x] Center the complete station horizontally and vertically within the content below the Back Office header, using sufficient width for two landscape columns rather than the old narrow stacked card. Center preview/result content and actions within their panel.
- [x] Place camera and compact Pass Code entry on the left and the Attendee preview/result and large confirmation actions on the right. Keep the normal landscape workflow visible together without an oversized square idle placeholder or long Kiosk explanation.
- [x] Place Event Day choices above as a centered row that wraps. Follow the current Event Day by default, mark today, emphasize an explicitly chosen other day and prompt for a configured day outside Event Days. Reflect the active-item date lock from ticket 01.
- [x] Collapse the sidebar on entry to this desk while keeping the menu trigger and normal toggling available. Scope this behavior to the staffed desk rather than changing the default across Back Office pages.
- [x] Make name and status prominent and Attendee Role, Pass Code and Event Day secondary. Use concise English, explicit text and icons: neutral before recording, green for a confirmed write, yellow for an existing Check-In and red for an invalid pass. Keep a wrong-day warning visible while making a confirmed recorded outcome primary.
- [x] Render the complete inspection, preview, confirming, success, repeat, invalid-pass, no-Event-Day, uncertain-confirmation, camera-error and session-expiry flows from the parent specification. Ready to scan next is distinct from the last result, and no old Staff Kiosk-mode entry returns.
- [x] On narrow screens, stack result/actions above camera/manual entry. Allow safe top alignment and scrolling for small heights, zoom or the keyboard; preserve long Thai/English names, every message and all actions.
- [x] Preserve useful keyboard focus, touch targets and announced state changes; prevent Enter from bypassing explicit confirmation. Visual styling must use the established Back Office tokens and not depend on color alone.
- [ ] Check representative iPad landscape, portrait/phone and desktop dimensions, both sidebar states, date-row wrapping, long names, keyboard navigation, zoom and screen-reader feedback. Reuse the agreed behavior seams rather than adding markup-only tests or a new browser framework.
- [ ] Record the real-iPad camera/touch acceptance and the integrated checks with ticket 02 before deployment, including separate-Kiosk regression. Ticket 02 is not a blocker for developing this layout, but all three tickets must be complete and release checks satisfied before rollout.
- [x] Typecheck, lint, the full test suite and production build pass before an implementation commit. Target validated delivery before the existing 29 October freeze and before the Event; any unavailable device check or scheduling exception must be explicit.

## Comments

Code implementation and automated checks are complete. Local production-browser checks are recorded in [verification](../verification.md). Unchecked criteria retain the outstanding real-iPad/VoiceOver acceptance and release work; simulated video and viewport checks are not marked as hardware validation. Complete those checks before rollout and the 29 October freeze.
