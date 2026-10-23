# Spec: Back Office redesign (shadcn/ui dashboard-01 layout)

Status: ready-for-agent

Vocabulary follows `GLOSSARY.md`. "dashboard-01" is only the name of the shadcn/ui block the layout comes from. UI copy and code say Back Office (ระบบหลังบ้าน), never "dashboard" or "admin panel". Respects ADR 0003 (Kiosk Accounts are check-in only). Builds on the v1 spec in `.scratch/stem-racing-registration-v1/`.

**Prerequisite:** v1 ticket 22 (consolidate shared helpers) is merged first.
**Deadline:** everything is merged to `main` by **28 October 2026**. From 29 October to 1 November (the Event) the Back Office is frozen except for bug fixes.

## Problem Statement

The Back Office works, but it is a plain header with three text links above full-width pages. On the Back Office home, the head counts sit in two cards above the Registration list. Staff can't see at a glance:
- how registration is going (how many registered today, the trend day by day)
- how many people have arrived on an Event Day
- how many Attendees still haven't been sent their Event Pass email

Results of actions such as resending an Event Pass email, finishing a bulk send or deleting a Registration appear as inline text that is easy to miss. The organisers want the Back Office to look and work like shadcn/ui's dashboard-01: a sidebar app shell, summary cards, a chart and a data table, built entirely from shadcn/ui components.

## Solution

Every signed-in Back Office page sits in one app shell:
- a sidebar with the Back Office name, the three pages and the signed-in Staff member's account menu
- a sticky header with a sidebar toggle and the page title
- on phones, the sidebar slides in as a sheet

The Back Office home keeps its URL and becomes one overview page:
1. Four summary cards:
   - all Registrations, with today's new ones
   - each Event Day: Registrations and Check-Ins so far
   - Registrations not yet sent their Event Pass email
2. A table of Registrations per Event Day by Attendee Role, beside a chart of new Registrations per day.
3. The Registration list, restyled with a dashboard-01 toolbar, a column picker and pagination. Its server-driven search, filters, sorting and paging are unchanged.

Action results (single resend, bulk send, delete) appear as toasts. Check-In results never do.

The Kiosk (`/kiosk`), Kiosk mode at the check-in desk, the sign-in page and every public page are unchanged.

## User Stories

### Staff: the app shell

1. As Staff, I want every Back Office page in the same sidebar layout, so that I always know where I am and how to get elsewhere.
2. As Staff, I want the sidebar to show "ระบบหลังบ้าน" and the Event name, so that I know which system and Event I'm in.
3. As Staff, I want sidebar links to ผู้ลงทะเบียน, เช็คอิน and ส่งอีเมล, so that I can reach each part of the Back Office in one click.
4. As Staff, I want the link for the page I'm on highlighted, so that I can see where I am.
5. As Staff on a Registration's detail page, I want ผู้ลงทะเบียน highlighted, so that I know the detail belongs to the list.
6. As Staff, I want my name and email at the bottom of the sidebar, so that I can confirm which Account I'm signed in with.
7. As Staff, I want to sign out from a menu on my name, so that signing out takes no hunting.
8. As Staff, I want to hide the sidebar with a button or Ctrl/⌘+B, so that wide tables get the whole screen.
9. As Staff, I want the sidebar open whenever I load a page on a computer, so that the navigation is always where I expect it.
10. As Staff on a phone, I want the sidebar to slide in from a menu button and close after I pick a page, so that the screen stays free for the content.
11. As Staff, I want a header that stays at the top with the page's title, so that I know what page I'm on while scrolling.
12. As Staff on a Registration's detail page, I want a breadcrumb "ผู้ลงทะเบียน › EP-XXXXXXXX" with a link back to the list, so that I can return in one tap.
13. As Staff, I want the Back Office in Thai, including every label the block brings with it, so that the whole team can use it.
14. As Staff, I want the Back Office to work by keyboard, with visible focus, so that I can work without a mouse.
15. As Staff using a screen reader, I want each page to have one main heading and a labelled navigation, so that I can find my way.

### Staff: the overview

