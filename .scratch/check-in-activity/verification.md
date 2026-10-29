# Check-In Activity — dev-check-prod

Production verdict: **BLOCKED (provisional)**. Local implementation and compatibility checks pass. The running production image revision, migration journal and real-device acceptance are not available. No deployment or production write was performed.

Reviewed on 29 October 2026. Baseline: `bbec68b305cde81a8b52890b2f60c9de521dff7c`, the task-start checkout and independently observed remote `main` from `git ls-remote`. This is a source baseline, not proof of the image running in production. Candidate: the Check-In Activity implementation and planning/evidence documents relative to that baseline. Exact pushed revisions and CI are recorded in the post-push evidence below when available.

## Scope and file review

จัดประเภทแล้ว **20 / ทั้งหมด 20 candidate files (100%)**. Two pre-existing workspace changes are inventoried separately and excluded from the release. This is file-review coverage, not test coverage.

| Path                                                                  | Classification          | In candidate | Impact and evidence                                                                                                                    |
| --------------------------------------------------------------------- | ----------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `.scratch/check-in-activity/spec.md`                                  | Spec                    | Yes          | Accepted product scope, data contracts, test seams and rollout limits; excluded from Docker context.                                   |
| `.scratch/check-in-activity/issues/01-selected-day-history.md`        | Ticket                  | Yes          | Complete history slice and acceptance; excluded from Docker context.                                                                   |
| `.scratch/check-in-activity/issues/02-event-day-overview.md`          | Ticket                  | Yes          | Whole-day overview definitions and acceptance; excluded from Docker context.                                                           |
| `.scratch/check-in-activity/issues/03-search-check-ins.md`            | Ticket                  | Yes          | Search slice and acceptance; excluded from Docker context.                                                                             |
| `.scratch/check-in-activity/issues/04-filter-check-ins.md`            | Ticket                  | Yes          | Filter slice and independent blocking edge; excluded from Docker context.                                                              |
| `.scratch/check-in-activity/issues/05-live-refresh.md`                | Ticket                  | Yes          | Refresh/recovery and release checks; excluded from Docker context.                                                                     |
| `.scratch/check-in-activity/verification.md`                          | Evidence                | Yes          | This report; excluded from Docker context.                                                                                             |
| `src/app/admin/(back-office)/_shell/back-office-destinations.ts`      | Navigation              | Yes          | Adds one Admin-only destination; existing desk destinations/permissions retained.                                                      |
| `src/app/admin/(back-office)/_shell/phone-navigation.tsx`             | Shared phone navigation | Yes          | Fits six controls at 320px with 44px targets and smaller gaps; wider phones retain 48px controls. Verified at 320px/390px in Chromium. |
| `src/app/admin/(back-office)/check-in-activity/page.tsx`              | Page                    | Yes          | Independent Admin guard and request-time clock under Suspense; no writes.                                                              |
| `src/app/admin/(back-office)/check-in-activity/check-in-activity.tsx` | Client UI               | Yes          | Whole-day counts, filters/search, manual pagination, read-only table and recovery states. Browser-checked.                             |
| `src/app/admin/(back-office)/check-in-activity/columns.tsx`           | Table presentation      | Yes          | Stable Table v9 columns and Bangkok timestamps; no QR/contact/session tokens exposed.                                                  |
| `src/app/admin/(back-office)/check-in-activity/query.ts`              | Client data             | Yes          | Full-view query keys, abortable no-store reads, visible-page polling, stops interval on unauthorized response.                         |
| `src/app/admin/(back-office)/check-in-activity/use-activity-view.ts`  | URL state               | Yes          | Preserves selected Event Day/search/filters/pagination with browser history; pins the initial day.                                     |
| `src/app/api/back-office/check-in-activity/route.ts`                  | HTTP adapter            | Yes          | Independent current-Admin guard, strict input and private no-store JSON. No mutation route.                                            |
| `src/lib/registrations/check-in-activity.ts`                          | Registration module     | Yes          | Read-only repeatable-read transaction over existing data; stable ordering, left Account join and unfiltered summary.                   |
| `src/lib/registrations/check-in-activity.test.ts`                     | Database tests          | Yes          | Five observable-behavior tests at the Registration seam with fresh isolated real databases.                                            |
| `src/lib/registrations/check-in-activity-view.ts`                     | Pure view contract      | Yes          | Validates inputs, normalizes URLs, bounds pages/sizes and selects Bangkok default Event Day.                                           |
| `src/lib/registrations/check-in-activity-view.test.ts`                | Pure tests              | Yes          | Two tests covering date defaults, complete URL round trips, malformed views and strict API input.                                      |
| `src/lib/registrations/registrations.ts`                              | Module interface        | Yes          | Adds the read method only; existing submit, pass lookup, inspection and Check-In implementations retained.                             |

