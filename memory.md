# Project memory

Updated: 27 October 2026 (Asia/Bangkok).

## Current implementation

- Branch: `main`.
- `939d0e7`: Staff Check-In redesign with read-only inspection followed by explicit Confirm Check-In. Camera/manual entry share one active Attendee and a locked reviewed Event Day. Cancel records nothing; uncertain confirmation retains the pass/day for an idempotent retry.
- The station is centered below the header, with camera/manual input on the left and Attendee/result/actions on the right in landscape. Narrow screens put results first. Event Day choices wrap; the sidebar collapses on entry and remains toggleable.
- Continuous scanning suppresses a handled QR while it remains in view. A different QR can be accepted as soon as the desk is ready. The previous successful result is labeled separately from readiness.
- Old `/admin/check-in?kiosk=1` links open the Staff desk. The separate `/kiosk` retains immediate Check-In and its Account/current-day restrictions.
- `8b3bd56`: Back Office origin checks and private database-backup permissions.
- Feature sources: [spec](.scratch/check-in-ui-redesign/spec.md), [tickets](.scratch/check-in-ui-redesign/issues/), [ADR 0006](docs/adr/0006-staff-confirm-check-ins-after-preview.md).

## Verification and outstanding acceptance

- Application checks passed for `939d0e7`: `npm run typecheck`, `npm run lint`, `npm test` (373 tests, zero failures/skips), and `npm run build`.
- Independent Standards and Spec reviews found no issues, including a follow-up review of the persistent status-announcement region.
- Production-build browser checks used disposable data and real authentication/Server Actions. They covered preview/cancel, confirmation, duplicates, wrong-day admission, deletion/concurrent Check-In after preview, lost-response retry, Account restrictions, session recovery, denied camera permission, responsive layouts and separate-Kiosk current-day enforcement.
- QR-video integration passed through html5-qrcode's existing ZXing fallback. Headless Chrome's native `BarcodeDetector.detect()` did not settle; it was disabled with a browser feature flag only for this check. Product decoder configuration was unchanged.
- Ticket 01 is resolved. Tickets 02 and 03 remain `ready-for-human` for real-iPad/VoiceOver acceptance and release checks. Do not mark hardware acceptance complete based on simulated video or viewport checks.
- Before rollout, check a real iPad: permission/start/retry/switch/stop, continuous preview, held QR after Confirm/Cancel/Scan next, removal/re-presentation, next different QR, manual keyboard dismissal, layout/zoom/touch and VoiceOver. Also regression-check the separate Kiosk. The handled-QR removal proxy is 1.2 seconds without a successful decode and needs actual-device validation.
- Detailed evidence and acceptance checklist: [verification.md](.scratch/check-in-ui-redesign/verification.md).

## Database mismatch fixed on 27 October

- Reported symptom: Better Auth session lookup failed with PostgreSQL `42703`, `column "must_change_password" does not exist`.
- The database selected by this checkout's `.env` had only migrations `0000`–`0003`. Applied history matched the committed migration files; migrations `0004_account-management`, `0005_account-history` and `0006_pdpa-acknowledgment` were pending.
- Backed up that database before migrating. A private custom-format archive was verified with `pg_restore --list`; directory permissions are `0700` and dump permissions `0600`. Local recovery file: `~/.stem-racing-db-backup-1mQs4y/before-account-schema-update.dump`. Keep the dump outside Git.
- Ran `npm run migrate`: three migrations applied, seven total. A second run applied zero.
- Verified the original Account-column query, Better Auth's lookup of the affected Account, all three Account fields, the Account History table and all three PDPA columns.
- No application-code change was needed for this database repair. No production container rollout was performed.
- This repair applies to the database selected by this checkout's environment. Do not assume it updated the database used by production Docker Compose.

## Production deployment handoff

- Docker Compose overrides `DATABASE_URL` to its internal `db` service. The app image runs `node scripts/migrate.mjs` before `server.js`; a migration failure prevents the server from starting.
- Before deploying, verify the intended commit is on remote `main`, wait for its CI run (including the Docker image job), complete the device acceptance above, and back up the production database according to [the deployment guide](docs/deploy.md).
- Keep the production `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` unchanged across builds. Never record credentials or environment values in this file.
- On the production checkout's `main` branch, after the prerequisites:

  ```sh
  git pull --ff-only origin main
  docker compose up -d --build
  docker compose ps
  docker compose logs --tail=100 app
  ```

- Reload all Staff desks and Kiosk iPads after rollout.
- Target rollout before the freeze beginning 29 October 2026. The existing freeze through 1 November has not been lifted.
- At this handoff, the GitHub connector verified remote `main` at `8310e9a663b8d3445641c4c0f50ab6ee4ac92357`; `8b3bd56` and `939d0e7` were still local. Git HTTPS could not read credentials (`osxkeychain`), and SSH authentication failed (`publickey`; no agent identity). Authenticate Git transport, push the pending commits, then verify CI before rollout. Read access through the connector does not establish working Git push credentials.

## Workspace note

- `.env.example` has a pre-existing user modification. It was intentionally excluded from the Check-In implementation commit; preserve it and keep it outside the memory-only commit.
