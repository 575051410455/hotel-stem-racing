# 01: Foundation

**What to build:** The skeleton every later ticket builds on. The public page shell renders with the STEM Racing Thailand brand: skip link, header wordmark, hero banner, and a footer with the gradient bar, © line and the organisers' contact channels. The database schema for Registrations and Check-Ins exists with migrations. The Registration module's dependency shape exists: database, clock, Event Pass email sender, bot-check verifier. Tests run against an isolated PostgreSQL database per run, so parallel agents never share data. This is the prefactor ticket: "make the change easy".

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The repo is under git with an initial commit
- [x] `/` renders the site chrome with no horizontal scroll from 320px to 1600px+:
  - skip link to main content that slides in on focus
  - header with text wordmark (56px → 96px at the 735px breakpoint)
  - hero banner
  - footer with gradient bar, "© 2026 STEM Racing Thailand", and contact channels that are hidden when not configured
- [x] Brand tokens (light background, white surfaces, magenta→orange brand gradient), the spec's system font stack (no hosted fonts), the base layer and the keyboard-only focus model are in place
- [x] The Event configuration is available to server and browser code: name, venue, Event Days 2026-10-31 and 2026-11-01, Asia/Bangkok
- [x] The schema and migration for Registration and Check-In match the spec's data shape, including:
  - unique token
  - unique Pass Code
  - unique Duplicate Registration key
  - unique (Registration, Event Day) for Check-In
- [x] The Registration module boundary accepts injected database, clock, Event Pass email sender and bot-check verifier, with no-op or pass-through defaults when the latter two are not configured
- [x] The test command runs Node's test runner through tsx, and the DB test harness gives each run its own freshly migrated database and drops it afterwards
- [x] `.env.example` documents every variable in the spec, with Cloudflare Turnstile test keys
- [x] Typecheck, lint, build and tests pass

## Answer

Done in commit "feat(foundation): …". Notes for downstream tickets:
- Registration module: `src/lib/registrations/registrations.ts` (`createRegistrations`, already has `getEventPass`, which ticket 02 builds on); collaborator ports and defaults in `ports.ts`; composition root `src/lib/server/registrations.ts`.
- Test harness: `createTestDatabase()` → `{ db, reset, drop }`; one database per test file, `reset()` per test.
- Unique constraint names (for ticket 06): `registrations_duplicateKey_unique`, `registrations_token_unique`, `registrations_passCode_unique`; Check-In: `check_ins_registrationId_eventDay_unique`.
- Focus model is inverted vs the template (rings by default, hidden after pointer input via `.using-pointer`) so tabbing before hydration still shows rings.
- Contact channels: `contactChannels()` in `src/lib/contact.ts`.
