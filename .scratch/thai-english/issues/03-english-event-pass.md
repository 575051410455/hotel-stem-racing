# 03: The Event Pass page, card and saved image in English

**What to build:** `/en/p/:token` shows the thank-you text, instructions and Event Pass card in English, and "Save Event Pass" saves an English card image.
- The card and its PNG take the page's language: title, date line, venue, labels, Event Day labels, QR name, image alt and the file-save messages. The file name is unchanged.
- The English tab title is "Event Pass · STEM Racing Thailand 2026".
- QR content and Event Pass links don't change.

See the spec ("The Event Pass card and its PNG") and `copy-public.md` ("Event Pass page", "Event Pass card and saved image").

**Blocked by:** 01

**Status:** resolved

- [x] `/en/p/:token` matches `copy-public.md`; `/p/:token` is unchanged.
- [x] The saved PNG on `/en/p/:token` is in English; on `/p/:token` it is Thai as now. Both encode the same link.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`: the English page and card at 375 and 1280 px, both PNGs saved and looked at, the toggle keeping the token, and an unknown `/en/p/x` giving the English 404.

## Answer

Done on branch `thai-english-03-event-pass`.

### What's where

| What | Where |
| --- | --- |
| Page and card wording: `eventPassPage`, `eventPassCard` (with `{passCode}` and `{file}` placeholders) | `src/app/[lang]/_dictionaries/` |
| The page reads its language, sets the tab title per language, and passes the card its copy | `src/app/[lang]/p/[token]/page.tsx` |
| The card takes `language` (Event Day labels) and `copy`; fills `{passCode}` | `src/components/registration/EventPassCard.tsx` |
| The button takes its messages and the text to draw; fills `{file}` | `src/components/registration/DownloadEventPass.tsx` |
| The PNG draws the title, venue and Pass Code label it is given (no Thai left in it) | `src/components/registration/event-pass-png.ts` |
| An unknown token's 404 has a tab title in its language ("Event Pass not found" / "ไม่พบบัตรเข้างานนี้") | `src/app/[lang]/p/unknown/page.tsx` |

### Decisions

- **The image's text comes from the server's dictionary** through the button's props, so the PNG module stays free of wording and of the language.
- **The unknown-token 404 gets a tab title** from the not-found heading (before, it showed the registration page's title in Thai).

### Verified

- typecheck, lint, 231 tests and build pass.
- **Headless Chrome against `next start`** (scratch copy of the demo database; 11 checks, all pass):
  - `/en/p/:token`: tab title "Event Pass · STEM Racing Thailand 2026", the thank-you, see-you and save lines, and a card with no Thai apart from what the Attendee typed: "Pass Code", "If the QR won't scan, give this code", "Name", "Event Days", "Saturday 31 October 2026", "Save Event Pass", "An image file, EP-….png, …", QR named "Event Pass QR, Pass Code EP-…"
  - `/p/:token` unchanged, title included
  - "Save Event Pass" on each: the status reads "Downloading EP-….png" / "เริ่มดาวน์โหลดไฟล์ EP-….png แล้ว"; both PNGs were captured and looked at: English and Thai text in place, the same QR, same file name
  - `/en/p/not-a-token` and `/p/not-a-token`: 404 pages with titles in their language
  - `/en/p/:token` at 375 and 1280 px: no sideways scroll
