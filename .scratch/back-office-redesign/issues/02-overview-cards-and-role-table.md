# 02: Overview cards and Registrations by Attendee Role

**What to build:** On the Back Office home, above the Registration list, Staff see four summary cards and a table of Registrations per Event Day by Attendee Role. This ticket replaces the current counts panel and owns the overview grid. Ticket 03's chart sits beside the role table, in a slot this ticket leaves for it. See the spec ("Overview on the Back Office home", "Registration module").

The cards:
- **ลงทะเบียนทั้งหมด:** all Registrations, with "+N วันนี้".
- **One card per Event Day:** Registrations that chose that day, with "เช็คอินแล้ว X (ไม่ได้ลงทะเบียนวันนี้ Y)".
- **ยังไม่ได้ส่งอีเมล Event Pass:** with a link to the email page, and "ระบบอีเมลยังไม่ได้ตั้งค่า" when email sending isn't configured.

**Blocked by:** 01 (Back Office app shell)

**Status:** resolved

- [x] **Registration module:** the existing head-count read also returns:
  - `registeredToday`: Registrations created on the injected clock's Bangkok calendar day
  - per Event Day, `checkIns: { total, outsideRegisteredDay }`: all Check-Ins recorded for that Event Day, and how many of them were outside the Attendee's registered days

  The read may be renamed to reflect its wider job, and its callers and tests follow.
- [x] **Registration module tests,** against a real database with the clock injected:
  - **The Bangkok midnight boundary for `registeredToday`:** 23:59 Bangkok yesterday doesn't count, 00:00 Bangkok today does. Tests set `created_at` directly.
  - **Check-In counts per Event Day,** with an outside-registered-day Check-In counting in both numbers.
  - **A deleted Registration's Check-Ins** drop out.
  - **Existing head-count behaviour** is unchanged: a two-day Registration counts on each day and once in the distinct total.
- [x] **Card 1: ลงทะเบียนทั้งหมด** shows the distinct total with "คน" and a badge "+N วันนี้". There is no percentage trend.
- [x] **Cards 2–3,** one per Event Day in Event order:
  - titled with the Event Day's label
  - the number of Registrations that chose it
  - a footer "เช็คอินแล้ว X", followed by " (ไม่ได้ลงทะเบียนวันนี้ Y)" only when Y > 0
- [x] **Card 4: ยังไม่ได้ส่งอีเมล Event Pass** shows the bulk-send summary's `unsent` count and links to the email page. It adds "ระบบอีเมลยังไม่ได้ตั้งค่า" when email sending isn't configured.
- [x] **Role table card:**
  - Attendee Roles as rows ("อื่น ๆ" for Other) and Event Days as columns
  - the note "ผู้ที่เลือกทั้ง 2 วันนับในแต่ละวัน"
  - side by side with the chart slot on wide screens, stacked on narrow ones
- [x] The current counts panel is removed.
- [x] **Rendering:**
  - Cards and the role table are Server Components that check the session, behind Suspense boundaries with skeleton fallbacks.
  - Numbers are formatted th-TH.
  - The page and its URLs are unchanged.
- [x] typecheck, lint, test and build pass. The hand-off records the card numbers checked against the database, at 1280, 768 and 375 px.

## Answer

Done on branch `worktree-agent-ab20d6790dea8fb3b`.

### What's where

