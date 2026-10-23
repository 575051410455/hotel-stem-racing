# 18: Camera scanner

**What to build:** Staff scan Event Passes with the phone or tablet camera on `/admin/check-in`. The scanner reads QR codes anywhere in the frame, switches between front and back cameras safely, remembers the chosen camera per device, and shrugs off stray QR codes.

**Blocked by:** 13

**Status:** resolved

- [x] html5-qrcode with no scan box, QR format only, 10 fps and no "try harder" mode. Results feed the same Check-In flow as ticket 13.
- [x] Camera switching:
  - uses a non-exact front/back facing mode
  - always waits for the current stream to stop before starting the next
  - disables the switch and stop controls and shows "Starting..." while switching
  - on failure, shows an error, restores the previous camera and does not save the choice
- [x] The camera preference is a pure module separate from React. It is stored per device; "front" means front and anything else means back. Every storage access is wrapped so private browsing works.
- [x] A QR that isn't an Event Pass shows an orange notice for 3 seconds, silently, and scanning continues. The same text is suppressed for 10 seconds. The browser recogniser is looser than the server's.
- [x] Unit tests cover the camera preference module. The scanner is manually checked on iPhone/iPad Safari and Android Chrome.
  - Unit tests: done. Device checks are handed to the operator; the checklist is under Verification below. Chrome on a Mac was checked with a fake camera.

## Answer

Done in commit "feat(check-in): camera scanner …". Notes for ticket 19 and the operator.

### Modules and names
- **Camera preference** (pure, no React): `src/lib/check-in/camera-preference.ts`.
  - `cameraPreference(storage: () => PreferenceStorage)` returns `{ read(): CameraFacing; save(facing): void }`.
    - `CameraFacing` is `"front" | "back"`.
    - `PreferenceStorage` is `Pick<Storage, "getItem" | "setItem">`.
  - `deviceCameraPreference` is the instance bound to `window.localStorage`, under the key `stem-racing:check-in-camera`.
  - Storage is reached through a function, because Safari can throw on merely touching `window.localStorage`.
  - `read()` gives "front" only for exactly `"front"`; anything else, nothing stored, or a throw gives "back". `save()` never throws.
