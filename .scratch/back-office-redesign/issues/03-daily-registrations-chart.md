# 03: Daily Registrations chart

**What to build:** On the Back Office home, beside the role table, Staff see an area chart of new Registrations per day (Bangkok time), from the day of the first Registration to today. Days with none show as zero, and hovering or tapping a point shows the date and "N คน". See the spec ("Overview on the Back Office home", "Registration module").

**Blocked by:** 01 (Back Office app shell). It fills the chart slot that 02 leaves in the overview grid. If 02 isn't merged yet, place the chart where the spec puts it and let the second merge line them up.

**Status:** ready-for-agent

- [ ] **Registration module:** a new read returns `{ date, registrations }[]`.
  - One entry per Bangkok calendar day, with `date` an ISO date, from the Bangkok day of the earliest Registration to the injected clock's Bangkok day, inclusive.
  - Days with none are zero.
  - It is empty when there are no Registrations.
  - It uses the shared Bangkok date helper from v1 ticket 22.
- [ ] **Registration module tests,** against a real database with the clock injected:
  - the result is empty with no Registrations
  - gaps are zero-filled
  - the start and end days are right
  - a two-day Registration counts once, on the day it was created
  - the Bangkok day boundary is respected
  - Tests set `created_at` directly.
- [ ] **Chart card:**
  - the shadcn `chart` component (recharts), one series in the Back Office chart colour
  - no range toggle
  - Thai short dates on the axis
  - a tooltip with the date and "N คน"
- [ ] **Accessibility:** a screen-reader text alternative gives the same day-by-day numbers.
- [ ] **No Registrations yet:** the card says so instead of drawing an empty chart.
- [ ] **Rendering:**
  - The data is read in a Server Component that checks the session, behind a Suspense boundary with a skeleton fallback.
  - Only the chart itself is a client component.
- [ ] typecheck, lint, test and build pass. The hand-off records the chart checked against the database, the tooltip, and the layout at 1280, 768 and 375 px.