| What | Where |
| --- | --- |
| The head-count read, renamed from `countByEventDayAndRole` to `headCounts()` (the spec's "head-count read"). It now takes the clock, and returns `HeadCounts`, formerly `RegistrationCounts`: `{ eventDays, registrations, registeredToday }`. Each Event Day gains `checkIns: { total, outsideRegisteredDay }`. | `src/lib/registrations/counts.ts`; one line in `registrations.ts` (`headCounts: () => headCounts(deps)`) |
| Tests: the four existing head-count tests (now with the full shape), the Bangkok day boundary, Check-Ins per Event Day, and a deleted Registration's Check-Ins | `counts.test.ts`; `detail.test.ts` follows the rename |
| The overview section: `<section aria-labelledby="overview-heading">` with an sr-only h2 "ภาพรวม", the four-card grid, then the role/chart grid with **the slot for ticket 03** (a comment marks it) | `src/app/admin/(back-office)/_overview/overview-section.tsx` |
| The cards (`HeadCountCards` = card 1 plus one per Event Day, `UnsentEmailCard`) and their skeletons; a shared `SummaryCard` (dashboard-01's section card: h3 title in `CardDescription`, number in `CardTitle`, optional `CardAction` badge, footer) | `_overview/summary-cards.tsx` |
| The role table card (title, note, and the table inside its own boundary) | `_overview/role-table-card.tsx` |
| `readHeadCounts`: React `cache()` around `registrations().headCounts()`, so the cards and the role table share one read per request | `_overview/head-counts.ts` |
| Home page: `<OverviewSection />` in place of `<CountsPanel />` (`counts-panel.tsx` is deleted) | `(back-office)/page.tsx` |

### Decisions

- **`registeredToday` is a half-open Bangkok day:** from 00:00 Bangkok on the clock's day to 00:00 the next day. With the real clock, nothing can be later. The upper bound only keeps an injected clock honest in tests.
- **Check-Ins come from `check_ins` grouped by `event_day`**, with `count(*) filter (where outside_registered_day)`. A deleted Registration's Check-Ins go by the existing cascade, so no new code was needed for that.
- **Boundaries:**
  - cards 1–3 share one boundary (one read)
  - card 4 has its own (`bulkSendSummary("unsent")`)
  - the role table has its own, inside its card. The card, its title and note are in the static shell.
  - Each component calls `requireStaff()` itself.
  - Skeletons keep the titles and match the loaded heights. The one exception is card 4's "ระบบอีเมลยังไม่ได้ตั้งค่า" line (+27px), which appears only when email isn't configured.
- **Layout by container queries** on `@container/overview`, not by the window, so it follows the sidebar:
  - **Cards:** dashboard-01's breakpoints, `@xl` two columns and `@5xl` four. That means 2 × 2 at 1280 with the sidebar open, four across with it collapsed, and one column at 768 (the inset is about 440px) and at 375.
  - **Role/chart grid:** two columns from `@3xl` (48rem).
- **Copy beyond the ticket:**
  - **Card 1:** a muted footer "ผู้ที่เลือกทั้ง 2 วันนับครั้งเดียว", so the total isn't mistaken for the sum of the day cards. The badge has a lucide `UserPlus` icon.
  - **Card 4:** the link is an outline button "ไปหน้าส่งอีเมล →".
  - **Role table:** a "รวม" footer row, which equals the day cards.
- **The role table spans the full row while it is the grid's only child** (`only:col-span-full`). The overview therefore looks finished if 03 lands later. Once the chart card sits beside it, it takes one column by itself.
- **Accessibility:**
  - Each card title is an h3 under the sr-only h2.
  - The table is labelled by its card title (`aria-labelledby`) and described by the note.
  - It uses `th scope="col"` for Event Days and `th scope="row"` for Attendee Roles.

### Gotchas (for 03–05)

- **Ticket 03: render the chart card as the second child of the role/chart grid** in `overview-section.tsx`, in its own `<Suspense>`. Everything else about the slot is in the comment there. A `<Card>` as the grid child gets the right height automatically. Container queries are on `@container/overview` if the chart needs them.
- **Ticket 05: `router.refresh()` after a resend or bulk send is enough to update the cards.** They are Server Components with no cache, and `readHeadCounts` is per request.
- **Ticket 04: the Registration list toolbar is broken at 768 today, before this ticket, and the cause is already on `main`.** Its row layout switches on the `md` *viewport* breakpoint, but since ticket 01 the sidebar leaves only about 440px of content at 768. So the search field shrinks to a sliver and overlaps the Attendee Role select. There is no horizontal scroll, so ticket 01's check didn't catch it. 04 rebuilds that toolbar; container queries, or wrapping, would fix it.
- **Don't put a `<Suspense>` inside a `<table>`.** The role table puts the whole table inside the boundary, with a same-shaped skeleton table, instead of streaming rows into a static `<thead>`.

### Verified

- **Gate:** typecheck, lint, the 203 tests and build pass, and `/admin` stays `◐`.
- **Seed:** `next start` on a throwaway database (dropped afterwards), seeded with psql:
  - 1,240 Registrations: 3 at 23:59:59 Bangkok yesterday, 7 from 00:00 Bangkok today, 124 never emailed
  - role counts skewed so that swapped rows or columns would show
  - Check-Ins: 57 on 31 Oct (3 outside the registered day) and 12 on 1 Nov (none outside)
- **Expected numbers,** computed independently in psql (Bangkok dates by `at time zone`), against what the page showed. Headless Chrome over CDP, signed in as a throwaway Staff Account. 33 of 33 checks pass, on the final build as well:
  - **Card 1:** "1,240 คน", badge "+7 วันนี้", no percentage.
  - **31 Oct:** "826 คน", "เช็คอินแล้ว 57 (ไม่ได้ลงทะเบียนวันนี้ 3)".
  - **1 Nov:** "827 คน", exactly "เช็คอินแล้ว 12" (no parenthetical when Y = 0).
  - **Card 4:** "124 คน", "ระบบอีเมลยังไม่ได้ตั้งค่า" (no SMTP env), and its link opens `/admin/email`.
  - **Role table:**
    - rows ผู้ปกครอง 213/213, คุณครู / อาจารย์ 134/129, นักเรียน / นักศึกษา 148/155, สปอนเซอร์ / ผู้สนับสนุน 166/165, อื่น ๆ 165/165, รวม 826/827
    - the heading and the note "ผู้ที่เลือกทั้ง 2 วันนับในแต่ละวัน"
  - **Page:**
    - The old counts panel is gone.
    - There is one visible h1 (ผู้ลงทะเบียน), the sr-only h2 ภาพรวม, and the list still follows.
  - **1280:**
    - cards 2 × 2
    - the role table spans the row (936/936px)
    - the overview is 24px under the header
    - no horizontal scroll
    - Ctrl+B collapses the sidebar, and the cards go four across
  - **768:** one column of cards, the table fits its card, no horizontal scroll.
  - **375:** one column of cards, the table fits its card (day headings wrap onto three lines), the overview is 16px under the header, no horizontal scroll.
  - **Static shell** (curl with a session): all five titles and the skeletons, and no numbers. Rendered alone, the skeleton cards 1–3 have the same tops and heights as the loaded ones.
- **Screenshots looked at:**
  - 1280 viewport and full page
  - 1280 collapsed
  - 768 full page and the list toolbar
  - 375 full page
  - the skeleton shell at 1280
