# 11: Account names are in English

**What to build:** every Account name set from now on uses English letters, digits, spaces, `-`, `'` and `.`, with at least one letter.
- **Where:** creating an Account (`/admin/accounts/new`), editing one (`/admin/accounts/[id]`), renaming yourself on My Account, and the `create`, `create-admin`, `create-kiosk` and `seed` commands.
- **Forms:** the hint "In English" under Name. A refused name gives the toast "Use English letters for the name, for example Somchai Jaidee." and the same message under the field.
- **Existing names stay:** the rule is checked only when the name changes, so editing the email or kind of an Account with an old Thai name still saves.
- **Seed:** an empty `SEED_STAFF_NAME` now names the first Admin "Admin".

See the spec (Part 2, "Names in English", stories 67–75).

**Part:** 2, after the Event, on `account-management`.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] **The rule** lives in the existing pure `src/lib/auth/name-rules.ts`, shared with the browser forms:
  - trimmed; at most 100 characters;
  - only A–Z, a–z, 0–9, spaces, `-`, `'` and `.`;
  - at least one letter;
  - message: "Use English letters for the name, for example Somchai Jaidee."
  - **unit tests:** accepts "Napat Wongsa", "Kiosk 1", "Mary-Jane", "O'Neil", "J. Smith"; refuses Thai, "123", empty, over 100 characters; trims.
- [ ] **Accounts module** applies it in `create` (and so `createFirst`) and in `update` (and so `rename`) only when the name actually changes.
- [ ] **Forms** (`/admin/accounts/new`, `/admin/accounts/[id]`, My Account):
  - the hint "In English" under Name;
  - on a refusal, `toastError` with the message, and the same message inline under the field, linked to the input;
  - the browser checks first with the same rule; the server decides.
- [ ] **Commands:** `create`, `create-admin` and `create-kiosk` refuse a Thai name with the same message. `seed` defaults to "Admin".
- [ ] **Docs:** `.env.example` and `docs/deploy-guide/index.html` give the new seed default and the English-name rule for the commands.
- [ ] **Tests against a real database:**
  - `create` and `update` refuse a Thai name with the message;
  - `update` of email or kind on an Account whose stored name is Thai succeeds;
  - `rename` follows the rule;
  - `createFirst` with no name creates "Admin" (wherever the default lives).
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`:
  - a Thai name gives the toast and the inline message on `/admin/accounts/new`, `/admin/accounts/[id]` and My Account;
  - editing only the email of an Account with a Thai name saves;
  - `npm run staff -- create … "ชื่อไทย"` refuses it; `seed` with no name creates "Admin";
  - 375 and 1280 px.
