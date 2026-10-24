# 07: Admins edit an Account and set its password

**What to build:** each row on `/admin/accounts` opens `/admin/accounts/[id]`. There an Admin can:
- change the name, email and kind;
- set a new password, which signs the Account out everywhere and, for Staff and Admin, forces a change at next sign-in.

Both are recorded.

**Guards:**
- An Admin can't change their own kind or set their own password here; a link to My Account stands in for that.
- Demoting the last enabled Admin is refused.

See the spec (Part 2, "The Accounts module grows", "pages").

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] **Accounts module:**
  - `update(id, { name?, email?, kind? }, actor)`:
    - one record per changed field, with `{ from, to }`;
    - a kind change deletes sessions;
    - **refuses:** invalid name or email, email taken (case-insensitive), your own kind, demoting the last enabled Admin.
    - `rename` becomes a thin call into it.
  - `setPassword(id, password, actor)`:
    - replaces `resetPassword` (the command looks up by email);
    - flags Staff and Admin, deletes sessions, records `password-set`;
    - refuses your own Account;
    - reports when the Account stays disabled.
- [ ] **`/admin/accounts/[id]`:**
  - behind `requireAdmin()`; `notFound()` for an unknown id;
  - **details form**, with "Changing the kind signs this Account out everywhere.";
  - **on your own Account:** kind locked, with "You can't change your own kind.";
  - **"Set a new password"** with confirmation and its warning; your own Account gets a link to My Account instead;
  - **"View history"** links to `/admin/accounts/history?account=<id>`.
- [ ] **Links into the page:** list rows, and the History's Account column.
- [ ] **Saving:** Server Actions re-check `getCurrentAdmin()`. Inline errors; the toasts "Account updated" and "Password set".
- [ ] **Command:** `npm run staff -- reset-password` uses `setPassword` and prints when the Account stays disabled.
- [ ] **Tests against a real database:**
  - each field change and its record;
  - email taken;
  - your own kind refused;
  - last enabled Admin refused;
  - a kind change ends sessions;
  - `setPassword`: flag, sessions ended, signing in with the new password works, your own refused.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`, with a second browser signed in as the target:
  - change its kind from Staff to Admin: the session ends, and the next sign-in sees the whole Back Office;
  - set its password: the session ends, and the next sign-in is forced to change it;
  - your own page shows the kind locked and the My Account link;
  - demoting the last Admin is refused;
  - 375 and 1280 px.
