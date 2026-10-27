# 02: Scan continuously and safely receive the next Attendee

**What to build:** Staff open the camera once and process Attendees through the preview-and-confirm workflow without restarting the camera or reopening the same QR that remains in view. Manual Pass Code entry and camera recovery remain available throughout normal operation.

**Blocked by:** 01 — Inspect an Event Pass and confirm the Check-In.

**Status:** ready-for-human

- [x] Start camera is an explicit action on entry. Preserve the existing device camera preference, switching, stopping, serialized camera transitions and permission/error recovery; do not reopen the stream for every Attendee.
- [x] Keep the camera preview available while one Attendee is being inspected, reviewed or confirmed, but hold additional submissions until the Staff flow permits a new item. QR and manual input share the same active-item and reviewed-day rules from ticket 01.
- [x] After success, Cancel or Scan next, a handled QR still in view does not immediately reopen. Removing and re-presenting that QR can inspect it again, while a different QR can be accepted immediately when ready.
- [x] Retry confirmation works from the retained pass and Event Day without requiring another camera presentation and without being blocked by QR suppression.
- [x] Keep a compact manual Pass Code fallback available when the camera is off or unavailable. Do not autofocus it on entry; dismiss the on-screen keyboard after submitting a code, and keep manual Enter as inspection only.
- [x] Camera failure provides Retry camera and usable manual entry. Session expiry respects the blocked confirmation state and fresh-inspection recovery established in ticket 01.
- [x] The scanner does not make the last Attendee's result appear to be a new result when another code is being inspected. Readiness and the previous result remain distinguishable through rapid scans and retries.
- [x] Extend tests only at the agreed pure Staff Check-In flow and existing applicable pure seams. Verify continuous-input lifecycle and stale/held input behavior through observable outcomes, without introducing camera-library or React-internal mocks.
- [ ] Verify local camera/manual integration and regression-check the separately scoped Kiosk. Record real-iPad checks for a continuously held QR, removal/re-presentation, next different QR, camera switching, permissions and keyboard dismissal as required before deployment; do not substitute simulated video for hardware evidence.
- [x] Typecheck, lint, the full test suite and production build pass before an implementation commit; report any unavailable hardware validation explicitly.

## Comments

Code implementation and automated checks are complete. Local production-browser checks are recorded in [verification](../verification.md). Unchecked criteria retain the outstanding real-iPad/VoiceOver acceptance and release work; simulated video and viewport checks are not marked as hardware validation. Complete those checks before rollout and the 29 October freeze.
