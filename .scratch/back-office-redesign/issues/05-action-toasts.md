# 05: Toasts for resend, bulk send and delete

**What to build:** Staff get a toast when they resend an Event Pass email (from the list or the detail page), when a bulk send finishes or stops, and after they delete a Registration. Success toasts close themselves after a few seconds; error toasts stay until closed. The overview numbers refresh after these actions. Check-In results never become toasts, and no toast can show over Kiosk mode. See the spec ("Toasts", "Overview on the Back Office home": freshness).

**Blocked by:** 01 (Back Office app shell, which mounts the Toaster)

**Status:** resolved

- [x] **Single resend** of an Event Pass email from the list's email cell or the detail page shows a success or failure toast, reusing the current Thai copy. The email cell keeps showing the email status data, refreshed as now.
- [x] **Bulk send** keeps its progress on the page while it runs, and shows a toast summarising the result when it finishes or stops.
- [x] **Delete:**
  - After the redirect to `/admin`, Staff see one toast "ลบการลงทะเบียน EP-… แล้ว".
  - The `deleted` query parameter is then removed from the URL, so reload and Back don't repeat it.
  - The inline deleted notice is removed.
- [x] **Durations:** success toasts close after about 4 seconds. Error toasts stay until closed and have a close button. Toasts are light-themed, bottom-right and announced politely to screen readers.
- [x] After a single resend or a bulk send, the page refreshes its server data, so the overview cards (including ยังไม่ได้ส่งอีเมล Event Pass) show the new numbers without a reload.
- [x] Entering Kiosk mode at the check-in desk dismisses any open toast, so none shows over it.
- [x] **Unchanged:** Check-In results at the desk and the Kiosk keep their large result panel. Form validation errors and the list's load errors stay inline. `/kiosk` and the public pages have no Toaster.
- [x] typecheck, lint, test and build pass. The hand-off records a browser check of each toast case covering:
  - the email-not-configured and failure paths
  - reload after a delete
  - a toast open while entering Kiosk mode
  - screen-reader announcement (role and live region)

## Answer

Done on branch `worktree-agent-a3ad55e4a72a420a5`.

### What's where

| What | Where |
| --- | --- |
| Toast policy: `toastSuccess` and `toastInfo` (close after 4 s), `toastError` (`duration: Infinity`, close button), `useNoToasts(active)` for Kiosk mode | `(back-office)/_shell/toasts.ts` |
| Single resend: every outcome is a toast, with the recipient's address as its description. The inline `ResendFeedback` is gone, and the cell keeps the status and the button. After `sent`: the list query is invalidated (as before) and `router.refresh()` runs, for both the list and the detail page. The detail page's `onSent` prop is gone. | `_registration-list/event-pass-email.tsx`, `registrations/[id]/detail-actions.tsx` |
| Bulk send: progress stays in the run panel. When the loop ends (the `finally`), `router.refresh()` runs and `toastRunEnded(run)` shows the summary. | `email/bulk-send.tsx` |
| Delete: `RegistrationDeletedToast` (renders nothing) reads `?deleted=`, shows the toast and strips the parameter with `history.replaceState`. It is rendered next to `RegistrationList`, behind the list section's existing `requireStaff()` boundary. | `_registration-list/registration-deleted-toast.tsx` (renamed from `registration-deleted-notice.tsx`), `_registration-list/registration-list-section.tsx` |
| Home page: the deleted notice's boundary and `StaffOnlyDeletedNotice` are removed. That is the only change to the page. | `(back-office)/page.tsx` |
| Kiosk mode: `useNoToasts(kiosk)` in the desk | `check-in/check-in-desk.tsx` |
| `withoutDeletedNotice` is renamed `withoutDeletedParam` | `_registration-list/list-links.ts` |

The Toaster, `sonner.tsx` and the layout are unchanged. Sonner's defaults already give light, bottom-right, a 4 s duration, and a polite live region (`<section aria-live="polite" aria-relevant="additions text">`, always mounted).

### Decisions

- **Copy:**
  - **Single resend:** the current Thai messages, unchanged: "ส่ง Event Pass แล้ว", `resendProblem`/`sendFailureMessage`, and "หมดเวลาการเข้าสู่ระบบ".
  - **The recipient's address is the description,** because a toast can outlive the page that started it.
  - **Signed-out toast:** the old inline link became the toast's action button "เข้าสู่ระบบอีกครั้ง". Choosing it also dismisses the toast.
- **Bulk send summary:**
  - The titles are "ส่งอีเมล Event Pass เสร็จแล้ว" and "หยุดการส่งอีเมล Event Pass ไว้", not the panel's bare "ส่งเสร็จแล้ว". Leaving the page stops a run, so the toast can show on another page.
  - The description is the tally "ส่งสำเร็จ X ฉบับ · ไม่สำเร็จ Y ฉบับ" and, for a pause, the existing pause message.
  - Which kind of toast each ending gets:

    | How the run ended | Toast | Closes |
    | --- | --- | --- |
    | Finished with no failures | success | by itself |
    | Stopped (หยุด, or leaving the page) | info | by itself |
    | Finished with failures | error | when Staff close it |
    | Any other pause (all failed, request failed, signed out, not configured) | error | when Staff close it |

    The spec names only success and error. Info is a third kind, with the success duration, because a stop Staff asked for isn't a failure.
- **Refresh:** `router.refresh()` runs only after a resend that was `sent` (as the list invalidation did before) and after every bulk run. A delete already lands on a fresh `/admin`.
- **The resend toast is fired from `useMutation`'s own `onSuccess`,** not from `mutate`'s, so the result still shows if Staff have moved to another page.
- **Kiosk mode** dismisses every open toast on entering (`toast.dismiss()`). It also drops any new toast until it ends, using a module-level counter released by the effect's cleanup.
  - This covers a resend or bulk batch that finishes after Staff entered Kiosk mode: sonner's z-index is above the overlay.
  - A dropped result is not replayed later. The email status in the list and the bulk run panel still show it.
