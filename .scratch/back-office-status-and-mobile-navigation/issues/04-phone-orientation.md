# 04: Continuous phone navigation across orientation

**What to build:** Rotating an iPhone preserves bottom navigation, safe-area clearance and reachable content while iPad and desktop retain the sidebar.

**Blocked by:** 03 — Phone glass navigation and Account sheet.

**Status:** ready-for-human

- [x] Keep the phone presentation in portrait and landscape, including widths above the old mobile threshold; avoid mode changes caused by the keyboard or browser toolbar.
- [x] Keep content, status results and confirmation controls reachable in short landscape heights with correct safe-area insets.
- [x] Preserve the larger-screen sidebar, active section and Account access; avoid duplicate menus or a stranded Account overlay during rotation.
- [ ] Check representative phone and iPad/desktop browser layouts and record real-device orientation acceptance separately.

## Comments

Code implementation, browser emulation and required gates passed. The final criterion retains real-device acceptance; no iPhone Safari/VoiceOver result is claimed. See [verification](../verification.md).