| Pre-existing workspace path | Classification                   | In candidate | Treatment                                                                                                           |
| --------------------------- | -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `.env.example`              | User configuration documentation | No           | Pre-existing 2 additions/2 deletions; not staged, committed or pushed by this task. No values copied into evidence. |
| `memory.md`                 | User notes                       | No           | Pre-existing 12 additions/2 deletions; not staged, committed or pushed by this task.                                |

## Compatibility

- **Registration / existing data:** intentional addition is a read operation, implemented inside the existing Registration module and invoked through the existing composition root. Real-database checks cover two-day Registrations, recorded timestamps on another calendar day, outside arrivals, deletion, search/filter combinations, disabled recording Accounts and missing historical Account attribution. No Registration write rule is changed.
- **Existing Event Passes / QR:** token and Pass Code columns, generation, codec, public pages, language Proxy and email code have no diff. A synthetic pass created before opening the new page remains identical through the public lookup after activity reads; reusing its Pass Code or QR URL returns its original Check-In. Browser checks opened its existing Thai and English public links and verified unknown-pass 404s. This proves local synthetic compatibility, not live production links or camera hardware.
- **Accounts / Back Office:** intentional addition is an Admin-only destination and a narrow-screen navigation fit adjustment. Direct page/API checks refused signed-out, Staff and Kiosk contexts. Revoking the active Admin kind caused refresh to hide existing rows/counts, offer sign-in and stop interval polling. Existing disabled/must-change-password guards are reused and covered by the full Accounts suite.
- **Staff desk / Kiosk:** no diff in actions, state model, scanner, desk or Kiosk. Browser checks resolved an older synthetic QR link to its original arrival; preview and Cancel for a fresh synthetic Attendee did not create a Check-In; explicit Confirm created exactly one. Full-suite Check-In, concurrency/retry, inspection, Staff flow and pass-codec tests pass. Successful current-day Kiosk recording and physical camera behavior are not newly claimed from this pre-Event browser session.
- **Schema/runtime/config:** no diff in database schemas, migrations, migration runner, packages/lockfile, Dockerfile, Compose, nginx, workflow, Proxy or environment configuration in the candidate. Docker packaging copies the existing application sources; the new page adds no runtime file reads or dependencies. Source/migration equality does not establish the production journal's current state.

## Gates and browser acceptance

All four required local commands exited 0 on the final application sources:

| Gate                                                                  | Result                                                               |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `npm run typecheck`                                                   | PASS; Next route generation and TypeScript.                          |
| `npm run lint`                                                        | PASS; no warnings.                                                   |
| `TEST_DATABASE_ADMIN_URL=postgres://localhost:5432/postgres npm test` | PASS; 380 tests, 56 suites, 0 failures/skips.                        |
| `npm run build`                                                       | PASS; new page partially prerendered and new GET route request-time. |
| `git diff --check`                                                    | PASS.                                                                |

The test helper was read before running tests. PostgreSQL identified itself as Homebrew PostgreSQL 17.8 on localhost. Each test file creates a fresh `stem_test_…` database, migrates only that database, resets it before each test and drops it afterwards. Browser verification separately created and checked another temporary database identity, used synthetic Accounts/Attendees, disabled SMTP and dropped the database after stopping the isolated server. Application/production databases and real emails were not used.

Chromium headless against the production build passed 10 browser acceptance groups:

1. Signed-out, Staff and Kiosk page/API restrictions.
2. Admin access, private/no-store API, invalid-input rejection, pagination, page size, URL and reload.
3. Combined role/Account filters, name/Pass Code search, empty states, Back/Forward and whole-day summary isolation.
4. Desktop and 320px/390px phone layouts, six visible navigation controls, no page overflow and targets at least 44px wide.
5. Real interruption of the isolated server: previously loaded rows retained, stale-data warning shown, retry recovers after restart.
6. Manual refresh updates rows/counts without changing the URL; interval polling runs while visible and pauses while hidden using a simulated browser clock/visibility event.
7. Previously issued synthetic Thai/English Event Pass links, unknown-pass 404 and repeated QR-link resolution.
8. Existing Staff desk shows the original Check-In from an older QR link.
9. Existing Staff preview and Cancel create no arrival; explicit Confirm records once.
10. Revoked Admin access removes loaded data, stops polling and offers sign-in; no uncaught browser exceptions.

