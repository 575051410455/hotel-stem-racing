# Admin Accounts run the Back Office; Staff Accounts only check people in

Until now every Staff Account had the same, full access (v1 spec story 52, ADR 0003), and only the server command (`npm run staff`) created Accounts or set their passwords. That put every Attendee's phone and email in front of each helper at the entrance, who only needs to scan Event Passes. The organisers also want to manage Accounts without shell access.

**Three kinds of Account:**
- **Admin Account:** the whole Back Office: Registrations, the CSV export, email, Check-In, and (after the Event) managing Accounts.
- **Staff Account:** the check-in desk and its own Account (My Account), nothing else.
- **Kiosk Account:** unchanged.

At the entrance, looking an Attendee up by name and re-sending an Event Pass stay with an Admin. We rejected a name search for Staff Accounts at the desk: it would bring Registration data back to the desk.

**Rules:**
- **Disabled, never deleted:** Accounts are disabled, so the Account History and Check-Ins keep pointing at real Accounts, and a mistake can be undone.
- **One Admin always:** there is always at least one enabled Admin Account.
- **Owners choose their own passwords:** a password set by someone else must be changed by its owner at the next sign-in.
- **Way back in:** the server command stays, for when no Admin can sign in (`make-admin`).

**Our own module, not Better Auth's admin plugin.** We build this on our own Accounts module, writing through Better Auth's internal adapter as `npm run staff` already does. We rejected the plugin for two reasons:
- it adds a `role` field next to our `kind`, giving two sources of permission;
- it adds HTTP endpoints (impersonation, removing users, setting roles) that we'd have to lock down.

`kind` stays the single source of permission, read by `access.ts`.

**Other choices:**
- **Names:** Better Auth's own `/update-user` is refused, so names change only through the module.
- **Disabled Accounts:** they are refused at session creation, after the password is checked, so sign-in doesn't reveal which emails have Accounts.

**Timing:** the split of Staff and Admin Accounts ships before the Event (by 28 October 2026). Managing Accounts from the Back Office ships after it, because the Back Office is frozen from 29 October to 1 November.

_Timing changed (2026-10-25): Part 2, managing Accounts from the Back Office, was merged into `main` on 25 October and ships with the next deploy, before the Event. The freeze from 29 October to 1 November still applies._