- **Browser pass recogniser** (pure): `looksLikeEventPass(text)` in `src/lib/check-in/pass-recogniser.ts`. Case-insensitive, and unanchored where the server's rules are anchored. It accepts:
  - a UUID-shaped token anywhere in the text;
  - `/p/` (or `\p\`) followed by at least 8 hex characters. A bare `/p/` would let LINE add-friend links (`line.me/R/ti/p/@…`) and Instagram posts through;
  - after removing everything but letters and digits, an optional `EP` plus 8 letters or digits.

  A test proves it accepts everything `resolveScan` accepts, over a fixed corpus plus 1,200 generated tokens, links and Pass Codes. The server still decides: pass-shaped text the server rejects shows ticket 13's neutral "ไม่ใช่ Event Pass" panel.
- **Scanner component:** `CameraScanner({ onPass, mirrorPreview? })` in `check-in/camera-scanner.tsx`.
  - `CheckInDesk` renders it between the Event Day picker and the result panel, as `onPass={(scan) => void submitScan(scan)}`.
  - Camera scans therefore get everything ticket 13's typed path has: the chosen Event Day, the pending state, stale-response handling, the result panel, and putting the text back for `not-an-event-day`, `signed-out` and `failed`.
  - The only change to ticket 13's code is the import and that one line in `check-in-desk.tsx`.

### How the scanner behaves
- **Library:** `html5-qrcode` is pinned to exactly `2.3.8`.
  - It is loaded with `import()` only when Staff tap "เปิดกล้องสแกน QR", so the server render never runs it.
  - The build compiles it into a lazy chunk on both sides; the SSR side only has a loader that the click path calls.
  - It uses `Html5Qrcode`, not `Html5QrcodeScanner`'s UI. Settings: `formatsToSupport: [QR_CODE]`, `{ fps: 10 }`, no `qrbox`. ZXing's `TRY_HARDER` hint stays false, the library's own default.
  - `useBarCodeDetectorIfSupported` is left at the library default, so Chrome's native QR detector is used where it exists. Safari uses ZXing.
- **Serial queue:** every camera operation (start, switch, stop, close on unmount) runs through one promise queue (`inTurn`). Two consequences:
  - `stop()` has always finished before the next `start()`, which avoids WebKit bug 179363.
  - html5-qrcode's "already under transition" error can't happen.
- **Switching:**
  - Both buttons are disabled and "กำลังเปิดกล้อง…" shows over the preview.
  - Order: `close()`, then `start({ facingMode: "user" | "environment" })`, non-exact.
  - On failure: a Thai error, then close and reopen the previous camera. The choice is saved only after the new camera opened.
  - If the previous camera can't reopen either, the scanner goes off and the error says to tap open again.
- **Start** reads the preference (default back). **Leaving the page** (unmount) closes the camera after any start or switch under way.
- **Mirroring:** `-scale-x-100` on the element html5-qrcode renders into, CSS only. It defaults to on while the front camera is open; `mirrorPreview` overrides it. Decoding reads camera frames, not that element.
- **Stray QR:**
  - An orange pill toast "QR นี้ไม่ใช่ Event Pass" sits over the bottom of the preview for 3 s. It is outside the mirrored element, so it reads the right way round.
  - No sound or vibration. It is a polite live region, so a screen reader may speak it.
  - The same text doesn't warn again within 10 s of its last warning. No request is made, and the result panel is left as it was.
- **Repeated pass scans:** the same pass text isn't sent again until it has been out of sight for 5 s (`SAME_PASS_QUIET_MS`).
  - A pass held in view checks in once and stays green, rather than turning amber while its owner is still standing there.
  - Only the last pass is remembered, so A, B, A within 5 s sends A again (amber).
- **Error copy:**
  - not https
  - permission denied
  - no camera
  - camera in use by another app
  - unsupported browser
  - a generic "ลองอีกครั้ง"

  Each is prefixed "เปิดกล้องหน้า/หลังไม่ได้:" or "เปลี่ยนเป็น…ไม่ได้: … กลับมาใช้…แล้ว". The raw error goes to `console.error` for diagnosis on devices.

### For 19 (Kiosk)
- **Front camera:** call `deviceCameraPreference.save("front")` before starting, or add a `facing` prop to `CameraScanner`; there is none today. Note that a saved "front" also becomes that device's default for Staff scanning.
- **Mirror:** pass `mirrorPreview` (true). Put the Kiosk instructions next to the toast, i.e. as siblings of the reader element inside the preview wrapper, never inside the mirrored element, or the text reads backwards.
- **Preview size:** the preview is `max-w-md` (448px). html5-qrcode fixes the video's pixel width to its container's width when the camera starts, and its crop maths depend on that width. If the Kiosk enlarges the preview, or the iPad rotates, restart the camera so whole-frame reading keeps its geometry. Don't resize the `<video>` with CSS.
- **Auto-start:** the scanner starts only from the button today. A Kiosk that auto-starts must still cope with the first permission prompt. Check whether iPad Safari opens the camera without a tap once permission is granted.
- **Locked or backgrounded iPad:** this ticket does nothing on `visibilitychange`. If the iPad check shows a frozen or black preview after unlocking, stop the camera when hidden and restart it when visible, through the same queue.
- **Results:** ticket 13's result panel shows below the scanner; enlarge it for distance reading. The 5 s same-pass quiet time and the 10 s stray suppression apply to the Kiosk too.

### Conservative choices
- **"Starting..." in Thai:** the switching label is "กำลังเปิดกล้อง…", because the spec says the UI, Back Office included, is Thai only.
- **Start button:** the camera starts from a button, not on page load, so the permission prompt comes when Staff want it and the typed box works with no camera at all. The other control labels are "สลับเป็นกล้องหน้า/หลัง" and "ปิดกล้อง".
- **Button states:** both controls are also disabled during the first start and during stop, not just while switching.
- **Section heading:** "สแกน QR ด้วยกล้อง".
- **Mirroring:** follows the camera Staff selected, not the camera the device actually opened. A laptop asked for "back" opens its only, user-facing webcam unmirrored.
- **`hasInstallScript`:** npm 11 added this line to the lockfile root; I removed it to keep the lockfile diff to html5-qrcode.

### Verification
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` all pass, including the build with `.env` moved aside.
- **Unit tests (TDD, red then green one at a time):**
  - 6 for the camera preference:
    - default back
    - "front" gives front
    - other values give back (including `"FRONT"`, `" front"` and `"user"`); a case-insensitive mutant fails this test
    - storage that throws on read, or on being reached, gives back
    - storage that throws on write doesn't throw
    - front and back round-trip, across instances
  - 3 for the recogniser:
    - superset of `resolveScan`
    - looser than the server on near-misses
    - stray venue QR codes (LINE, Instagram, Wi-Fi, vCard, PromptPay, mailto, tel) turned away; a bare-`/p/` mutant fails this test
- **Manual check:** `next start` on port 3118 (host `t18.localhost`, a secure context), signed in as a Staff Account made with `npm run staff`, against `stem_racing_t18`.
  - **Real camera:** not verified. This Mac has a camera, but Chrome's camera permission prompt is browser UI that I could not and did not answer.
  - **Fake camera instead:** I replaced `navigator.mediaDevices.getUserMedia` in the page with a `canvas.captureStream()` feed, with 400ms start latency. Real QR PNGs (level M, made with `qrcode`) were drawn off-centre on a grey frame. Results, with 31 Oct chosen:
    - **Start:** with no preference stored, one call `{ video: { facingMode: "environment" } }` (non-exact). During start both buttons were disabled and "กำลังเปิดกล้อง…" showed. The video then played at 448px.
    - **A pass in the bottom-right, then top-left corner:** green "เช็คอินสำเร็จ" with 1 request.
      - Held in view 11 s: still 1 request, still green.
      - Out of view 6 s, then shown again: a 2nd request and amber "เช็คอินแล้วเมื่อ 08:02".
    - **A LINE add-friend QR held in view 15 s:** toast on at 0.1 s, off at 3.1 s, on again at 10.1 s, off at 13.2 s. 0 requests, and the amber panel stayed. A Wi-Fi QR then toasted at once (a different text).
    - **Switch to front:** both buttons disabled with "กำลังเปิดกล้อง…". The previous track had ended before the new `getUserMedia` call (0 live tracks). The call was `facingMode: "user"`, the preview was mirrored (`scale: -1 1`) and `localStorage` held `"front"`.
      - An old-domain link for a 1 Nov-only Attendee, scanned through the mirrored preview, gave orange "ไม่ได้ลงทะเบียนวันนี้".
    - **Failed switch** (back camera made to throw `NotReadableError`): error "เปลี่ยนเป็นกล้องหลังไม่ได้: กล้องอาจถูกแอปอื่นใช้อยู่ … กลับมาใช้กล้องหน้าแล้ว". The front camera was reopened, still mirrored, and the stored value stayed `"front"`. Both `getUserMedia` calls saw 0 live tracks.
    - **Stop:** 0 live tracks and the preview hidden. Start again opened `"user"`, so the choice was remembered.
    - **Storage throwing on every access** (as in private browsing): start opened back, switching to front worked, and there were no page errors or alerts.
    - **Leaving the page:** with the camera on, the header link to `/admin` (a client-side navigation) took live tracks from 1 to 0.
    - **Width:** in 320 and 375px same-origin iframes there was no horizontal scroll, and the preview was 286 and 341px wide with its 16px gutters.
    - **Ticket 13's typed path:** `ep hxt4 w8rn` gave amber, the box was cleared and stayed focused.
    - The database held exactly 2 Check-Ins, one flagged as outside a registered day, both with the Staff Account id. No console errors.
- **For the operator, on real devices over https** (staging or production):
  - **iPhone Safari:**
    - Tap "เปิดกล้องสแกน QR" and allow the camera; the back camera opens.
    - A pass on another phone checks in from arm's length and from a corner of the frame.
    - Switch front and back 5 times; the preview is never black.
    - The front camera is mirrored.
    - Reload: the last camera opens.
    - A Private Browsing tab scans fine.
  - **iPad Safari:** the same as iPhone, plus rotate the iPad with the camera on (see the Preview size note for 19). Lock and unlock the iPad with the camera on; if the preview is frozen, tap ปิดกล้อง then reopen, and report back for 19.
  - **Android Chrome:**
    - The same as iPhone.
    - Deny permission once and check the Thai error, then re-allow in site settings.
    - With another app holding the camera, check the "in use" error.
  - **Everywhere:**
    - A LINE OA poster and a Wi-Fi QR give the orange toast, with no panel change and no repeat within 10 s.
    - A pass held in view for 10 s gives one Check-In and stays green.
