# 03: Daily Registrations chart

**What to build:** On the Back Office home, beside the role table, Staff see an area chart of new Registrations per day (Bangkok time), from the day of the first Registration to today. Days with none show as zero, and hovering or tapping a point shows the date and "N คน". See the spec ("Overview on the Back Office home", "Registration module").

**Blocked by:** 01 (Back Office app shell). It fills the chart slot that 02 leaves in the overview grid. If 02 isn't merged yet, place the chart where the spec puts it and let the second merge line them up.

**Status:** resolved

- [x] **Registration module:** a new read returns `{ date, registrations }[]`.
  - One entry per Bangkok calendar day, with `date` an ISO date, from the Bangkok day of the earliest Registration to the injected clock's Bangkok day, inclusive.
  - Days with none are zero.
  - It is empty when there are no Registrations.
  - It uses the shared Bangkok date helper from v1 ticket 22.
- [x] **Registration module tests,** against a real database with the clock injected:
  - the result is empty with no Registrations
  - gaps are zero-filled
  - the start and end days are right
  - a two-day Registration counts once, on the day it was created
  - the Bangkok day boundary is respected
  - Tests set `created_at` directly.
- [x] **Chart card:**
  - the shadcn `chart` component (recharts), one series in the Back Office chart colour
  - no range toggle
  - Thai short dates on the axis
  - a tooltip with the date and "N คน"
- [x] **Accessibility:** a screen-reader text alternative gives the same day-by-day numbers.
- [x] **No Registrations yet:** the card says so instead of drawing an empty chart.
- [x] **Rendering:**
  - The data is read in a Server Component that checks the session, behind a Suspense boundary with a skeleton fallback.
  - Only the chart itself is a client component.
- [x] typecheck, lint, test and build pass. The hand-off records the chart checked against the database, the tooltip, and the layout at 1280, 768 and 375 px.

## Answer

Done on branch `worktree-agent-afa9292543b33ea4f`.

### What's where

| What | Where |
| --- | --- |
| The read: `newRegistrationsPerDay(deps)` returns `DailyRegistrations` (`{ date, registrations }[]`). One SQL `group by` on `created_at at time zone event.timeZone` gives the days that have Registrations. A walk from the first of those days to today fills the gaps with zeros; the walk uses `bangkokDate` and `bangkokInstant` from `src/lib/bangkok-time.ts`. | `src/lib/registrations/daily-registrations.ts` |
| Exposed as `registrations.newRegistrationsPerDay()` (one import line and one method at the end of the returned object) | `src/lib/registrations/registrations.ts` |
| Tests (7), against a real database with the clock injected. Each test sets `created_at` directly after `submit`. | `src/lib/registrations/daily-registrations.test.ts` |
| `DailyRegistrationsCard({ className })`, a Server Component. The Card's title (h2 ผู้ลงทะเบียนใหม่รายวัน) and description are part of the static shell. Behind `<Suspense>` with a skeleton of the same height, `requireStaff()` reads the series. The card then shows the empty state, or the chart plus a screen-reader table. | `src/app/admin/(back-office)/_daily-registrations/daily-registrations-card.tsx` |
| `DailyRegistrationsChart`, the only client component: an area chart with one series (`--chart-2`), a gradient fill, Thai short dates on the axis, and a tooltip with the date and "N คน" | `_daily-registrations/daily-registrations-chart.tsx` |
| Thai formatters for the axis ("23 ต.ค."), the tooltip ("ศ. 23 ต.ค. 2569") and the table ("วันศุกร์ที่ 23 ตุลาคม 2569"), plus `formatCount`. All are in Bangkok time via `bangkokInstant`. | `_daily-registrations/format.ts` |
| Placement for now: `<DailyRegistrationsCard className="mt-8" />` right after `<CountsPanel />`, a two-line page diff. Moving it into ticket 02's slot means dropping the `mt-8`. | `src/app/admin/(back-office)/page.tsx` |

### Decisions

