# 07: English Back Office: overview and Registration list

**What to build:** The Registrations page is English: the overview cards, the Attendee Role table, the daily chart, and the Registration list.
- Formats: Bangkok time with English months and Gregorian years ("23 Oct 2026, 14:05"), "Sat 31 Oct" for Event Days in the list and filters, the chart's axis, tooltip and screen-reader formats, thousands separators, "1 person" / "N people".
- The list's search, filters, columns, column menu, empty states, pagination, CSV link, the deleted toast, and the Event Pass email cell with its resend flow.
- Attendee Roles and Event Days use the English labels; names and free text are shown as typed; name sorting keeps the Thai collation.

On the integration branch `back-office-english`.

See the spec ("English Back Office", "Formats") and `copy-back-office.md` ("Formats", "Overview", "Registration list", "Event Pass email").

**Blocked by:** 02

**Status:** resolved

- [x] Every string in the listed areas matches `copy-back-office.md`; no Thai left apart from Attendee-entered data.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`: the overview, the chart's tooltip, the list's filters, sort, pagination, empty states and resend.

## Answer

Done on branch `thai-english-07`.

### What's where

| What | Where |
| --- | --- |
| "22 Oct 2026, 14:05" (`formatCreatedAt`, also used by ticket 08's detail page) and "Sat 31 Oct" (`formatEventDay`, list cells and the Event Day filter). `formatPhone` unchanged | `src/app/admin/(back-office)/_registration-list/format.ts` |
| Chart formats: axis "23 Oct", tooltip "Fri 23 Oct 2026", screen-reader table "Friday 23 October 2026"; `formatCount` ("1,234") and the new `formatPeople` ("1 person" / "1,234 people") | `src/app/admin/(back-office)/_daily-registrations/format.ts` |
| The chart card, its empty state and screen-reader table; the chart's name, series label and tooltip | `_daily-registrations/daily-registrations-card.tsx`, `daily-registrations-chart.tsx` |
| Page title "Registrations", the "Overview" heading, the four cards (long Event Day labels from `eventDayLabel(…, "en")`) and the Attendee Role table (`attendeeRoleShortLabels.en`, `label.en`) | `page.tsx`, `_overview/` |
| The list: toolbar, column headers and cells, column menu, status line, empty, session-expired and error states, pagination, CSV link, deleted toast | `_registration-list/` (`registration-list.tsx`, `columns.tsx`, `column-menu.tsx`, `export-csv-link.tsx`, `registration-deleted-toast.tsx`, `registration-detail-link.tsx`, `registration-list-section.tsx`) |
| The Event Pass email status and resend flow, every toast, and `sendFailureMessage` (also used by ticket 08's bulk send). Export names and signatures unchanged | `_registration-list/event-pass-email.tsx` |

### Decisions

- **Dates are put together from `Intl` parts**, not left to a locale's pattern. en-GB writes "Fri, 23 Oct 2026" and "Friday, 23 October 2026" (with commas) and, in current ICU, "Sept". The parts come from en-US's names in Bangkok time and are joined in the deck's British order, so the output is the same in Node and every browser. **September reads "Sep"** (Registrations made in September, and the chart axis): flag it if the organisers want "Sept".
- **Times use `bangkokTime`** from `src/lib/bangkok-time.ts` (24-hour, 00–23), as the CSV does.
- **Counts use en-GB separators** ("1,234"). People counts follow the deck: the big numbers, the chart's tooltip and its screen-reader table read "1 person" / "N people". The Event Pass email cell reads "Sent once" / "Sent N times".
- **The Event Day filter shows the short form** ("Sat 31 Oct"), per the deck's "Event Day, short (list, filters)"; before, it showed the long Thai label. The day cards and the Attendee Role table's columns keep the long form ("Saturday 31 October 2026").
- **Apostrophes in JSX text** are written as string expressions (`{"Email isn't set up"}`) for `react/no-unescaped-entities`, keeping the deck's straight apostrophe.
- **Unchanged:** name sorting (the server's Thai collation: ascending starts กมลชนก, ณัฐธิดา…), the toolbar fitting one row at 1280 with "Clear filters" showing (checked), and every export ticket 08 imports.

### Strings not in the deck

None. Every string is a deck row, including the shared states from "Shell" ("Loading…", "Session expired", "Sign in again", "Try again", "Cancel"). "Other: {what they typed}" in the Attendee Role cell joins the deck's "Other" with the Attendee's text, as the Thai did.

### Needs from other tickets

- **Ticket 06** (in its scope, and its commit `78763ca` on `thai-english-06` already changes them): on `/admin` the only Thai left outside Attendee data comes from its files: the tab title "ระบบหลังบ้าน · …" and `<html lang="th">` (`src/app/admin/layout.tsx`), the sidebar header and nav, the sidebar trigger's "เปิดหรือปิดเมนู" (`src/components/ui/sidebar.tsx`) and the Toaster's close button "ปิดการแจ้งเตือน" (`src/components/ui/sonner.tsx`).
- **Ticket 08:** nothing needed. Its detail page and bulk send get English timestamps, Event Pass email status, resend and failure messages from these files once both are merged.
- **Ticket 10:** after merging 06–09, scan `/admin` again for Thai. Noticed, not changed: a page past the end (`?page=9&pageSize=10` with 40 Registrations) shows "Page 9 of 4" in the pager under "No Registrations on this page" (the Thai did the same).

### Verified

- typecheck, lint, 249 tests and build pass (no new tests: UI isn't an agreed seam).
- **Headless Chrome against `next start`** on `stem_racing_te07` (40 Registrations, 6 Check-Ins), signed in as an Admin, at 1280 px (and 768 and 375 px for layout: no sideways scroll). No console errors.
  - **Overview:** "Total Registrations 40 people +0 today", "People who chose both days count once", "Saturday 31 October 2026 26 people Checked in 6 (1 not registered for this day)", "Sunday 1 November 2026 27 people Checked in 0", "Event Pass email not sent 5 people / Email isn't set up / Go to Email" without SMTP (4 people, no warning, with the SMTP sink after a send). Attendee Role table: title, note, headers, English role rows, "Total".
  - **Chart:** axis "15 Oct … 24 Oct", tooltip by hovering "Fri 16 Oct 2026 / New Registrations / 4 people", the image's name, and the screen-reader table ("Wednesday 14 October 2026 = 4 people" … "Saturday 24 October 2026 = 0 people").
  - **Singulars**, with one Registration left (data restored afterwards): "1 person" on every card, in the tooltip and in the table.
  - **No Registrations at all** (data restored afterwards): the list's "No Registrations yet", "0 in total", every card at "0 people", and the chart's "No Registrations yet / The chart appears with the first Registration".
  - **List:** headers, labels, placeholder, filter options ("All days, Sat 31 Oct, Sun 1 Nov"; "All roles, Parent, Teacher / Lecturer, Student, Sponsor / Supporter, Other"), cells ("23 Oct 2026, 18:34", "Sat 31 Oct", "081-000-7919", "Sent once / last 23 Oct 2026, 16:54 / Resend", "Not sent"), "Details" with the name for screen readers.
  - **Search:** a Thai name as typed (debounced, "4 found"), a phone number with Enter ("1 found"), no match ("No Registrations match your search" with "Clear filters", which resets).
  - **Filters:** each Event Day (26 / 27 found, every row's badges include the day), Teacher and Other ("Other: ศิษย์เก่า"), "Clear filters" in the toolbar.
  - **Sort:** Given name ascending then descending (`aria-sort`, URL), back to Registered.
  - **Columns menu:** nine items in English, hiding Phone keeps the menu open, Escape closes it.
  - **Pagination:** 10 rows per page, "Showing 1–10 of 40 · Page 1 of 4", Next, Last (Next and Last disabled), Previous, First; button names; nav "Pages". A page past the end: "No Registrations on this page / Back to the first page", which goes back.
  - **States via `Fetch`:** a 401 shows "Session expired" with "Sign in again" → `/admin/login`; an offline failure shows "Couldn't load Registrations" (an alert) and "Try again" loads the list.
  - **CSV link:** "Export CSV", with the deck's title.
  - **Deleted toast:** `?deleted=ep-e368b993&q=demo` shows "Deleted Registration EP-E368B993" and the URL keeps only `?q=demo`; a malformed code shows nothing.
  - **Resend:** the prompt "Send the Event Pass to demo1@example.com again?" with focus on Send, Cancel returning focus to Resend; without SMTP the toast "Can't send: email (SMTP) isn't set up"; with a local SMTP sink "Event Pass sent", the cell going "Not sent" → "Sent once / last 24 Oct 2026, 14:36" → "Sent 2 times"; an address the sink refuses: "Couldn't send: the email server refused this address. Check the Attendee's email (EENVELOPE)". With the endpoint's answers faked through `Fetch`: offline, signed out ("Session expired" with "Sign in again"), not found, quota, EAUTH, ECONNECTION, recipient rejected, APP_URL and an unknown reason, each worded as in the deck.
  - **Thai scan** (visible and screen-reader text, `aria-*`, `title`, `placeholder`) of `main` in every state above: only Attendee-entered data (names, the "Other" text and its `title`) and ticket 06's sidebar trigger; in toasts only ticket 06's close button.
