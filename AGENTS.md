<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project conventions

- Spec: `.scratch/stem-racing-registration-v1/spec.md`; tickets in `.scratch/stem-racing-registration-v1/issues/`. Use `GLOSSARY.md` terms in code, tests and UI copy.
- Commands: `npm run typecheck` (runs `next typegen` first), `npm run lint`, `npm test`, `npm run build`. All four must pass before a commit.
- Tests: Node's test runner through tsx, files named `*.test.ts` under `src/`. Test only at the agreed seams: the Registration module (against a real database from `src/test-support/database.ts`, which creates and drops a fresh database per test file; call its `reset()` in `beforeEach`) and the pure modules named in the spec. Fake only boundaries: email sender, bot-check verifier, clock.
- The repo lives in iCloud-synced `~/Documents/Web Developer/hotel-stem-racing`. `node_modules`, `.next` and `.claude/worktrees` are excluded from sync by `scripts/icloud-exclude.mjs` (it runs on `postinstall`; run `npm run icloud:exclude` if you recreate one of them by hand). Never rename them to `*.nosync` with a symlink: Next.js relies on `/node_modules/` in package paths.
- Local Postgres 17 (Homebrew) runs without a password for the current macOS user; binaries are in `/opt/homebrew/opt/postgresql@17/bin`.
- The Registration module (`src/lib/registrations/`) owns the domain rules and receives its collaborators as dependencies. `src/lib/server/registrations.ts` is the only composition root that reads environment variables to build them.
- Schema changes: edit `src/lib/db/schema.ts`, then `npm run db:generate -- --name <slug>`. Never edit a migration that is already committed.
- Cache Components is on: request-time data (database reads, `cookies()`, `headers()`, `searchParams`, current time, random values) must sit under `<Suspense>` or after `await connection()`. Don't export `runtime`.
- Public UI is Thai and hand-built on the tokens in `src/app/globals.css` (`tab:` = the 735px breakpoint). Public pages live under `src/app/(public)/`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`, recorded as a `Status:` line in each file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
