# 23: Kiosk Accounts (check-in only)

**What to build:** Kiosk iPads sign in with a **Kiosk Account**, which can only run the Kiosk and record Check-Ins (ADR 0003, GLOSSARY "Kiosk Account"). Even if an Attendee leaves Kiosk mode, or uses the address bar or Back, a Kiosk Account sees no Registration data. Staff Accounts are unchanged.

**Blocked by:** None (tickets 04, 13, 18 and 19 are merged)

**Status:** ready-for-agent

- [ ] Every Account has a kind, Staff Account or Kiosk Account, stored with the Account (default Staff Account, so existing Accounts are unchanged), through a new migration
- [ ] `npm run staff -- create-kiosk <email> "<name>"` creates a Kiosk Account; `reset-password` works for both kinds; both kinds need at least 12 characters
- [ ] A Kiosk Account that signs in at `/admin/login` lands on a dedicated Kiosk page (e.g. `/kiosk`), always in Kiosk mode, with the Event Day and front camera as ticket 19 does. It has no exit-to-desk control, only a discreet sign-out with in-page confirmation.
- [ ] Every other Back Office page refuses a Kiosk Account. Pages redirect to the Kiosk page; the list, detail, check-in desk, email page and every `/api/back-office/*` route answer 401/redirect as for a signed-out request. The check is server-side, not just hidden links.
- [ ] Check-Ins from a Kiosk Account are recorded with that Account's id, through the same Check-In path as the desk
- [ ] Staff Accounts keep everything they have today, including Kiosk mode on `/admin/check-in?kiosk=1`
- [ ] Tests at the Staff Accounts seam (real database): a Kiosk Account can be created and signs in as a Kiosk Account; the access rule refuses it for the Back Office and allows it for Check-In; a Staff Account is allowed both
- [ ] `docs/deploy.md` explains creating one Kiosk Account per iPad (or one shared) and still recommends Guided Access as a second layer
