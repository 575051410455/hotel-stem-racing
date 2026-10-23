# 05: Toasts for resend, bulk send and delete

**What to build:** Staff get a toast when they resend an Event Pass email (from the list or the detail page), when a bulk send finishes or stops, and after they delete a Registration. Success toasts close themselves after a few seconds; error toasts stay until closed. The overview numbers refresh after these actions. Check-In results never become toasts, and no toast can show over Kiosk mode. See the spec ("Toasts", "Overview on the Back Office home": freshness).

**Blocked by:** 01 (Back Office app shell, which mounts the Toaster)

**Status:** ready-for-agent

- [ ] **Single resend** of an Event Pass email from the list's email cell or the detail page shows a success or failure toast, reusing the current Thai copy. The email cell keeps showing the email status data, refreshed as now.
- [ ] **Bulk send** keeps its progress on the page while it runs, and shows a toast summarising the result when it finishes or stops.
- [ ] **Delete:**
  - After the redirect to `/admin`, Staff see one toast "ลบการลงทะเบียน EP-… แล้ว".
  - The `deleted` query parameter is then removed from the URL, so reload and Back don't repeat it.
  - The inline deleted notice is removed.
- [ ] **Durations:** success toasts close after about 4 seconds. Error toasts stay until closed and have a close button. Toasts are light-themed, bottom-right and announced politely to screen readers.
- [ ] After a single resend or a bulk send, the page refreshes its server data, so the overview cards (including ยังไม่ได้ส่งอีเมล Event Pass) show the new numbers without a reload.
- [ ] Entering Kiosk mode at the check-in desk dismisses any open toast, so none shows over it.
- [ ] **Unchanged:** Check-In results at the desk and the Kiosk keep their large result panel. Form validation errors and the list's load errors stay inline. `/kiosk` and the public pages have no Toaster.
- [ ] typecheck, lint, test and build pass. The hand-off records a browser check of each toast case covering:
  - the email-not-configured and failure paths
  - reload after a delete
  - a toast open while entering Kiosk mode
  - screen-reader announcement (role and live region)
