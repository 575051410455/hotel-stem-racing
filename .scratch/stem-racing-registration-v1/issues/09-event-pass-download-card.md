# 09: Event Pass download card

**What to build:** On their Event Pass page, an Attendee can download the pass as a print-ready PNG card named after the Pass Code.

**Blocked by:** 02

**Status:** resolved

- [x] A download button produces a 1024×1204 PNG with an 80px quiet zone around the QR and the Pass Code and Event Days printed underneath
- [x] The file name is the Pass Code and never contains the token
- [x] Converting the SVG for the card works with Thai text: URI-component encoding, not base64
- [ ] Manually checked on iOS Safari and Android Chrome (checked in desktop Chrome only; real iPhone and Android still to do, see below)

## Answer

Done in commit "feat(event-pass): download card …". There are no new dependencies and no new tests, because no test seam was agreed for this browser-only canvas work.

### What was built
- **`src/components/registration/DownloadEventPass.tsx`** (client component). A "บันทึก Event Pass" button with a download icon, which:
  - draws the card, then downloads it through a temporary `<a download>` pointing at a blob URL. The URL is revoked after 60 s, because revoking it at once can cancel the download.
  - sets `aria-disabled` while it works and shows "กำลังสร้างไฟล์…".
  - is described by a hint line ("ไฟล์รูปภาพ EP-….png สำหรับเก็บไว้ในเครื่องหรือพิมพ์").
  - reports the result in a `role="status"` line that is always rendered: "เริ่มดาวน์โหลดไฟล์ EP-….png แล้ว". On any failure it says "บันทึกไฟล์ไม่สำเร็จ กรุณาบันทึกภาพหน้าจอหน้านี้ไว้แทน" in the accent colour and logs the error. The page and the on-screen pass keep working.
  - **when the browser doesn't support `download`**: shows the card image inline under the button, with "กดค้างที่รูปด้านล่างเพื่อบันทึกลงในเครื่อง" (long-press to save). I chose inline over a new tab because `window.open` after the async drawing would be popup-blocked.
- **`src/components/registration/event-pass-png.ts`** (browser-only helper):
  - `renderEventPassPng({ qr, passCode, attendeeName, eventDayLabels })` returns a PNG `Blob`.
  - `eventPassFileName(passCode)` returns `EP-XXXXXXXX.png`. The name goes through `normalisePassCode`; anything else becomes `event-pass.png`. The component never receives the token, so it can't leak into the name.
- **`EventPassCard.tsx`:**
  - the QR gets `id="event-pass-qr"`.
  - the button sits at the bottom of the card.
  - `page.tsx` is unchanged.

### The card (1024×1204, white)
- **Top:** a 12px brand-gradient bar, then "บัตรเข้างาน STEM Racing Thailand 2026" and the venue.
- **QR:**
  - It is the page's own server-rendered SVG (react-qr-code, level M, the same `passLink`), cloned with `class`/`style` removed, sized to its final pixel size, and given `shape-rendering="crispEdges"`.
  - Serialised with `XMLSerializer` into a `data:image/svg+xml;charset=utf-8,` + `encodeURIComponent` URL, then drawn on the canvas.
  - It takes the height left after the text, snapped to whole pixels per module (16px × 33 modules = 528px for a two-day pass), with at least 80px of white on every side.
  - No QR code ships to the client.
- **Underneath:** "รหัส Event Pass", the Pass Code (80px monospace), the Attendee's name, and one line per Event Day label.
- **Text:**
  - Drawn with canvas `fillText` in the page's own font stack, read from `getComputedStyle(document.body).fontFamily`, plus `--font-mono` for the Pass Code.
  - Each line shrinks to fit 864px. The name can wrap to two lines at Thai word boundaries (`Intl.Segmenter`), then is cut with "…".
  - Colours mirror the `globals.css` tokens as constants.

### Verified (desktop Chrome on macOS, `next dev` and `next build` + `next start` on port 3109, dev database `stem_racing_t09`)
- **Real downloads.** I clicked the button with the real mouse and checked the files in `~/Downloads`:
  - `EP-JND5ZYEB.png` and, after merging main, `EP-4PFMUYQK.png` (Pass Code only, no token).
  - Both are `PNG image data, 1024 x 1204` according to `file` and `sips`.
  - The dev and production builds produced byte-identical files.
- **QR.**
  - Chrome's `BarcodeDetector` decoded the card's QR to exactly the page URL `http://localhost:3109/p/{token}` for all three test passes.
  - Pixel scan of the card:
    - the QR is 528×528
    - there are no anti-aliased pixels inside it
    - the white margins are 99 / 83 / 248 / 248px (top, bottom, left, right)
- **Thai encoding.** The serialised QR SVG contains the Thai `aria-label`. `btoa` on it throws `InvalidCharacterError` (outside Latin-1). The `encodeURIComponent` data URL loads.
- **Layout.** Tested with a short Thai name and two days, a long Thai name and one day (wrapped onto two lines at word boundaries), and 100×"W" + 100×"ม" (two lines with an ellipsis, inside the margins).
- **Fallbacks, simulated:**
  - `toBlob` throwing a `SecurityError`, and `getContext` returning null, both showed the Thai screenshot hint.
  - With `download` removed from `HTMLAnchorElement.prototype`, the inline 1024×1204 preview appeared with the long-press hint.
- **Page and keyboard.**
  - Enter on the focused button works.
  - There is no horizontal scroll at 320px or 375px.
  - The production page logs no console errors.
- `npm run typecheck`, `npm run lint`, `npm test` (83 tests after merging main) and `npm run build` all pass.

### Still to check by hand on real phones
- **iPhone (iOS Safari):**
  - Tap the button. iOS 13+ should show "Download?" and save `EP-….png` to Files › Downloads, or "View" lets you share › Save Image.
  - Check the card isn't blank. WebKit has to draw the SVG data-URL image without tainting the canvas.
  - Check the Thai text renders in the system Thai font.
  - Canvas `letterSpacing` is ignored on older Safari, so the Pass Code is just less tracked there.
- **Android Chrome:** the file should land in Downloads with the Pass Code name.
- **In-app browsers (LINE, Facebook, Gmail):** these may silently ignore downloads. The screenshot hint on the page still applies there. A share-sheet option (`navigator.share({ files })`) could be added later if this turns out to matter.
- **Not done:** the pass page's `<Suspense>` placeholder is still 640px, while the card is now about 110px taller. I left `page.tsx` alone.
