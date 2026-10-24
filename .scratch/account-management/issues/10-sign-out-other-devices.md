# 10: Owners sign out their other devices

**What to build:** on My Account's "Signed-in devices" section (from 09), each other device gets a "Sign out" button, and the section gets "Sign out all other devices".
- **One device:** no confirmation; the toast "Signed out of that device".
- **All others:** behind an `AlertDialog`, only when there is at least one other device:
  - title "Sign out all other devices?";
  - body "Every other device signed in to your Account is signed out. This one stays signed in.";
  - confirm "Sign out other devices", and "Cancel";
  - the toast "Signed out of your other devices".
- **This device** has no button: it signs out from the account menu, as before.

Signing out of devices records no Account Change.

See the spec (Part 2, "Signed-in devices", stories 61–66).

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] **Accounts module:**
  - `signOutDevice(accountId, sessionId)`: deletes that session only if it belongs to the Account and isn't the current one; otherwise not found;
  - `signOutOtherDevices(accountId, currentSessionId)`: deletes every other session of the Account;
  - neither records an Account Change.
- [ ] **Server Actions:**
  - each re-checks `getCurrentStaff()`, so a Kiosk Account and a signed-out request are refused (and, once 05 is merged, a flagged Account);
  - the current session's id comes from the session itself, never from the browser;
  - they refresh the section afterwards.
- [ ] **My Account:** the buttons, dialog and toasts above. No "Sign out all other devices" when this is the only device.
- [ ] **Tests against a real database:**
  - `signOutDevice` deletes another of the Account's sessions, and refuses the current session and another Account's session;
  - `signOutOtherDevices` keeps only the current session;
  - no Account Change is recorded (once 04 is merged).
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`, with three browser contexts signed in to one Account:
  - "Sign out" on one device: the toast, and that device is signed out on its next request;
  - "Sign out all other devices" asks first, then leaves only this one; the button then disappears;
  - this device stays signed in throughout;
  - 375 and 1280 px.