Screenshots and the synthetic browser harness were inspected locally. No physical iPhone/iPad, Safari, VoiceOver or real camera acceptance was performed. The initial public-link harness used a non-production bind address and encountered the already documented Proxy rewrite behavior; it was corrected to the Docker-equivalent `0.0.0.0` bind and both language checks passed without changing application code.

## Standards

Independent review found **0 remaining documented-standard violations and 0 actionable smell findings**. The review identified the 320px six-control navigation fit, which was corrected and browser-verified. Registration-module ownership, agreed seams, Admin guards, request-time boundaries and stable Table inputs are preserved.

## Spec

Independent review found **0 code findings**. Admin guards, read-only reads, day selection, unfiltered summaries, stable pagination, URL restoration, legacy attribution and polling match the agreed scope. Event Pass and desk/Kiosk writes are unchanged.

Review total: Standards 0; Spec 0; no remaining worst issue on either axis.

## Push and production preconditions

The implementation revision's exact-SHA CI passed after push; evidence is below. The available GitHub connector filters commit workflow queries to PR-triggered runs, so push-run discovery used the GitHub Actions REST API and job evidence used the connector. Local Docker is unavailable; the same SHA's Linux Docker/Compose/nginx job provides image-build evidence. CI does not deploy this repository.

Production rollout remains **BLOCKED**, independently of local checks, until:

1. The operator identifies the running image's source SHA and rebuild record; a checkout SHA alone is insufficient.
2. The production migration journal is compared with candidate SQL/journal files. No new migration is introduced here, but older pending migrations remain possible.
3. The exact release candidate's CI gates and Docker/Compose/nginx job pass. This is verified for the implementation revision below; any later release revision must have its own passing run.
4. The operator resolves the documented 29 October–1 November freeze and any service interruption window, confirms a readable private backup and private off-server copy, and completes relevant real-device acceptance.

Read-only migration metadata for the operator, **not run against production**:

```sql
SELECT to_regclass('drizzle.__drizzle_migrations') AS migration_journal;
-- Only when the journal exists; compare hashes/order with candidate migrations.
SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id;
```

**POST-DEPLOY: NOT VERIFIED.** No production access or rollout occurred. After an authorized rollout, confirm running image/health/logs, reload desks/Kiosks, open previously issued Event Passes in both languages, and verify permitted synthetic desk/Kiosk checks without creating arrivals for real Attendees.

## Post-push evidence

Implementation revision: **`5e9fa8efb7a064b8c740e0e288bf23e98fb2bd13`**. Its parent is the stated task-start/source baseline. `git ls-remote origin refs/heads/main` independently matched the implementation revision after push. The committed candidate contains 20 classified files; `.env.example` and `memory.md` remain local user changes outside it.

The push-triggered [CI run 40887311793](https://github.com/575051410455/hotel-stem-racing/actions/runs/40887311793) completed successfully for that full SHA. The Actions REST response reported `event=push`, the matching `head_sha`, `status=completed` and `conclusion=success`.

| Exact-SHA job                                                                                                                  | Result                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [Typecheck, lint, test and build](https://github.com/575051410455/hotel-stem-racing/actions/runs/40887311793/job/123494381737) | PASS; all four required gates.                                            |
| [Docker image, Compose and nginx](https://github.com/575051410455/hotel-stem-racing/actions/runs/40887311793/job/123494381097) | PASS; Compose/nginx configuration and production application image build. |

Both independent review axes were repeated against the committed `baseline...HEAD` diff: Standards **0 final findings**, Spec **0 final findings**. Browser verification passed all 10 groups above, and a final localhost metadata query found zero remaining temporary test databases. No test database or local test server is left running.

This closeout updates only this evidence and the final ticket's completed acceptance boxes. Application sources remain identical to the tested implementation revision. The final handoff verifies the subsequent documentation commit's exact-SHA CI separately. Production verdict remains **BLOCKED**, and post-deploy status remains **NOT VERIFIED**; passing source/image CI is not evidence of a production rollout.
