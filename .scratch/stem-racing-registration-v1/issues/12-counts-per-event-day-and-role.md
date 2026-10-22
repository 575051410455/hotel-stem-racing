# 12: Counts per Event Day by Attendee Role

**What to build:** Staff see head counts for each Event Day broken down by Attendee Role, plus totals, so the organisers can plan each day's crowd.

**Blocked by:** 02, 04

**Status:** resolved

- [x] A Staff-only panel in the Back Office shows counts per Event Day × Attendee Role and per-day totals. A Registration for both days counts on each day.
- [x] Integration tests cover counts with mixed roles and multi-day Registrations, and counts after a Registration is removed

## Answer

Done in commit "feat(back-office): counts per Event Day and Attendee Role …". Notes for downstream tickets.

### Names
- **Registration module:** `registrations.countByEventDayAndRole()` → `RegistrationCounts`. The logic and types live in `src/lib/registrations/counts.ts`; `registrations.ts` only gains an import and a one-line method.
  ```ts
  type RegistrationCounts = {
    eventDays: { eventDay: string; byRole: Record<AttendeeRole, number>; total: number }[];
    registrations: number; // distinct Registrations
  };
  ```
  - There is one entry per configured Event Day (`event.eventDays`), in Event order. Every Attendee Role is present, zeros included.
  - A Registration for both days counts on each day. `registrations` counts it once, so the day totals can add up to more than it.
  - SQL: `cross join lateral unnest(event_days)`, grouped by day and role, plus `db.$count(registrations)`. The two queries run in parallel and aren't one snapshot; for a head-count panel that's fine.
  - Days that aren't configured are ignored. Field validation never stores them anyway.
- **UI:** `CountsPanel` in `src/app/admin/(back-office)/counts-panel.tsx`, rendered on `/admin` below the heading.
  - It owns its `<Suspense>`. The `<h2>` จำนวนผู้ลงทะเบียน is in the static shell. The fallback is a Thai "loading" line plus placeholder cards with the day labels, so nothing jumps.
  - Inside the boundary it calls `requireStaff()` first, then the counts, so the data stays Staff-only and the build needs no env.
  - There is one shadcn Card per Event Day: the day label, the day total and a `<dl>` row per Attendee Role. The cards sit side by side from `sm`, stacked below.

### Per ticket
- **11** (rewrites `/admin/page.tsx`): keep the import and `<CountsPanel />` above the Registration list. It is self-contained (own boundary and Staff check), so it can sit anywhere in `<main>`.
- **14:** the "counts drop when a Registration is removed" test in `counts.test.ts` deletes the row directly with Drizzle, because there is no delete yet. Swap that line for the new delete function.
- **17:** the "how many emails per Event Day" summary can reuse the same `unnest(event_days)` grouping.

### Conservative choices
- Role labels come from `attendeeRoleLabels`, except that "Other" shows as อื่น ๆ rather than the form's อื่น ๆ โปรดระบุ ("please specify").
- Counts are read fresh on every request (no `use cache`), so a new or removed Registration shows on the next load. There is no client-side fetching or polling.
- Numbers use `Intl.NumberFormat("th-TH")` (Arabic digits, grouped).
- Tests seed through `submit` with a fixed clock (2026-10-22, Bangkok), so ticket 07's closing rules don't break them after the Event. Each Attendee gets a fresh phone, so none is a Duplicate Registration.

### Verification
- TDD, one test at a time, in `src/lib/registrations/counts.test.ts`:
  - zeros everywhere with no Registrations (red: missing method)
  - mixed roles across both days (red against the zero stub)
  - a two-day Registration counted on each day and once overall (red while the total summed the days)
  - counts drop after removal (green on first run: a guard against caching)
- `npm run typecheck`, `npm run lint`, `npm test` (95 tests, on main after tickets 06, 07, 09 and 10) and `npm run build` pass, the build also with `.env` moved aside. `/admin` stays partially prerendered.
- Smoke test with `next start -p 3112` against `stem_racing_t12` (since dropped), seeded with 23 Registrations and then 3 removed:
  - Signed in, the panel matched SQL exactly: 20 in total; 31 Oct 14 (3/1/6/2/2); 1 Nov 12 (3/0/6/2/1).
  - The skeleton text is in the static shell.
  - Signed out gets a 307 to `/admin/login`. A forged cookie gets a redirect and no counts.
  - No console errors, and no horizontal scroll at 320px (measured in a 320px iframe) or at 500px and desktop.