- **Delete toast:**
  - It fires from an Effect, so a page Next keeps hidden (Activity) can't fire it.
  - Its id `registration-deleted-<Pass Code>` stops a second Effect run (Strict Mode) from adding a second toast.
  - Stripping the parameter keeps the list view (`?q=…` stays).
  - It sits in the list section, not the home page, to keep `page.tsx` free for ticket 02.
- **No new tests.** All the changes are UI, which is not an agreed seam. The existing 200 tests pass.

### Gotchas

- **Sonner's `toast.dismiss()` with no id** dismisses everything at once. With an id, the dismissal is deferred to the next animation frame, and a `create` with the same id cancels it.
- **Sonner's error toasts aren't `role="alert"`.** Every toast is announced through the container's polite live region, which matches the spec ("announced politely").
- **The dummy SMTP check needs `SMTP_PORT` other than 465** (465 means TLS from the start). Nodemailer then sends AUTH PLAIN in clear text when the server offers no STARTTLS.

### Verified

- typecheck, lint, the 200 tests and build pass. `/admin/*` stay `◐`.
- **Headless Chrome over CDP against `next start` on port 3135.**
  - Setup:
    - a throwaway database `stem_racing_t05` with 66 Registrations inserted by psql
    - a Staff Account and a Kiosk Account
    - a local dummy SMTP server on 127.0.0.1. It accepts mail, rejects any recipient containing "reject" with 550, and holds "slow" recipients for 6 s.
    - no real email was sent
  - 61 of 61 checks pass. The database was dropped, and the server, the SMTP server and Chrome were stopped.
  - **Without SMTP (14 checks):**
    - `/`, `/admin/login` and `/kiosk` (signed in with a Kiosk Account) have no Toaster.
    - The live region exists before any toast: `aria-live="polite"`, `aria-relevant="additions text"`, label "การแจ้งเตือน alt+T".
    - Resend from the list gives an error toast "ส่งไม่ได้ เพราะยังไม่ได้ตั้งค่าการส่งอีเมล (SMTP)":
      - with the address, inside the live region
      - light, bottom-right, 24 px from the edges
      - still there after 6.5 s
      - its close button is labelled "ปิดการแจ้งเตือน" and closes it
    - The cell shows no inline feedback and still says ยังไม่ได้ส่ง.
  - **With SMTP (43 checks):**
    - **List resend:**
      - a success toast with no close button, gone 4.3 s after the click
      - the cell updates to ส่งแล้ว 1 ครั้ง
      - the server-rendered counts total moves from 65 to 66 without a reload, after a row was inserted by psql just before the resend. This is `router.refresh()`.
    - **Failure:**
      - "ส่งไม่สำเร็จ: เซิร์ฟเวอร์อีเมลไม่รับที่อยู่อีเมลนี้ ตรวจสอบอีเมลของผู้เข้าร่วมงาน (EENVELOPE)", with a close button
      - still there after 6 s
      - it follows a sidebar navigation to the check-in desk
    - **Kiosk mode:**
      - Entering Kiosk mode leaves no toast element in the DOM.
      - A resend to a "slow" address, started before entering Kiosk mode, finishes during it (the SMTP log confirms) and shows nothing.
      - After leaving Kiosk mode through the Staff corner, toasts show again.
    - **Check-In at the desk:** the green result panel, and no toast.
    - **Detail page resend:** a success toast, and the server-rendered status moves from ส่งแล้ว 2 ครั้ง to 3 ครั้ง.
    - **Delete,** from `/admin?q=delete-me…` through the detail page:
      - one toast "ลบการลงทะเบียน EP-CCCC4444 แล้ว"
      - the URL becomes `/admin?q=delete-me%40example.com`, with no inline notice
      - the counts total moves from 66 to 65, and the toast closes by itself
      - after a reload, and after Back, no toast and no `deleted`
    - **Bulk send (unsent, 63 emails):**
      - The progress bar shows while it runs, with no toast.
      - หยุด gives an info toast "หยุดการส่งอีเมล Event Pass ไว้" ("ส่งสำเร็จ 24 ฉบับ · ไม่สำเร็จ 1 ฉบับ" plus the pause message), which closes by itself.
      - ส่งต่อ runs to the end and gives an error toast "ส่งอีเมล Event Pass เสร็จแล้ว" ("ไม่สำเร็จ 1 ฉบับ") with a close button. It is still there after 5 s, and the run panel stays.
      - After fixing the address and starting again, a success toast "ส่งสำเร็จ 1 ฉบับ · ไม่สำเร็จ 0 ฉบับ".
    - **Signed out** (cookies cleared, then a resend): an error toast "หมดเวลาการเข้าสู่ระบบ". Its action "เข้าสู่ระบบอีกครั้ง" goes to `/admin/login`.
  - **Extra (4 checks):**
    - **Bulk send "ทุกคน":** when the run ends, the page makes one non-prefetch RSC request for `/admin/email`. This is `router.refresh()`; the sidebar links are prefetched again after it.
    - **At 375 px,** the toast is 16 px from each side, with no horizontal page scroll.
  - **Not checked:** the overview cards themselves. They belong to ticket 02, so this branch shows the old counts panel, and the refresh was checked through its total.
- **Screenshots looked at:**
  - the not-configured error toast
  - the success and failure toasts
  - the toast on the check-in desk, then Kiosk mode with no toast
  - the Check-In result with no toast
  - the detail toast and the delete toast
  - the bulk stopped toast and the bulk finished-with-failures toast
  - the signed-out toast with its action
  - the success toast at 375 px
