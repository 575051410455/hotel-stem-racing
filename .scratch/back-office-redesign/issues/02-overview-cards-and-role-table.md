# 02: Overview cards and Registrations by Attendee Role

**What to build:** On the Back Office home, above the Registration list, Staff see four summary cards and a table of Registrations per Event Day by Attendee Role. This ticket replaces the current counts panel and owns the overview grid. Ticket 03's chart sits beside the role table, in a slot this ticket leaves for it. See the spec ("Overview on the Back Office home", "Registration module").

The cards:
- **ลงทะเบียนทั้งหมด:** all Registrations, with "+N วันนี้".
- **One card per Event Day:** Registrations that chose that day, with "เช็คอินแล้ว X (ไม่ได้ลงทะเบียนวันนี้ Y)".
- **ยังไม่ได้ส่งอีเมล Event Pass:** with a link to the email page, and "ระบบอีเมลยังไม่ได้ตั้งค่า" when email sending isn't configured.

**Blocked by:** 01 (Back Office app shell)

**Status:** ready-for-agent

- [ ] **Registration module:** the existing head-count read also returns:
  - `registeredToday`: Registrations created on the injected clock's Bangkok calendar day
  - per Event Day, `checkIns: { total, outsideRegisteredDay }`: all Check-Ins recorded for that Event Day, and how many of them were outside the Attendee's registered days

  The read may be renamed to reflect its wider job, and its callers and tests follow.
- [ ] **Registration module tests,** against a real database with the clock injected:
  - **The Bangkok midnight boundary for `registeredToday`:** 23:59 Bangkok yesterday doesn't count, 00:00 Bangkok today does. Tests set `created_at` directly.
  - **Check-In counts per Event Day,** with an outside-registered-day Check-In counting in both numbers.
  - **A deleted Registration's Check-Ins** drop out.
  - **Existing head-count behaviour** is unchanged: a two-day Registration counts on each day and once in the distinct total.
- [ ] **Card 1: ลงทะเบียนทั้งหมด** shows the distinct total with "คน" and a badge "+N วันนี้". There is no percentage trend.
- [ ] **Cards 2–3,** one per Event Day in Event order:
  - titled with the Event Day's label
  - the number of Registrations that chose it
  - a footer "เช็คอินแล้ว X", followed by " (ไม่ได้ลงทะเบียนวันนี้ Y)" only when Y > 0
- [ ] **Card 4: ยังไม่ได้ส่งอีเมล Event Pass** shows the bulk-send summary's `unsent` count and links to the email page. It adds "ระบบอีเมลยังไม่ได้ตั้งค่า" when email sending isn't configured.
- [ ] **Role table card:**
  - Attendee Roles as rows ("อื่น ๆ" for Other) and Event Days as columns
  - the note "ผู้ที่เลือกทั้ง 2 วันนับในแต่ละวัน"
  - side by side with the chart slot on wide screens, stacked on narrow ones
- [ ] The current counts panel is removed.
- [ ] **Rendering:**
  - Cards and the role table are Server Components that check the session, behind Suspense boundaries with skeleton fallbacks.
  - Numbers are formatted th-TH.
  - The page and its URLs are unchanged.
- [ ] typecheck, lint, test and build pass. The hand-off records the card numbers checked against the database, at 1280, 768 and 375 px.
