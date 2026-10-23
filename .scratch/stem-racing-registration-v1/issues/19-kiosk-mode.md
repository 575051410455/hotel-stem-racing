# 19: Kiosk mode

**What to build:** Staff can put an iPad into Kiosk mode so Attendees check themselves in: front camera, mirrored preview and Attendee-facing instructions.

**Blocked by:** 18

**Status:** resolved

- [x] The Kiosk toggle selects the front camera and mirrors the preview with CSS only (scanning is unaffected)
- [x] Instructions read "แสดง QR ของท่านที่กล้อง / Show your pass QR to the camera", and results are large and readable from a distance
- [x] The Kiosk stays signed in for the whole Event
  - The 30-day session from ticket 04 covers it: `expires_at - created_at` is 30 days. A clear "Staff must sign in again" screen covers an expiry.
- [ ] Manually checked on an iPad
  - Not done here: I checked in headless Chromium at 1024×768 and 768×1024 with Chrome's fake camera. The iPad checklist for the operator is under Verification.

## Answer

Done in commit "feat(check-in): Kiosk mode …". Everything is under `src/app/admin/(back-office)/check-in/` and `src/lib/check-in/`. No schema, layout, composition-root or `globals.css` changes.

### Modules and names
- **Kiosk mode in the address** (pure): `src/lib/check-in/kiosk-mode.ts`.
  - `isKioskMode(searchParams)` is true only for exactly `kiosk=1`.
  - `kioskUrl(window.location, on)` returns the same path with the parameter set or removed. Other parameters and the hash are kept, and there is no stray `?`.
- **Desk** (`check-in-desk.tsx`):
  - reads `useSearchParams()` and renders either the Staff desk or `KioskScreen`;
  - both use the same `submitScan`, so the chosen Event Day, stale-response handling and the pending state carry over;
  - adds a "โหมด Kiosk: จุดเช็คอินด้วยตนเอง" section at the bottom, with a "เปิดโหมด Kiosk" button and the bookmark hint;
  - toggling uses `window.history.replaceState`. It is client-only, so there is no server round trip. Next syncs `useSearchParams` with it.