- **The series never drops a Registration.** It runs to today per the clock, or to the last day with Registrations if that is later. The database stamps `created_at` with its own `now()`, which can pass midnight a moment before the app's clock. Without this, a Registration in that gap would vanish from the chart (or the chart would be empty) until the next reload. It has its own test.
- **The chart's colour is `--chart-2`** (#737373, 4.7:1 on the card). It is the first chart token that meets WCAG's 3:1 non-text contrast; `--chart-1` (#d4d4d4) is 1.5:1. dashboard-01 uses `--primary`. The spec keeps the Back Office neutral, so the series is gray. That is fine for a single series, since only the title has to identify it.
- **Curve:** `monotone`, not dashboard-01's `natural`. A natural spline through zero days dips below zero. The gradient runs from 35% to 5% opacity rather than the block's 100% to 10%, so the area reads as a wash, not a dark block.
- **Y axis:** shown, with whole numbers only. dashboard-01 has none, but exact counts are the point here.
- **One day only:** that day is marked with a dot, since an area needs two points to draw a line.
- **Accessibility:**
  - The `<svg>` is `role="img"` with a Thai label that says the numbers are in the table that follows. Recharts would otherwise give it `role="application"`.
  - The table is visually hidden and has a caption, column headers and one row header per day, with dates written out in full.
  - Recharts' keyboard layer stays on: Tab focuses the chart (with a ring in `--ring`), and the arrow keys move the tooltip from day to day, so sighted keyboard users can read exact numbers too.
  - The draw-in animation is recharts' default `'auto'`, which turns itself off under `prefers-reduced-motion`.
- **Empty state:** a dashed box the same height as the chart, with lucide `ChartAreaIcon`, "ยังไม่มีผู้ลงทะเบียน" and "กราฟจะแสดงเมื่อมีผู้ลงทะเบียนคนแรก".
- **The tooltip copy** is "ลงทะเบียนใหม่ N คน". The date is the tooltip's heading.

### Gotchas

- **`chart.tsx` themed no tick labels.** Recharts 3.8 renders tick labels in a separate z-index layer (`.recharts-cartesian-axis-tick-labels > … > text.recharts-cartesian-axis-tick-value`). The block's `[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground` therefore matched nothing, and the labels fell back to recharts' `#666`. It now targets `.recharts-cartesian-axis-tick-value`. The grid and cursor selectors still match.
- **`sr-only` doesn't shrink a `<table>`.** Tables ignore width and height, so the class sits on a wrapping `div`.
- **Node and Chrome abbreviate Thai weekdays differently.** Node's ICU gives "ศ." and Chrome's gives "ศุกร์". The tooltip renders only in the browser, so there is no hydration mismatch. The axis and the table use no abbreviated weekday.
- **For browser checks:** `Page.captureScreenshot` with `captureBeyondViewport` resizes the viewport. That re-renders the chart and restarts its 1.5 s draw-in, so screenshot the card after scrolling it into view. Also wait for the area's animation `clipPath` rect to reach the plot's width before taking full-page shots.

### Noticed, not changed

- At 768 px with the sidebar open, the Registration list's toolbar overlaps: the "ค้นหา" label and search field sit under the Attendee Role filter. This is the existing list, and ticket 04 restyles that toolbar.

### Verified

- **Gate:** typecheck, lint, the 207 tests (200 before plus 7 new) and build pass. `/admin` stays `◐`.
- **Tests:**
  - The seven tests cover:
    - empty with no Registrations
    - today's Registrations
    - start and end days
    - zero-filled gaps
    - a two-day Registration counting once
    - the Bangkok day boundary for both `created_at` (16:59:59Z and 17:00Z) and the clock
    - a stamp later than the clock's day
  - A mutation run confirmed each can fail. Bucketing in UTC, taking today in UTC, ending strictly at today, skipping zero days and counting per Event Day were each caught by at least one test.
- **Headless Chrome over CDP against `next start`,** with a throwaway Staff Account and its own database (dropped). 34 of 34 checks pass:
  - **Empty database:** the card says ยังไม่มีผู้ลงทะเบียน, draws no chart and has no table. It sits after the counts panel.
  - **Seeded:** 16 Registrations over 15–23 Oct, with:
    - a gap on 16–17 Oct
    - one at 23:59:30 and one at 00:00:10 either side of Bangkok midnight (20/21 Oct)
    - a two-day Registration
    - nothing on 22 Oct
  - **Against psql** (an independent `generate_series` query that zero-fills the days: `15=2 16=0 17=0 18=5 19=1 20=1 21=3 22=0 23=4`):
    - the screen-reader table has the same 9 rows and numbers
    - hovering each day shows its date and "N คน"
    - the active dot's height, read back against the y-axis ticks, equals each day's count, zero days included
  - **Axis and colours:** the axis shows Thai short dates with whole-number y ticks, and the tick labels use the muted-foreground token.
  - **Screen readers:** the `svg` is `role="img"` with its label, and the table is visually hidden (a 1px clipped wrapper).
  - **Keyboard:** focus shows a 2px ring, and ArrowRight steps the tooltip from day to day.
  - **Layout at 1280, 768 and 375:** no horizontal page scroll, the card and chart sit inside the viewport, and the x-axis labels don't overlap. At 375 a tap on the last day shows its tooltip.
  - **Motion:** the area draws in when motion is allowed, and the whole curve shows at once under `prefers-reduced-motion`.
  - **Streaming:** the streamed HTML carries the skeleton ("กำลังโหลดกราฟผู้ลงทะเบียนใหม่รายวัน…") before the chart's content.
  - **Console:** no errors or warnings.
  - **A one-day series** (only today's Registrations) shows one dot above its date.
- **Screenshots looked at:**
  - the empty card
  - the home page at 1280, 768 and 375
  - the tooltip on today and on a zero day
  - keyboard focus with the tooltip
  - the tap at 375
  - reduced motion
  - the one-day series
