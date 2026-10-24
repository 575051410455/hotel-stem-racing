# 03: Admins see every Account in an Accounts list

**What to build:** Admins see "Accounts" in the sidebar and a read-only list of every Account at `/admin/accounts`:
- Name, Email, Kind, Status and Created;
- enabled first, then by name;
- a stacked list at 375 px.

This ticket also adds the user columns Part 2 needs, `must_change_password` and `disabled_at`, so there is one migration for the user table.

See the spec (Part 2, "schema", "pages").

**Part:** 2, after the Event. Work on the integration branch `account-management` (branched from `main` after the Event). Nothing reaches `main` before 2 November 2026.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] **Schema:**
  - `users.must_change_password` (boolean, not null, default false) and `users.disabled_at` (timestamptz, null);
  - both Better Auth `additionalFields` with `input: false`, returned on the session;
  - migration via `npm run db:generate -- --name account-management`.
- [ ] **Accounts module:** `list()` and `get(id)`, tested against a real database.
- [ ] **Sidebar:** an "Accounts" item (lucide `UsersRound`) only when the Account `canManageAccounts`.
- [ ] **`/admin/accounts`:**
  - behind `requireAdmin()`;
  - `PageHeader` "Accounts";
  - **table:** Name, Email, Kind (badge), Status ("Enabled" / "Disabled", plus "Must change password"), Created (Bangkok date).
  - **Order:** enabled first, then by name.
  - **Phones:** a stacked list at 375 px.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - an Admin sees the item and the list;
  - Staff see no item and are redirected to the desk;
  - a Kiosk Account goes to `/kiosk`;
  - 375 and 1280 px.
