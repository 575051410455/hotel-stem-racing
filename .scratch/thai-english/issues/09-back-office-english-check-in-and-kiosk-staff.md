# 09: English Back Office: check-in desk, camera and the Kiosk's Staff parts

**What to build:** Staff check people in through an English desk, while everything Attendees see stays Thai with English.
- The desk: day choice, Pass Code entry, hints, results and Kiosk mode's introduction, in English.
- Check-In result headings stay shared by the desk and the Kiosk: the desk shows English headings worded for Staff ("Checked in") with English details; the Kiosk keeps its Thai heading and English note.
- Camera messages: English at the desk, Thai then English on the Kiosk.
- The Kiosk: its corner button reads "เจ้าหน้าที่ · Staff"; the Staff panel behind it is English; the Attendee-facing screens and the "Staff must sign in again" screen are unchanged.

On the integration branch `back-office-english`.

See the spec ("English Back Office": check-in headings, camera, the Kiosk) and `copy-back-office.md` ("Check-in desk", "Camera", "Kiosk: Staff-only parts").

**Blocked by:** 01

**Status:** resolved

- [x] Every string in the listed areas matches `copy-back-office.md`; the Kiosk's Attendee-facing screens are unchanged.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`: each Check-In result at the desk, Kiosk mode at the desk, the Kiosk page's corner button and Staff panel, and a camera error on each.

## Answer

Done on branch `thai-english-09`.

### What's where

