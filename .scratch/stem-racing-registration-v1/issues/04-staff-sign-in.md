# 04: Staff sign-in

**What to build:** Staff sign in to the Back Office at `/admin/login` with email and password, and only signed-in Staff can reach `/admin`. Staff Accounts are created and passwords reset with a command on the server. There is no public sign-up (ADR 0001).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Better Auth email/password:
  - sign-up disabled
  - auth tables added through their own migration
  - session lifetime at least 7 days
  - built-in sign-in rate limiting on
- [ ] A server command creates a Staff Account or resets its password, and rejects passwords shorter than 12 characters. There are no composition rules.
- [ ] `/admin/login` (Thai UI, no "forgot password" link) signs Staff in. Visiting `/admin` without a session redirects to `/admin/login`. Staff can sign out.
- [ ] No public page links to the Back Office
- [ ] Tests cover:
  - a Staff Account created by the command can sign in
  - a wrong password fails
  - a short password is rejected by the command
