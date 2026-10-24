# 09: English Back Office: check-in desk, camera and the Kiosk's Staff parts

**What to build:** Staff check people in through an English desk, while everything Attendees see stays Thai with English.
- The desk: day choice, Pass Code entry, hints, results and Kiosk mode's introduction, in English.
- Check-In result headings stay shared by the desk and the Kiosk: the desk shows English headings worded for Staff ("Checked in") with English details; the Kiosk keeps its Thai heading and English note.
- Camera messages: English at the desk, Thai then English on the Kiosk.
- The Kiosk: its corner button reads "เจ้าหน้าที่ · Staff"; the Staff panel behind it is English; the Attendee-facing screens and the "Staff must sign in again" screen are unchanged.

On the integration branch `back-office-english`.

See the spec ("English Back Office": check-in headings, camera, the Kiosk) and `copy-back-office.md` ("Check-in desk", "Camera", "Kiosk: Staff-only parts").

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Every string in the listed areas matches `copy-back-office.md`; the Kiosk's Attendee-facing screens are unchanged.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`: each Check-In result at the desk, Kiosk mode at the desk, the Kiosk page's corner button and Staff panel, and a camera error on each.

## Answer

Plan:
- `check-in-result.tsx`: the shared heading gains a Staff-worded English heading for the desk; the desk panel's details move to English (Event Day labels, Attendee Roles, times in English).
- `check-in-desk.tsx` and `page.tsx`: day choice, hints, Pass Code entry and Kiosk mode's introduction in English, with the deck's wording.
- `camera-scanner.tsx`: messages built in English for the desk, and Thai then English on the Kiosk.
- `kiosk-screen.tsx` and `/kiosk`: corner button "เจ้าหน้าที่ · Staff", an English Staff panel, Attendee-facing screens unchanged; decide on `lang` marking under the English root.
- Verify against `next start` with headless Chrome (every desk result, Kiosk mode, `/kiosk`, camera errors).

In progress.
