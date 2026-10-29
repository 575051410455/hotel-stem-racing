# Check-In Activity

Status: ready-for-agent

Synthesized on 29 October 2026 from accepted Q1–Q13. The organiser subsequently requested implementation, commit/push and a dev-check-prod review, including existing QR/Event Pass compatibility. This authorizes implementation and push, not production rollout.

## Problem Statement

Staff using Admin Accounts need a single place to monitor recorded Check-Ins during the Event and review them afterwards. The current Registration overview has totals, but no searchable, paginated history across Attendees showing when each Check-In was recorded and which Account recorded it.

## Solution

Add an English, Admin-only, read-only Check-In Activity destination in the Back Office. Select one Event Day to see five summary counts and the latest recorded Check-Ins in a TanStack Table, fetched through TanStack Query. Search and filter the table, preserve the view in the URL, and refresh automatically every 15 seconds while visible or manually with Refresh.

## User Stories

1. As a Staff member with an Admin Account, I want Check-In Activity in Back Office navigation, so that I can find the Event Day's recorded arrivals.
2. As a Staff member with an Admin Account, I want English copy consistent with the Back Office, so that terminology stays familiar.
3. As an organiser, I want only Admin Accounts to access this page and its data, so that Staff and Kiosk Accounts retain their existing restrictions.
4. As a Staff member with an Admin Account, I want a read-only page, so that reviewing arrivals does not create or undo Check-Ins.
5. As a Staff member with an Admin Account, I want to select one configured Event Day, so that the history and overview describe the same day.
6. As a Staff member with an Admin Account, I want today's Event Day selected initially, so that I can monitor the active day immediately.
7. As a Staff member with an Admin Account, I want the next Event Day before the Event and the latest Event Day afterwards, so that the initial view remains useful outside Event dates.
8. As a Staff member with an Admin Account, I want Bangkok time used for dates and timestamps, so that the page agrees with operations at the venue.
9. As a Staff member with an Admin Account, I want Check-Ins grouped by their recorded Event Day, so that rehearsals recorded at another calendar date still appear under the chosen Event Day.
10. As a Staff member with an Admin Account, I want the selected Event Day's registered total, so that I know the expected number of Attendees.
11. As a Staff member with an Admin Account, I want the number registered for that Event Day who have checked in, so that I know how many expected Attendees have arrived.
12. As a Staff member with an Admin Account, I want the number registered for that Event Day still awaiting Check-In, so that I know how many expected Attendees remain.
13. As a Staff member with an Admin Account, I want outside-registered-day Check-Ins shown separately, so that unexpected arrivals do not distort the expected count.
14. As a Staff member with an Admin Account, I want all Check-Ins for the selected Event Day counted, so that I know total recorded arrivals.
15. As a Staff member with an Admin Account, I want overview counts to remain for the entire selected Event Day while filtering rows, so that I keep sight of the overall situation.
16. As a Staff member with an Admin Account, I want an explicit explanation of the overview's scope, so that search results are not mistaken for Event Day totals.
17. As a Staff member with an Admin Account, I want each row's Attendee name and Pass Code, so that I can identify the recorded arrival.
18. As a Staff member with an Admin Account, I want each row's Attendee Role and organisation, so that I can interpret the arrival in context.
19. As a Staff member with an Admin Account, I want each row's Check-In date and time, so that I can review when it was recorded.
20. As a Staff member with an Admin Account, I want the Account that recorded each Check-In, so that I can follow up with the appropriate Staff member.
21. As a Staff member with an Admin Account, I want missing historical Account attribution handled clearly, so that an older Check-In is not hidden or attributed to an invented Account.
22. As a Staff member with an Admin Account, I want an outside-registered-day badge, so that the exception is visible without relying on color alone.
23. As a Staff member with an Admin Account, I want newest Check-Ins first, so that recent arrivals are easy to find.
24. As a Staff member with an Admin Account, I want to search by name, Pass Code or organisation, so that I can locate an Attendee quickly.
25. As a Staff member with an Admin Account, I want to filter by Attendee Role, so that I can review a group of Attendees.
26. As a Staff member with an Admin Account, I want to filter by the recording Account, so that I can review its recorded Check-Ins.
27. As a Staff member with an Admin Account, I want to filter ordinary and outside-registered-day Check-Ins, so that I can review either group.
28. As a Staff member with an Admin Account, I want to clear table search and filters while retaining the Event Day, so that I can return to the day's complete history.
29. As a Staff member with an Admin Account, I want 25 rows initially and a choice of 25, 50 or 100, so that I can balance detail and page length.
30. As a Staff member with an Admin Account, I want pagination and a matching result count, so that I can navigate the full history without loading every row.
31. As a Staff member with an Admin Account, I want the Event Day, search, filters and pagination in the URL, so that reload, Back/Forward and shared links preserve my view.
32. As a Staff member with an Admin Account, I want automatic refresh every 15 seconds while the page is visible, so that newly recorded arrivals appear during the Event.
33. As a Staff member with an Admin Account, I want a Refresh button, so that I can request current rows and counts immediately.
34. As a Staff member with an Admin Account, I want refresh to retain my selected day, filters and page, so that monitoring does not interrupt a review.
35. As a Staff member with an Admin Account, I want loading, no arrivals, no matches, stale-page and recoverable failure states distinguished, so that I know what to do next.
36. As a Staff member with an Admin Account, I want expired or revoked access to stop exposing data and offer sign-in, so that the page respects current permissions.
37. As an Attendee with an existing Event Pass, I want my QR link and Pass Code to remain valid, so that this monitoring feature does not affect admission.
38. As a Staff member at the entrance, I want the existing desk preview/Confirm and immediate Kiosk Check-In flows preserved, so that recording arrivals continues as before.