16. As Staff, I want a card with the total number of Registrations, so that I know how many people have registered.
17. As Staff, I want that card to show how many Registrations arrived today (Bangkok time), so that I can see whether the latest promotion is working.
18. As Staff, I want one card per Event Day with the number of Registrations that chose it, so that I can plan each day's crowd.
19. As Staff, I want each Event Day card to show how many Check-Ins have been recorded that day, so that I know how many people have arrived.
20. As Staff, I want the Check-In count to include people who arrived on a day they didn't register for, with that part shown separately as "ไม่ได้ลงทะเบียนวันนี้", so that the number matches who is actually in the venue and I can see why it may exceed the registrations.
21. As Staff, I want a card with the number of Registrations that have never been sent their Event Pass email, linking to the email page, so that I know whether a bulk send is needed.
22. As Staff, I want that card to say "ระบบอีเมลยังไม่ได้ตั้งค่า" when email sending isn't configured, so that I don't wonder why the number never goes down.
23. As Staff, I want a table of Registrations per Event Day by Attendee Role, so that I know how many parents, teachers, students, sponsors and others to expect each day.
24. As Staff, I want to be reminded that someone who chose both Event Days counts on each day, so that I don't add the days together.
25. As Staff, I want a chart of new Registrations per day since registration opened, so that I can see the trend.
26. As Staff, I want days with no Registrations to show as zero in the chart, so that gaps aren't hidden.
27. As Staff, I want to hover or tap a point on the chart to see that day's date and count, so that I can read exact numbers.
28. As Staff using a screen reader, I want a text alternative for the chart, so that I get the same information.
29. As Staff, I want the overview numbers to update when I reload the page or after I resend, bulk send or delete, so that what I see reflects my own actions.
30. As Staff, I want numbers formatted the Thai way, with thousands separators, so that they are easy to read.

### Staff: the Registration list

31. As Staff, I want search, the Event Day filter, the Attendee Role filter, clearing filters and CSV export in one toolbar, so that every list control is in one place.
32. As Staff, I want a "คอลัมน์" menu to hide and show columns, so that I can fit the columns I need on a small screen.
33. As Staff, I want hidden columns to come back when I reload, and the CSV export to include every column regardless, so that hiding a column never loses data.
34. As Staff, I want pagination with rows per page, "หน้า X จาก Y" and buttons for first, previous, next and last page, so that I can move through a long list quickly.
35. As Staff, I want search, filters, sorting and paging to keep working exactly as now, including in the URL, so that links and the back button still work.
36. As Staff, I want the filters to stay native selects on phones, so that picking a value uses the phone's own picker.

### Staff: action feedback

37. As Staff, I want a toast after I resend an Event Pass email from the list or the detail page, saying whether it worked, so that I don't have to look for a message.
38. As Staff, I want error toasts to stay until I close them, and success toasts to close themselves after a few seconds, so that I don't miss failures and successes don't pile up.
39. As Staff, I want a toast with a summary when a bulk send finishes or stops, while its progress stays on the page as it runs, so that I can follow a long send and still be told when it ends.
40. As Staff, I want a toast "ลบการลงทะเบียน EP-… แล้ว" after deleting a Registration, shown once, so that reloading the list doesn't repeat it.
41. As Staff at the check-in desk, I want Check-In results to stay as the large panel on the page, never a toast, so that I can't miss whether to let someone in.
42. As Staff, I want toasts announced to screen readers, so that feedback isn't visual-only.

### Staff and Kiosk: at the door

43. As Staff on a phone at the entrance, I want the check-in desk to work as before inside the new layout, so that the redesign doesn't slow down the queue.
44. As Staff, I want Kiosk mode at the check-in desk to cover the whole screen, including the sidebar, header and any toast, so that Attendees see only the Kiosk.
45. As a Kiosk Account, I want the Kiosk unchanged and never to see the Back Office shell, so that a Kiosk iPad stays check-in only (ADR 0003).

### Attendee and operator

46. As an Attendee, I want the public pages unchanged, so that registering and my Event Pass work as before.
47. As the operator, I want no `/dashboard` page or demo data from the block in the app, so that nothing unprotected or fake is published.
48. As the operator, I want the redesign merged by 28 October and frozen through the Event, so that the Back Office is stable on the day.

## Implementation Decisions

### Sequencing

- **Order:**
  - v1 ticket 22 (helpers consolidated, no behaviour change) is merged first.
  - Then the app shell.
  - Then, in parallel: the overview cards and role table; the chart; the Registration list restyle; the toasts.
