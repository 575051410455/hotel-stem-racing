# 02: Staff desk and camera action colors

**What to build:** Staff can identify recording, normal, recovery and secondary actions from consistently colored, readable buttons.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Apply green/white to Confirm Check-In, blue/white to normal actions, amber/dark to retry actions and white/gray-border/dark to Cancel and camera switching/stopping, following the parent specification.
- [x] Keep boundaries, focus, hover and disabled states clear on each result background and retain repeat-submit prevention.
- [x] Scope styling to the Staff desk and its camera controls; preserve shared Kiosk controls and global public/Back Office button styling.
- [x] Check the visible palette and focus in a real isolated browser without implementation-coupled class assertions.

## Comments

Implemented and checked through the isolated production-build browser and existing agreed seams. Required gates passed. See [verification](../verification.md) for evidence and release limitations.