| What | Where |
| --- | --- |
| Shared Check-In headings: `checkInHeading` returns `staff` (the desk's English, worded for Staff) next to the Kiosk's `thai` and `english`; the desk panel's details in English (English Attendee Roles, long English Event Day labels, Bangkok 24-hour times) | `src/app/admin/(back-office)/check-in/check-in-result.tsx` |
| The desk: day choice, hints, Pass Code entry, the result placeholder and Kiosk mode's introduction; `method="dialog"` kept | `check-in-desk.tsx`; title and loading line in `page.tsx` |
| Camera messages as `Message = Record<Language, string>`; `Words` shows the English at the desk, the Thai then the English (`lang="en"`) on a Kiosk; the desk's controls in English | `camera-scanner.tsx` |
| The Kiosk: root marked `lang="th"`; corner button "เจ้าหน้าที่ · Staff" ("Staff" marked `lang="en"`); the Staff panel in English, marked `lang="en"`. `KioskCheckInDay` now carries the date, not a Thai label | `kiosk-screen.tsx`, `src/app/kiosk/kiosk-station.tsx` |

`src/lib/check-in/` is unchanged (no wording there), so its tests are too.

### Decisions

- **The Kiosk marks its own language.** Its root `div` is `lang="th"` and its Staff panel `lang="en"`. Under `/kiosk` the `th` repeats `<html lang="th">`. In Kiosk mode at the desk it is what keeps the Thai read as Thai once ticket 06 makes the Back Office root `en`. The Kiosk's camera lines in English are now marked `lang="en"` too; "Starting the camera…" and the stray-QR line weren't marked before.
- **The camera's Kiosk English follows the deck.** "Starting the camera…" becomes "Opening the camera…", and "This QR isn’t an Event Pass" takes the deck's straight apostrophe. The desk and the Kiosk share one English camera wording. The rest of the Kiosk keeps its text exactly, curly apostrophes included.
- **Every camera message has Thai and English,** including the switch and turn-off errors that only the desk can show (today's Thai, never displayed). One message type then serves both places.
- **English camera problems end with a full stop** ("No camera found on this device.", "The browser can open the camera only on an https page."), so "… Back to the {camera}." can follow them. In "… and couldn't reopen the {camera}." the problem's full stop is dropped and the sentence carries on.
- **"(not registered for this day)" goes before the final full stop:** "Not recorded again. Check that this is the Event Pass holder (not registered for this day)."
- **Event Days at the desk use the long English label** ("Saturday 31 October 2026"), following the deck's Formats table. This covers the day choice, "Check-In for …", "Registered for: … and …", the chosen-day line and the Staff panel.
- **What stays Thai on the Kiosk:** the header's "· จุดเช็คอินด้วยตนเอง"; the orange "บันทึกเป็น{day}" pill shown in Kiosk mode when Staff chose a day (it sits on the Attendee-facing screen and isn't in the deck); the instruction; the results; the "Staff must sign in again" screen with its Staff lines; and `/kiosk`'s tab title and "กำลังเปิด Kiosk…" loading line.
- **Apostrophes are straight,** as in the deck and the public English dictionaries. In JSX text they are written `&apos;`, like the other Back Office tickets.
- **The Kiosk's retry button grows to two lines** (Thai, then English beneath).

### Strings not in the deck (for the organisers' review)

| Thai | English | Where |
| --- | --- | --- |
| ลองอีกครั้ง (camera problem nobody recognised) | Try again. | "Couldn't open the back camera: Try again." |
| และ (joining Event Days) | and | "Registered for: Saturday 31 October 2026 and Sunday 1 November 2026" |

"Loading…" (the desk's loading line) and "Cancel" (the Staff panel) come from the deck's Shell section.

### Needs from other tickets

- None. The Thai still on the desk's page is ticket 06's shell: sidebar "ระบบหลังบ้าน", nav "เช็คอิน", sr-only "เข้าสู่ระบบในชื่อ" and "เปิดหรือปิดเมนู", the sidebar's aria-labels, the Toaster's "การแจ้งเตือน", and "· ระบบหลังบ้าน ·" in the tab title.

### Noticed, not changed

- **When a session ends on the server, its notice only flashes.** The desk's "Session expired" panel and the Kiosk's "Staff must sign in again" screen show for a moment, then the page goes to the sign-in page. This happens at the desk, in Kiosk mode and on `/kiosk`. The page apparently re-renders after the Server Action, and `requireStaff()` / `requireCheckInAccount()` redirects. It predates this ticket. On an unattended Kiosk iPad, Attendees then see the sign-in page instead of the Thai and English notice. A follow-up if the notice should stay.

### Verified

- typecheck, lint, 249 tests and build pass.
- **Headless Chrome against `next start`.** Scratch database `stem_racing_te09`, a Staff Account and a Kiosk Account, no real SMTP; today, 24 October, isn't an Event Day. All 61 checks pass; screenshots were looked at.
  - **The desk (1280 and 375 px):**
    - title "Check-In", legend, day labels, "Today isn't an Event Day. Choose …", the chosen-day line, placeholder, label, `e.g.` placeholder, button and hint, all as in the deck
    - `method="dialog"` kept
    - no sideways scroll at 375 px
  - **Each Check-In result at the desk:**
    - Checking… (request held)
    - Today isn't an Event Day, with no day chosen, keeping the typed text
    - Checked in (Sponsor / Supporter, "Check-In for Saturday 31 October 2026")
    - Already checked in at {time}, plus the variant with "(not registered for this day)"
    - Not registered for this day, with "Check-In recorded" and "Registered for: Sunday 1 November 2026"
    - Not an Event Pass (unknown Pass Code)
    - Check-In didn't go through (request failed as offline; the text is kept)
    - Session expired, with "No Check-In recorded. Sign in again" linking to `/admin/login` (shown, then the redirect above)
  - **Desk camera, English only:**
    - camera access denied (headless default)
    - no camera found (stubbed `NotFoundError`)
    - "Opening the camera…"
    - "Switch to front camera", then "Switch to back camera", and "Turn off camera"
    - a failed switch back on the old camera ("… Back to the back camera.") and a failed switch with no camera left ("… and couldn't reopen the back camera. Press Open camera to try again.")
    - the stray-QR notice
    - an Event Pass QR read from a fake camera ("Already checked in at …")
  - **Kiosk mode at the desk (iPad landscape and portrait):**
    - root `lang="th"`, English lines `lang="en"`
    - corner "เจ้าหน้าที่ · Staff"
    - the instruction unchanged
    - camera denied in Thai, then English, with the two-line retry button
    - "กำลังเปิดกล้อง… / Opening the camera…"
    - the stray-QR notice in Thai, then English
    - an Event Pass checked in by the fake camera with the Kiosk's unchanged "เช็คอินสำเร็จ / You’re checked in / … / ยินดีต้อนรับ / Welcome!", then the desk showing the same result in English
    - the pill unchanged
    - Staff panel: name "For Staff", `lang="en"`, "Leave Kiosk mode?" text, both day lines ("Today isn't an Event Day, so Check-Ins will fail. …" and "Recording Check-Ins for Saturday 31 October 2026 (not today)"), "The screen stays on in Kiosk mode", Cancel, and Leave Kiosk mode back to the desk
    - "Staff must sign in again" unchanged
  - **`/kiosk` as the Kiosk Account:**
    - `<html lang="th">`, Thai tab title, header and instruction unchanged
    - corner "เจ้าหน้าที่ · Staff"
    - camera denied and camera busy in Thai, then English
    - the fake camera's pass giving the unchanged "วันนี้ไม่ใช่วันจัดงาน / Today isn’t an Event Day / โปรดติดต่อเจ้าหน้าที่ / Please see a staff member."
    - Staff panel: "Sign this Kiosk out?", "Signed in as Kiosk Nine", "Today isn't an Event Day. This Kiosk records Check-Ins on Event Days only.", "Signing out…" and Sign out to the sign-in page
    - "Staff must sign in again" unchanged
  - **Thai scan** (visible, sr-only, `aria-*`, placeholders, titles):
    - none in the Staff panel
    - at the desk, only ticket 06's shell and Attendee names
    - in Kiosk mode and on `/kiosk`, only the Attendee-facing text listed above
