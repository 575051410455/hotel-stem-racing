# 05: Phone navigation during on-screen keyboard input

**What to build:** The bottom menu hides while Staff enter a Pass Code or edit another Back Office form and returns reliably after keyboard dismissal.

**Blocked by:** 03 — Phone glass navigation and Account sheet.

**Status:** ready-for-human

- [x] Hide the bar while the on-screen keyboard is open; restore navigation and appropriate content clearance after closure.
- [x] Keep the focused input, preview and confirmation controls reachable; do not treat focus, a hardware keyboard, scrolling or normal Safari-toolbar motion alone as an open keyboard.
- [x] Handle orientation, Account-sheet dismissal and subsequent navigation without stale gaps or trapped focus.
- [ ] Check browser viewport events as supplemental evidence and leave actual iPhone keyboard acceptance pending until a real device is tested.

## Comments

Code implementation, browser emulation and required gates passed. The final criterion retains real-device acceptance; no iPhone Safari/VoiceOver result is claimed. See [verification](../verification.md).