- The overview cards and role table own the overview grid. The chart fills a slot in it.
- **Deadline and freeze:** all work is merged by 28 October. From 29 October to 1 November, only bug fixes.

### Installing the block

- **Install:** run the shadcn CLI to add `dashboard-01`.
  - Existing ui components (button, card, table, badge, input, label, native select) are not overwritten unless their diff has been reviewed.
  - The Back Office's contrast fixes live in its theme tokens and must survive.
- **Adapt:** the block's app sidebar, site header, section cards and interactive chart become Back Office components, translated to Thai, with tabler icons replaced by lucide (`components.json` sets lucide).
- **Remove:**
  - the block's page and demo data: no `/dashboard` route may exist, and it must 404
  - its data table, documents navigation and secondary navigation
  - unused primitives the CLI added (drawer, tabs, toggle group, checkbox, select and any other the final code doesn't import)
  - their packages: dnd-kit, `@tabler/icons-react`, vaul
- **New packages:**
  - only what the used primitives need: recharts (chart), sonner (toasts), tw-animate-css (Sheet and Dropdown animations)
  - Radix primitives come through the existing `radix-ui` package
- **Not taken from the block:**
  - TanStack Table stays at v9. The block's v8 data table isn't used.
  - zod stays at its current version.

### App shell

- **Layout:** the signed-in Back Office layout wraps every Staff page in the shadcn Sidebar.
  - The four pages: the Back Office home, the check-in desk, the email page and the Registration detail.
  - It replaces today's header and Staff menu.
  - `/admin/login` and `/kiosk` are outside it, as now.
- **Sidebar state:**
  - open by default on desktop, collapsible off-canvas by its trigger or Ctrl/⌘+B
  - The state is **not** restored on load. Doing so would mean reading a cookie in the layout, which is request-time data under Cache Components and would make every page wait.
  - The layout stays static.
- **Mobile:** below shadcn's mobile breakpoint the sidebar is a Sheet. Choosing a page closes it.
- **Sidebar header:** "ระบบหลังบ้าน" with the Event name.
- **Sidebar navigation** (labelled "เมนูระบบหลังบ้าน"), each item with a lucide icon:
  - ผู้ลงทะเบียน: the Back Office home, also active on Registration detail pages
  - เช็คอิน
  - ส่งอีเมล
- **Sidebar footer:** the Staff account menu.
  - It shows a lucide person icon (no initials: Thai names can start with a leading vowel), the Staff member's name, and their email in small text.
  - Opening it shows "ออกจากระบบ", which submits the existing sign-out action.
  - It reads the session behind its own Suspense boundary, as the Staff menu does today, with a skeleton fallback.
- **Header and page titles:**
  - The site header is sticky and holds the sidebar trigger, a separator and the page title as the page's only h1.
  - Each page renders the header with its own title, because the layout can't know the page: ผู้ลงทะเบียน, เช็คอิน, ส่งอีเมล.
  - The detail page renders a breadcrumb "ผู้ลงทะเบียน › {Pass Code}". The Pass Code part streams with the detail data.
  - The home page's "ระบบหลังบ้าน / ยินดีต้อนรับ {name}" block is removed.
- **Page content:** the check-in desk, the email page and the detail page keep their content and behaviour. Only page-level wrappers change to sit in the inset area.
- **Kiosk mode** at the check-in desk still covers the whole viewport, above the sidebar, the header and the mobile sheet. Entering Kiosk mode dismisses any open toast, so none can show over it.
- **Access:** unchanged. Each page and section still checks the session itself, and a Kiosk Account is still sent to `/kiosk` without rendering the shell's data.

### Overview on the Back Office home

- **URL:** the page stays at `/admin` with the same URLs and query parameters.
- **Order:** the four cards; then the role table and the chart side by side (stacked on narrow screens); then the Registration list.
- **Rendering:** cards, role table and chart are Server Components that check the session, behind Suspense boundaries with skeleton fallbacks.
- **Card 1: ลงทะเบียนทั้งหมด**
  - all Registrations (distinct people) with "คน"
  - a badge "+N วันนี้": Registrations created since midnight Bangkok time today
  - no percentage trend: there is no period to compare against
- **Cards 2–3: one per Event Day**, in Event order, titled with the Event Day's label.
  - the number of Registrations that chose that day
  - a footer "เช็คอินแล้ว X": all Check-Ins recorded for that Event Day
  - " (ไม่ได้ลงทะเบียนวันนี้ Y)" when Y > 0, where Y is how many of those Check-Ins were outside the Attendee's registered days
  - "ไม่ได้ลงทะเบียนวันนี้" is the same wording the check-in desk and Kiosk use
- **Card 4: ยังไม่ได้ส่งอีเมล Event Pass**
  - Registrations whose Event Pass email was never sent, with a link to the email page
  - when email sending isn't configured, it adds "ระบบอีเมลยังไม่ได้ตั้งค่า"
- **Role table card:**
  - rows are Attendee Roles ("อื่น ๆ" for Other), columns are Event Days
  - the note "ผู้ที่เลือกทั้ง 2 วันนับในแต่ละวัน"
  - it replaces the current counts panel
- **Chart card:**
  - an area chart (shadcn chart on recharts) of new Registrations per Bangkok day, from the day of the first Registration to today
  - one series, no range toggle
  - Thai short dates on the axis; a tooltip with the date and "N คน"
  - a screen-reader text alternative giving the same day-by-day numbers
  - with no Registrations yet, the card says so instead of drawing an empty chart
- **Freshness:** no polling. The numbers refresh on page load, and after a single resend or a bulk send the page refreshes its server data. A delete already lands on a fresh `/admin`.

### Registration module

The highest seam, as in v1. Every new read goes through the Registration module and uses its injected clock for "today".

- **The existing head-count read** (Registrations per Event Day by Attendee Role, plus distinct total) gains:
  - `registeredToday`: Registrations created on today's Bangkok calendar day
  - per Event Day, `checkIns: { total, outsideRegisteredDay }`: all Check-Ins recorded for that Event Day, and how many of them were outside the Attendee's registered days (the flag stored on each Check-In)
  - It may be renamed to reflect its wider job. Its callers and tests follow.
- **A new read for the chart** returns one entry per Bangkok calendar day, as `{ date, registrations }` with `date` an ISO date.
  - It runs from the Bangkok day of the earliest Registration up to today (per the clock), inclusive.
  - Days with none are zero.
  - It is empty when there are no Registrations.
  - Days use the shared Bangkok date helper from v1 ticket 22.
- **The not-yet-emailed number** is the existing bulk-send summary in `unsent` mode, which already reports whether email sending is configured.
- **No schema change.** Deleting a Registration already deletes its Check-Ins, so they drop out of the counts.

### Registration list

- **Logic unchanged.** It stays TanStack Table v9 in manual, server-driven mode: TanStack Query, view state in the URL, debounced search, the dimmed `aria-busy` loading state and the retry on error.
- **Toolbar,** wrapping on narrow screens: search · Event Day (native select) · Attendee Role (native select) · ล้างตัวกรอง · "คอลัมน์" · CSV export at the end.
- **"คอลัมน์":**
  - a dropdown of checkbox items, one per column header, to hide or show columns
  - the detail link column can't be hidden
  - visibility is not persisted or put in the URL, and CSV export always includes everything
- **Pagination:**
  - "แถวต่อหน้า" (native select)
  - "หน้า X จาก Y"
  - lucide icon buttons labelled หน้าแรก, ก่อนหน้า, ถัดไป and หน้าสุดท้าย, disabled at the ends
- **Not added:** row checkboxes, a per-row ⋮ menu, drag handles, tabs or a row drawer. The ten columns and their cells (including the Event Pass email cell and the detail link) are kept.

### Toasts

- **Toaster:** shadcn `sonner`, mounted once in the signed-in Back Office layout. It is not in `/kiosk` or the public pages.
- **Behaviour:**
  - light theme, bottom-right
  - success toasts close after about 4 seconds
  - error toasts stay until closed, with a close button
  - announced politely to screen readers
- **Copy:** reuses the current Thai inline messages.
- **Used for:**
  - **Single resend** of an Event Pass email, from the list's email cell or the detail page: success or failure. The email cell keeps showing the email status data, refreshed as now.
  - **Bulk send:** progress stays on the page while it runs, and a toast summarises the result when it finishes or stops.
  - **Delete:** after the redirect to `/admin`, one toast "ลบการลงทะเบียน EP-… แล้ว".
    - The `deleted` query parameter is removed from the URL once shown, so reload and Back don't repeat it.
    - The inline deleted notice is removed.
- **Never used for:** Check-In results (desk and Kiosk keep their large result panel), form validation errors, or the list's load errors.

### Theme

- **Tokens:** the `.back-office` scope gains the shadcn sidebar tokens and chart tokens, from the neutral palette, checked for AA contrast like the existing tokens. Public pages are unaffected.
- **Animations:** `tw-animate-css` is imported for Sheet and Dropdown animations.
- **Light only:** no dark mode toggle, no brand colours in the Back Office.

### Next.js constraints

- **Cache Components:** request-time data (session, database reads, current time) stays under `<Suspense>`. The shell layout reads nothing at request time. No `runtime` export.
- **Client components:** sidebar navigation (active state from the pathname), the mobile hook, the chart, the column menu and the Toaster.

## Testing Decisions

- **What a good test is here:** it drives the Registration module through its public interface against a real database, with the clock injected. It asserts what Staff would see: counts and series, not SQL or internals. It never fakes the database. It fakes only the documented boundaries: email sender, bot-check verifier and clock.
- **Seams:** the existing ones only, with no new seams.
  - **Registration module** (real database per test file, `reset()` in `beforeEach`):
    - **`registeredToday`** counts only Registrations created on the clock's Bangkok day. A Registration at 23:59 Bangkok yesterday doesn't count; one at 00:00 Bangkok today does. Tests set `created_at` directly, since the database stamps it.
    - **Per-Event-Day Check-In counts:**
      - total and outside-registered-day counts are separated by Event Day
      - a Check-In outside the registered day counts in both numbers
      - deleting a Registration removes its Check-Ins from the counts
    - **Existing head counts** are unchanged, including a two-day Registration counting on each day and once in the distinct total.
    - **Daily series:**
      - empty with no Registrations
      - zero-filled gaps
      - starts on the Bangkok day of the earliest Registration and ends on the clock's Bangkok day
      - a two-day Registration counts once, on the day it was created
      - the Bangkok day boundary is respected
  - **Pure modules:** the shared Bangkok date helper (from v1 ticket 22) if it gains a function for day ranges.
- **Prior art:** the existing tests of head counts, Check-In, bulk send summary and search in the Registration module, which use the test database helper and an injected clock.
- **UI:** no automated UI tests, per the project's agreed seams. Each ticket's hand-off records a browser check against `next start`:
  - widths 1280, 768 and 375 with no horizontal page scroll
  - sidebar collapse by button and Ctrl/⌘+B
  - the mobile sheet
  - keyboard focus through the sidebar, the account menu and the column menu
  - the Kiosk mode overlay covering everything, including a toast
  - a Kiosk Account still sent to `/kiosk`
  - `/dashboard` returning 404
  - each toast case
  - the overview numbers against the database
- **Gate:** `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass before every commit.

## Out of Scope

- **Untouched surfaces:** `/kiosk`, the content of Kiosk mode, `/admin/login` and every public page.
- **Theme:** dark mode, brand colours in the Back Office.
- **Persistence:** remembering the sidebar state or column visibility across reloads.
- **Live data:** polling or live updates of the overview.
- **Table features:** row selection, bulk actions on selected rows, a per-row actions menu, drag-to-reorder, tabs, a row drawer.
- **Charts:** range toggles; charts of Check-Ins (for example per hour on an Event Day).
- **URLs:** splitting the overview and the Registration list into separate pages or changing any URL.
- **Permissions:** new permission levels ("Admin") or Account management in the Back Office.
- **Refactoring:** anything beyond v1 ticket 22.

## Further Notes

- **Glossary:** `GLOSSARY.md` is unchanged. It already lists "dashboard" and "admin panel" as terms to avoid for the Back Office.
- **Tickets:** written in `.scratch/back-office-redesign/issues/`. Dismissing toasts on entering Kiosk mode belongs to 05, where toasts first appear.
  - 01 app shell
  - 02 overview cards and role table
  - 03 daily Registrations chart
  - 04 Registration list restyle
  - 05 toasts

  01 is blocked by v1 ticket 22. 02–05 are blocked by 01 and can run in parallel, three or four agents at a time.
- **After deploy:** add to the real-device checks: the check-in desk on a phone inside the new shell, and Kiosk mode at the desk on an iPad.
