# 22: Consolidate helpers duplicated across tickets

**What to build:** No behaviour change. Shared Back Office and domain helpers live in one place each, so a label or rule changes in one edit. Found by the full-build standards review.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] One sign-in path constant (`/admin/login`), currently defined in 7 files, in a module that isn't server-only
- [x] One set of Thai label maps for Attendee Role (including the short "อื่น ๆ"), Referral Source and Event Day, used by the counts panel, check-in, Kiosk, the detail page, the CSV and the Event Pass card
- [x] One Bangkok date/time formatting helper. `event-day-availability`, `csv`, `check-in-result` and the email currently each have their own.
- [x] One Registration-id parser for the detail, resend and delete paths
- [x] Shared Back Office route-handler helpers: the no-store header, the 401 guard, the zod 400 response, and `rejectUnlessSameOrigin` for every mutating route
- [x] Check-In status presentation (tone and copy) shared by the desk and the Kiosk instead of two switches
- [x] All existing tests still pass with no test changes beyond imports


## Answer

Done on branch `ticket-22-consolidate-helpers`. There is no behaviour change Staff or Attendees can see, and no existing test was edited, not even its imports.

### Where each helper lives now

| Helper | Home | Replaced |
| --- | --- | --- |
| `SIGN_IN_PATH` (`/admin/login`) | the pure access rules, next to `KIOSK_PATH` | 7 copies: proxy, session (`BACK_OFFICE_SIGN_IN_PATH`, removed), check-in result, list, email cell, delete, bulk send |
| `attendeeRoleShortLabels`, `referralSourceShortLabels` ("อื่น ๆ") | the Field rules (`fields`), next to the form labels | counts panel, check-in result, list (`attendeeRoleListLabels`, removed) and its "อื่น ๆ: …" cell, detail page, CSV |
| `findEventDay(date)`, `eventDayLabel(date)` | the Event configuration (`event`) | counts panel, check-in result, check-in desk, Kiosk station, detail page, bulk send, CSV, Event Pass card |
| `bangkokDate`, `bangkokTime(…, { seconds })`, `bangkokInstant(date, time)` | new pure module `bangkok-time`, with 5 tests (seam recorded in the spec) | event-day-availability (`eventDate`), CSV (`inBangkok`), check-in result (`bangkokTime`), email dates (`bangkokInstant`) |
| `isRegistrationId`, `registrationIdFromPath` | new pure module `registrations/registration-id` | detail module, resend module (its own range check), resend route (its own parser) |
| `noStore`, `noStoreJson`, `unauthorized`, `invalidParams`, `rejectUnlessSameOrigin` | `api/back-office/route-helpers` (`same-origin.ts` renamed and grown) | all 6 Back Office routes. Every mutating route (DELETE, resend, batch) already called `rejectUnlessSameOrigin`, and the DELETE route's comment, which said otherwise, now says so. |
| `checkInHeading(result)`: tone, icon, Thai and English headline | check-in result | the desk's and the Kiosk's two switches. Each keeps only its own details below the headline: instructions for Staff, bilingual notes for Attendees. |

### Left alone on purpose

- **The 401 check** (`getCurrentStaff()` then `if (!staff) return unauthorized()`) stays as two lines in each route. A wrapper wouldn't be shorter, and the response itself is shared.
- **The email's own `Intl` formats** (weekday names, time ranges with `formatRange`) stay. They are email presentation, and now build their instants with `bangkokInstant`.
- **`formatCreatedAt` in the list,** and the CSV's `localPhone` duplicating the list's `formatPhone`, weren't in this ticket's list. They are candidates for a later cleanup.

### Review

A Standards and Spec review ran on the uncommitted diff. Fixed:
- **GLOSSARY:** "visitors" became "Attendees".
- **The Bangkok time test seam** is now recorded in the spec.
- **Names:** the SVG wrapper `Icon` became `IconFrame`, so it no longer shadows the heading's `Icon`, and `json` became `noStoreJson`.
- **`findEventDay`** now also covers the desk's and Kiosk station's null-fallback lookups.
- **The list's "อื่น ๆ: …" cell** uses the shared label.
- **The detail page's Referral Source line** is now one expression.
- **The `registration-id` header comment** no longer lists its callers.
- **The Kiosk's unreachable signed-out result card** lost its override. A signed-out Kiosk always shows the whole-screen notice instead (`shown` is `attempt` or null), so that card can't render. It now shows the shared heading, with the English made a translation of the Thai ("Session expired").

### Verified

- **typecheck, lint, build:** pass.
- **Tests:** 200 pass, the 195 existing plus 5 for Bangkok time.
- **Rendering, old against new:** both versions rendered with `react-dom/server` from `main`'s files.
  - The desk's Check-In result panel is byte-identical for all 9 cases, including "อื่น ๆ" and the Bangkok time.
  - The Kiosk's result card is byte-identical for 7 of 8 statuses. The eighth is the unreachable signed-out card above.
- **`next start` against local Postgres,** with a throwaway Registration and Staff Account, both deleted afterwards:
  - Signed out:
    - the list API answers 401 with `private, no-store`
    - cross-site DELETE and resend answer 403
    - batch answers 401
    - `/admin` and `/kiosk` redirect to `/admin/login`
  - Signed in:
    - an invalid filter gives 400 with field errors and `no-store`
    - resend `abc` and delete `0` answer 404 `not-found`
  - The detail page shows ผู้ปกครอง, both Event Day labels and Facebook.
  - The counts panel shows "อื่น ๆ".
  - The CSV row has the Bangkok date and time, the labels joined with "; ", the dated filename and `no-store`.
  - The Event Pass page shows both Event Day labels. An unknown pass gives 404.
  - After the review fixes, the signed-out smoke test and the build were rerun.

## Comments

- 2026-10-23: Brought forward. It is now the prerequisite for `.scratch/back-office-redesign/` (spec decided in grilling) and must be merged before that work starts, by 28 Oct at the latest. All six items are in scope, including the shared Check-In presentation for the desk and the Kiosk.