- **Kiosk screen:** `KioskScreen({ attempt, onPass, onLeave, checkInDay })` in `kiosk-screen.tsx`.
- **Scanner** (`camera-scanner.tsx`): `CameraScanner({ onPass, mirrorPreview?, kiosk?, className? })`. `kiosk` is fixed for the instance. With it, the scanner:
  - opens the front camera on mount (`facingMode: "user"`, non-exact) without reading or saving `deviceCameraPreference`, so the device's Staff default is untouched;
  - has no switch or stop control. When the camera can't open, it shows the error and a "เปิดกล้องอีกครั้ง" retry;
  - shows "Starting the camera…" and "This QR isn't an Event Pass" under the Thai text;
  - closes the camera when the page is hidden and reopens it when visible, through the queue (18's note about frozen previews);
  - fills its box, sized by `KIOSK_READER_WIDTH`: the widest width at which a 4:3 stream (landscape) or 3:4 stream (portrait) still fits the box's height, using container-query units.
- **Changes in the scanner that also apply to the desk:**
  - **One camera queue per page**, at module level, instead of one per instance. Entering the Kiosk while the desk camera runs therefore waits for the desk's `stop()` before the front camera starts (WebKit 179363).
  - **Refit:** a `ResizeObserver` on the reader element. When the video no longer matches the reader's width, or the scan canvas no longer matches the video (rotation, a resized window, a stream that turned with the device), it reopens the same camera after 500 ms of stillness.
  - The open path is now one `openCamera(facing)`: close, next frame, open. `start()` uses it.
- `check-in-result.tsx` now exports `Tone`, `tones`, `SIGN_IN_PATH` and the four icons. The icons take an optional `className`. The desk looks the same.

### How the Kiosk behaves
- **Covers the Back Office chrome without touching the layout:** it is a `fixed inset-0 z-50` screen over the header, its navigation and sign-out.
  - The Pass Code box and the Event Day picker aren't rendered.
  - The day chosen at the desk still applies. When that day isn't today, an orange "บันทึกเป็น…" pill shows in the Kiosk's top bar, so a test setting isn't forgotten.
  - A bookmarked `?kiosk=1` is server-rendered as the Kiosk.
- **Layout:**
  - Landscape: preview | message, in two equal columns.
  - Portrait: preview over message, in two equal rows.
  - The tracks are fixed, so results coming and going never resize the preview (which would trigger a refit).
  - The text sizes are larger in landscape.
- **Idle:** "แสดง QR ของท่านที่กล้อง" (48–60px) with "Show your pass QR to the camera" beneath, plus "ไม่มี Event Pass? ติดต่อเจ้าหน้าที่ / No Event Pass? Please ask a staff member."
- **Results:** Thai headline (48–60px), English beneath, then the name (36–48px). They use the desk's colours and icons. Each returns to idle on its own:

  | Result | Headline | Extra line | Shown for |
  | --- | --- | --- | --- |
  | checked in | เช็คอินสำเร็จ / You're checked in | ยินดีต้อนรับ / Welcome! | 5 s |
  | already | เช็คอินแล้วเมื่อ HH:MM / Already checked in at HH:MM | — | 6 s |
  | outside a registered day | ไม่ได้ลงทะเบียนวันนี้ / Not registered for today | บันทึกการเช็คอินแล้ว โปรดแจ้งเจ้าหน้าที่ / recorded, please see staff | 8 s |
  | not a pass | ไม่ใช่ Event Pass / Not an Event Pass | show the QR from your email or pass page | 8 s |
  | not an Event Day | วันนี้ไม่ใช่วันจัดงาน / Today isn't an Event Day | please see staff | 8 s |
  | failed | เช็คอินไม่สำเร็จ / Check-in didn't go through | try again in a moment | 8 s |

  Checking stays until its result arrives. A new scan replaces the result at once and restarts the timer. The result on the desk when the Kiosk opens counts as seen, so the Kiosk opens idle.
- **Signed out:** a whole-screen "เจ้าหน้าที่ต้องเข้าสู่ระบบอีกครั้ง / Staff must sign in again" notice with a sign-in link. The scanner unmounts, so the camera turns off, and the notice stays until Staff act.
  - In practice an expired or deleted session usually never reaches it. As ticket 13 noted, the action's cookie cleanup re-renders the page and `requireStaff()` sends the iPad to `/admin/login`, dropping `?kiosk=1`.
  - After signing in, Staff land on `/admin` and reopen the Kiosk bookmark.
- **Leaving:** a small, low-contrast "เจ้าหน้าที่" button (lock icon) in the top-right corner opens an in-page panel.
  - The panel offers "ออกจากโหมด Kiosk" and "ยกเลิก", and Escape closes it. It closes itself after 15 s, and it never uses a browser dialog.
  - It also tells Staff which day Check-Ins are recorded for (or that today isn't an Event Day) and whether the screen is being kept on.
- **Screen Wake Lock:** `navigator.wakeLock.request("screen")` is guarded by `"wakeLock" in navigator`.
  - The browser drops the lock whenever the page is hidden, so it is requested again on return, and on the next tap if it was refused.
  - It is released when leaving the Kiosk.
  - Safari has it from 16.4. Where it isn't held, the Staff panel says to turn off Auto-Lock.

### Conservative choices
- **The toggle replaces the history entry rather than pushing one,** so Back never just switches off the Kiosk on the same page.
  - Back, or Safari's edge swipe, still leaves the page, though: to `/admin` if Staff came from there. That would show an Attendee the Registration list.
  - **For the operator:** open the Kiosk from the bookmark in a fresh tab, so there is no page to go back to, and lock the iPad to Safari with Guided Access (Settings → Accessibility → Guided Access). Consider circling the address bar and the left edge as disabled areas.
- **Leaving needs two taps but no password.** The ticket asked to prevent accidents, not determined Attendees, and Guided Access covers the rest.
- **The not-registered-today result tells the Attendee to see a staff member.** The Check-In is still recorded and flagged, as at the desk.
- **The Kiosk always mirrors** (`mirrorPreview`), whichever camera the device actually opened.
- **Copy I wrote** beyond the ticket's instruction: every English line, the result extra lines, "จุดเช็คอินด้วยตนเอง", the Staff panel, the desk section, and "เปิดกล้องอีกครั้ง".

### Verification
- `npm run typecheck`, `npm run lint`, `npm test` (185 tests with 14 and 17 merged) and `npm run build` all pass, including the build with `.env` moved aside.
- **Unit tests:** 5 for `kiosk-mode.ts`:
  - `kiosk=1` is on, even among other parameters;
  - near-misses are off (`kiosk`, `kiosk=`, `0`, `true`, `yes`, `01`, `KIOSK=1`, `kiosk= 1`);
  - turning on keeps other parameters and the hash;
  - turning off leaves no stray `?`;
  - a round trip reads back the asked-for mode.
- **How I checked:** `next start` on port 3119 (host `t19.localhost`), against `stem_racing_t19`, signed in as a Staff Account made with `npm run staff`.
  - Claude in Chrome couldn't reach the sandboxed server, so I drove Playwright's cached headless Chromium over CDP inside the sandbox instead.
  - **Phase A, Chrome's own fake camera:** `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream --use-file-for-fake-video-capture`, with a Y4M of an old-domain pass link drawn off-centre. 31 Oct was chosen at the desk, then "เปิดโหมด Kiosk" tapped, at 1024×768:
    - The URL became `?kiosk=1`, with one `getUserMedia({ video: { facingMode: "user" } })` and 0 live tracks before it.
    - The reader had `scale: -1 1` and the preview showed the QR mirrored. Green "เช็คอินสำเร็จ" with the long Thai name came 0.6 s after the video appeared.
    - Held in view for 7 s, it gave still one Check-In, and the screen returned to idle by itself.
    - The header was covered, and there was no Pass Code box, no day picker and no horizontal scroll.
  - **Phases B–D, a canvas camera injected before page scripts** (like iPad Safari, the stream is 3:4 in portrait):
    - **Bookmarked `?kiosk=1` at 768×1024:** server-rendered Kiosk, auto-started front camera, video 375×500 in its box. With no day chosen (today is 23 Oct), a pass gave "วันนี้ไม่ใช่วันจัดงาน / Today isn't an Event Day" and no row; it was back to idle at 8 s. The Staff panel said today isn't an Event Day.
    - **Leaving through the panel:** no `?kiosk`, the desk back with the nav, live tracks 0.
    - **The desk scanner** (ticket 18's path): opened `environment`; resizing to 400px refitted it (448 → 368px); switching disabled both buttons with "กำลังเปิดกล้อง…" and saved "front".
    - **Re-entering the Kiosk** from the running desk camera: the next `getUserMedia` saw 0 live tracks (shared queue), and the saved preference was untouched.
    - **Results with 31 Oct chosen:**
      - a 1 Nov-only Attendee gave orange "ไม่ได้ลงทะเบียนวันนี้" with the name, and 1 row, flagged;
      - a repeat gave amber "เช็คอินแล้วเมื่อ 08:27";
      - an unknown token gave "ไม่ใช่ Event Pass";
      - a fresh pass gave green;
      - offline, a pass gave "เช็คอินไม่สำเร็จ";
      - nothing overflowed at either size.
    - **A LINE QR:** the bilingual toast for 3 s, no request, and the idle message untouched.
    - **Rotation:** portrait to landscape reopened the camera once (0 live tracks before), and the video, reader and canvas matched (476×357, stream 640×480). Back to portrait refitted again.
    - **Page hidden, then visible:** live tracks went to 0, then the camera reopened.
    - **The Staff panel** closed by itself after 15 s. "ยกเลิก" closed it.
    - **Widths:** no horizontal scroll at 1024, 768 or 320px.
    - **Signed out:**
      - With the session rows deleted, the next scan sent the Kiosk to `/admin/login`, with the camera off and nothing recorded.
      - With the action's answer rewritten to `signed-out`, the whole-screen notice showed with its sign-in link, and the camera went off.
    - **Wake Lock:** headless Chromium refuses it (`NotAllowedError`), so the Staff panel correctly showed the Auto-Lock advice. The lock itself is unverified.
    - No other console errors or warnings.
- **For the operator, on a real iPad over https:**
  - [ ] Open the bookmark `…/admin/check-in?kiosk=1` in a new tab. The camera permission prompt appears (or not, once allowed), the front camera opens by itself, and the preview is mirrored.
  - [ ] A pass on a phone, held at arm's length, checks in. Green shows the name, then returns to the instruction after about 5 s. Try a 1 Nov-only pass on 31 Oct, a repeat and a LINE QR.
  - [ ] Read the results from 1.5–2 m away.
  - [ ] Rotate the iPad with the camera on. The preview refits within about a second and scanning still works.
  - [ ] Lock and unlock the iPad, and switch apps and back. The preview comes back live, not frozen.
  - [ ] With Auto-Lock on, leave the Kiosk idle beyond the Auto-Lock time. If the screen sleeps, Wake Lock isn't held: check the Staff panel, and set Auto-Lock to Never for the Event.
  - [ ] The "เจ้าหน้าที่" corner, then "ออกจากโหมด Kiosk", returns to the desk with the same day.
  - [ ] Set up Guided Access, and check that the edge swipe and the address bar can't reach `/admin`.
  - [ ] Sign the Kiosk in during Event week. Sessions last 30 days from sign-in, and a password reset for that Staff member signs the Kiosk out.
