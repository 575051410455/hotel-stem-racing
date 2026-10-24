# 12: Admins generate and copy passwords

**What to build:** wherever an Admin sets someone else's password (`/admin/accounts/new`, and "Set a new password" on `/admin/accounts/[id]`):
- a **Generate** button fills Password and Confirm with a strong random password and shows it in plain text;
- a **Copy** button copies it, with the toast "Password copied";
- **typed passwords** stay hidden behind a show/hide toggle.

The reminder that a Staff or Admin Account will choose its own password at first sign-in stays next to it. Nothing about how the password is sent, checked or stored changes.

See the spec (Part 2, "Generated passwords", stories 47–54).

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] **Generate:**
  - uses the existing pure `randomPassword()` from `src/lib/auth/random-password.ts` (24 lower-case characters, no o, 0, i or 1), in the browser; make sure the import pulls no server-only code into the client bundle;
  - fills Password and Confirm and switches both to plain text.
- [ ] **Copy:** writes the password to the clipboard and shows `toastSuccess("Password copied")`; its `aria-label` is "Copy password". If the clipboard is refused, say so with `toastError` instead of failing silently.
- [ ] **Show/hide:** a toggle on the password fields, labelled "Show password" / "Hide password", masked by default.
- [ ] **One shared component** for both forms, so new and set-password behave the same.
- [ ] **No change** to the Server Actions, the 12–128 rule or the confirmation check.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - Generate fills both fields, shows the password, and the new Account signs in with it;
  - Copy says "Password copied" and the clipboard holds the password;
  - show/hide on typed passwords, on both forms;
  - keyboard: every button reachable and labelled;
  - 375 and 1280 px.
