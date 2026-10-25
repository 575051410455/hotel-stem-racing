# 13: Accounts show initials avatars and Badges

**What to build:** each Account on `/admin/accounts` gets an avatar with its initials ("NW" for Napat Wongsa, "K1" for Kiosk 1), and its kind and status become Badges. The header of `/admin/accounts/[id]` shows the same avatar and Badges, with the name, email and last sign-in.

See the spec (Part 2, "Avatars and Badges", stories 40 and 43–46).

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 07, 11

**Status:** resolved

- [x] **Initials:** a pure function of the name and email:
  - the first character of the first word and of the last word, upper-cased: "Napat Wongsa" → "NW", "Kiosk 1" → "K1", "Admin" → "A";
  - extra spaces don't matter;
  - a name that doesn't pass the English-name rule from 11 (an old Thai name) uses the first letter of the email, upper-cased;
  - unit tests for each case.
- [x] **Avatar:** shadcn `Avatar` with only the fallback (no images), on a muted background. The sidebar's account menu keeps its icon.
- [x] **Badges:**
  - kind: "Admin", "Staff" or "Kiosk";
  - status: "Enabled" (outline, green dot), "Disabled" (secondary), plus "Must change password" (outline) when flagged.
- [x] **`/admin/accounts`:** the Name column has the avatar; Kind and Status are Badges. The stacked list at 375 px keeps the avatar, the last sign-in and the Badges.
- [x] **`/admin/accounts/[id]`:** a header with the avatar, name, email, kind and status Badges, and "Last sign-in 22 Oct 2026, 14:05" (or "Never").
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - avatars for an English name, a one-word name, "Kiosk 1", and an old Thai name (email letter);
  - each Badge, including "Disabled" and "Must change password";
  - the Account page header;
  - 375 and 1280 px, light and dark if the Back Office has both.

## Answer

Implemented on `account-management` after tickets 08, 11 and 12. `accountInitials()` is a pure helper using the first and last words of a valid English Account name, or the email's first letter for a legacy name outside that rule. The Accounts list and detail page share the same decorative fallback Avatar and kind/status Badges. Enabled has a green dot, Disabled uses the secondary Badge, and a flagged Account also shows Must change password. The detail header includes the name, email and last sign-in.

**Verification (25 October 2026):** the pure initials tests passed, including extra spaces and a legacy Thai name whose email starts with a digit. The full suite passed 348 tests; typecheck, lint and build passed. A production `next start` on a scratch database was checked in headless Chrome at 375 and 1280 px: the list showed `NW`, `A`, `K1` and the email fallback `S`; Enabled, Disabled and Must change password Badges; and Last sign-in. The detail headers showed the same Avatar and Badges. Neither viewport had horizontal overflow. The Back Office has no dark theme to check. Two code-review passes found the numeric-email fallback edge case, fixed before this hand-off.
