# 03: Admins see every Account in an Accounts list

**What to build:** Admins see "Accounts" in the sidebar and a read-only list of every Account at `/admin/accounts`:
- Name, Email, Kind, Status, Last sign-in and Created;
- enabled first, then by name;
- a stacked list at 375 px.

This ticket also adds the user columns Part 2 needs, `must_change_password`, `disabled_at` and `last_signed_in_at`, so there is one migration for the user table. Every sign-in, of every kind, now sets `last_signed_in_at`; the migration backfills it from each Account's newest session.

Kind and Status are plain text here. Ticket 13 turns them into Badges and adds the initials avatar.

See the spec (Part 2, "schema", "pages").

**Part:** 2, after the Event. Work on the integration branch `account-management` (branched from `main` on 24 October 2026). Nothing reaches `main` before 2 November 2026.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] **Schema:**
  - `users.must_change_password` (boolean, not null, default false), `users.disabled_at` (timestamptz, null) and `users.last_signed_in_at` (timestamptz, null);
  - all three Better Auth `additionalFields` with `input: false`, returned on the session;
  - migration via `npm run db:generate -- --name account-management`;
  - **backfill** in the same migration: `last_signed_in_at` = the newest `sessions.created_at` of each Account that has a session; the rest stay null.
- [ ] **Last sign-in:** a Better Auth `databaseHooks.session.create.after` sets `last_signed_in_at` to now, for every kind. (Ticket 08 adds the disabled check in `.before`, so a refused sign-in won't count.)
- [ ] **Accounts module:** `list()` and `get(id)`, with id, name, email, kind, `disabledAt`, `mustChangePassword`, `lastSignedInAt` and `createdAt`, tested against a real database:
  - `lastSignedInAt` is null for a new Account;
  - a successful `auth.api.signInEmail` sets it, for each kind.
- [ ] **Sidebar:** an "Accounts" item (lucide `UsersRound`) only when the Account `canManageAccounts`.
- [ ] **`/admin/accounts`:**
  - behind `requireAdmin()`;
  - `PageHeader` "Accounts";
  - **table:** Name, Email, Kind, Status ("Enabled" / "Disabled", plus "Must change password"), Last sign-in ("22 Oct 2026, 14:05" in Bangkok time with the shared `bangkokEnglishDateTime`, or "Never"), Created (Bangkok date).
  - **Order:** enabled first, then by name.
  - **Phones:** a stacked list at 375 px.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - an Admin sees the item and the list;
  - Staff see no item and are redirected to the desk;
  - a Kiosk Account goes to `/kiosk`;
  - Last sign-in: "Never" for a fresh Account, a time after signing in;
  - the backfill on a copy of the local demo database;
  - 375 and 1280 px.