## Implementation Decisions

- Extend the Registration module with read operations for Check-In Activity; it continues owning database reads and domain rules. The existing server composition root remains the only place that builds its environment-dependent collaborators.
- Reuse existing Check-In, Registration and Account storage. No schema migration, new package, Check-In write change or regeneration of existing Event Pass UUIDs/Pass Codes is required.
- A single Admin-guarded GET contract accepts a configured Event Day, optional text query, Attendee Role, recording Account identifier and outside-registered-day boolean, plus one-based page and page size. Return the filtered page, filtered total, unfiltered selected-day summary and recording Account choices. Validate at the HTTP boundary and return private, no-store JSON. No mutation endpoint is added.
- Use the Check-In's Event Day for selection and its recorded timestamp for display/order. Newest first uses a stable Check-In identifier tie-breaker.
- Summary definitions: registered = Registrations choosing that Event Day; checked-in registered = their Check-Ins on that Event Day; awaiting = registered minus checked-in registered; outside = recorded outside-registered-day flags for that Event Day; total = all recorded Check-Ins for that Event Day. The overview never applies table search, role, Account or outside filters. Do not subtract outside arrivals from the registered population.
- Join Account information with a left join so a null or unresolved historical Account does not discard a Check-In. Show Unknown Account when attribution cannot be resolved. Display current Account names, not historical snapshots; filter by stable Account identifier, including disabled Accounts with recorded Check-Ins.
- Display name, Pass Code, Attendee Role, organisation, Check-In timestamp, recording Account and an outside-registered-day indicator. Do not return Event Pass tokens, contact fields or whole Account/session records to the client.
- Search supports Thai/English name substrings, full names, case-insensitive Latin text, normalised Pass Codes and organisation text. Search and the optional table filters combine; reset page to one after changing day, search, filters or page size.
- Clear filters removes text, role, Account and outside filters and resets page one; retain Event Day and page size.
- A pure Check-In Activity View contract owns URL parsing/serialization and initial-day selection. Resolve the default day with an explicit current instant in Asia/Bangkok. Preserve an explicit selected day in links, including the initial default, so a shared view does not silently change on a later date. Malformed page links fall back safely; malformed API requests are rejected.
- Use the installed TanStack Table v9 API in manual server-pagination mode, and the shared Back Office TanStack Query provider. Scope the query key to the full resolved view and refresh rows and summary together. Stop interval polling when hidden or after unauthorized responses; unmounting leaves no polling behind. Refresh never resets view state.
- Follow existing Back Office tokens, semantic table controls and navigation on desktop, tablet and phone. Keep the history horizontally scrollable where necessary and all controls keyboard accessible.
- Apply the existing Admin guard in both the page and GET handler; the layout and hidden navigation are not authorization boundaries. Preserve disabled/must-change-password behavior, Staff desk access and Kiosk restrictions from ADRs 0003–0006.
- Keep request-time session, clock and URL reads below Suspense or after the supported request-time connection boundary. Read bundled Next.js and installed Table documentation before coding.

## Testing Decisions

- Test observable results through the existing Registration module public interface against a real isolated PostgreSQL database. Use the existing per-file fresh-database helper, reset before each test and drop afterwards. Follow prior Registration search, head-count, Check-In and detail/deletion tests.
- Test the pure Check-In Activity View contract for Bangkok date defaults, invalid inputs, page normalization and URL round trips. This is the only added pure seam; do not unit-test components, route wrappers or internal SQL builders.
- Use synthetic Attendees and Accounts; fake only permitted boundaries such as the clock and email sender. Test selected-day separation, timestamp/date mismatch, counts, two-day Registrations, duplicate Check-Ins, search, combined filters, stable pagination, missing Account attribution and deletion effects.
- Verify browser behavior for Admin-only navigation and direct endpoints, Staff/Kiosk/signed-out restrictions, URL/history restoration, filter isolation from summary, empty/failure states, refresh, hidden-tab behavior and unchanged view state. Keep browser evidence distinct from automated tests and do not claim hardware-camera acceptance from a simulated viewport.
- Run typecheck, lint, the complete test suite and production build before committing. Check the exact pushed SHA's gates and Docker/Compose/nginx CI jobs. Review changed-file coverage and existing QR/Event Pass compatibility with dev-check-prod; report unavailable production/image/migration/device evidence explicitly.

## Out of Scope

- Recording repeated scans, failed attempts, previews, Check-In reversals or an immutable audit trail.
- Retaining Check-Ins after their Registration is deleted; existing cascade deletion remains.
- Registration edits, email activity, Account History, CSV export, new charts or access for Staff/Kiosk Accounts.
- QR-versus-manual or desk-versus-Kiosk attribution: existing records do not capture those modes reliably.
- Changing public bilingual pages, Event Pass codec/URLs, authentication, admission rules, camera behavior, existing Registration overview or Event dates.
- Deploying, migrating or writing to production; sending real emails or using a real Attendee's Event Pass for a test arrival.

## Further Notes

- Event Days are 31 October and 1 November 2026, with Bangkok time throughout.
- History contains only the first successful Check-In per Registration per Event Day. Repeat scans and failed attempts are not stored. Registration deletion removes its Check-Ins and changes counts.
- Existing ADR/spec scheduling freezes the Back Office from 29 October through 1 November, except bug fixes. This feature may be implemented and pushed as requested; production rollout still needs the operator's scheduling decision and production evidence. Push-triggered CI does not deploy this repository.
- No broad prefactoring is needed. Implement five complete slices: selected-day history, selected-day overview, search, filters and live refresh/recovery. Search and filters depend only on the initial history; refresh needs the history and overview, not unrelated filter implementation.
