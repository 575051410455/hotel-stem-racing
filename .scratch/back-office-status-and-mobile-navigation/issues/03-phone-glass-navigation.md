# 03: Phone glass navigation and Account sheet

**What to build:** Admin and Staff can navigate the signed-in Back Office on portrait phones using a fixed icon-only glass bar and retain their Account actions.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Provide rounded translucent blurred bottom navigation with safe-area spacing, content clearance, usable touch targets, accessible icon names and a blue active-page indicator.
- [x] Share destination definitions and existing access rules with the sidebar; Admin receives Registrations, Check-In, Email, Accounts and Account; Staff receives Check-In and Account.
- [x] Account opens an accessible bottom sheet with the current Account information, My Account and Sign out; preserve dismissal, focus restoration and pending Sign out behavior.
- [x] Preserve nested-section highlighting, unknown-session refusal and the must-change-password path to My Account/Sign out.
- [x] Expose one navigation presentation at a time, with no redundant phone drawer trigger; preserve desktop/iPad sidebar and navigation-free Kiosk/sign-in layouts.
- [x] Validate authenticated Admin, Staff, recovery and Kiosk behavior in an isolated browser using the established seams.

## Comments

Implemented and checked through the isolated production-build browser and existing agreed seams. Required gates passed. See [verification](../verification.md) for evidence and release limitations.
