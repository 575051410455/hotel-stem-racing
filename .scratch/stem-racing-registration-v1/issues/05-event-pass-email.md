# 05: Event Pass email

**What to build:** An Event Pass email that renders correctly in Gmail and Outlook, plus an SMTP sender that implements the Registration module's email-sender port and never throws. The operator can send a test Event Pass email to any address with a command, which verifies SMTP setup before launch.

**Blocked by:** 01

**Status:** resolved

- [x] A pure builder returns subject, HTML and plain text following the spec's template:
  - 600px white card on #f4f4f7
  - banner header (inline CID, at most 300KB)
  - Thai-then-English greeting
  - details table with dates and times as a range in Asia/Bangkok
  - QR PNG (width 220, margin 2, error correction M) as inline CID, with the Pass Code in large monospace
  - CTA button plus raw link
  - conditions and signature
- [x] The HTML uses inline styles and tables only, a VML fallback for Outlook backgrounds and contrast-chosen button text, and every Attendee-entered value is HTML-escaped
- [x] The SMTP sender uses nodemailer pooling (max 10 connections, 100 messages each) and returns success or an error without throwing. When SMTP is not configured, the email-sender port stays a no-op.
- [x] A server command sends a sample Event Pass email to a given address
- [x] Unit tests cover escaping, presence of the plain-text part, Pass Code and raw link, and Bangkok-time formatting

## Answer

Done in commit "feat(email): …". Files: `src/lib/email/` (`event-pass-email.ts` builder, `event-dates.ts`, `html.ts`, `smtp-sender.ts`, `event-pass-email.test.ts`), `scripts/send-test-email.ts`, `public/brand/banner-email.jpg` (1200×300, 53KB).

**For ticket 10 (wiring):**
- Factory: `createSmtpEmailSender(process.env)` from `@/lib/email/smtp-sender`. It returns `unconfiguredEmailSender` when `SMTP_USER` is empty, so the composition root can pass it unconditionally: `createRegistrations({ db, emailSender: createSmtpEmailSender(process.env) })`. Build it once (the existing `globalThis` cache does that), so there is one connection pool.
- The env is passed in; nothing in `src/lib/email` reads `process.env`, so `src/lib/server/registrations.ts` stays the only composition root.
- `send` never throws. A failure is `{ success: false, error }`, where `error` is `"<nodemailer code>: <message>"`, e.g. `EAUTH: Invalid login…` or `ESOCKET: connect ECONNREFUSED…`.
- Timeouts are 10s to connect and greet and 30s on the socket, so a dead SMTP server costs up to about 10–30s per send. Decide whether the Registration response awaits it.
- nodemailer and qrcode have not been bundled by Next yet, because nothing in `src/app` imports them. If Turbopack fails or warns once ticket 10 imports the sender, add `serverExternalPackages: ["nodemailer", "qrcode"]` to `next.config.ts`.

**For tickets 06/16/17:**
- Re-sends and bulk sends go through the same port and the same pooled sender: 10 connections, 100 messages each. Gmail quotas are about 500/day for personal Gmail and 2,000/day for Workspace.
- Ticket 16 maps the English `error` string to Thai for Staff.

**For ticket 03 (Docker):**
- The banner is read once, lazily, from `${process.cwd()}/public/brand/banner-email.jpg`, so `public/` must sit in the app's working directory, as the usual standalone copy does. If the file is missing, emails still go out with a text-only header, and a warning is logged once.
- `npm run email:test -- someone@example.com` needs `tsx`, `nodemailer`, `qrcode`, `scripts/` and `src/lib/{email,event.ts,registrations/ports.ts}` in the image. Imports are relative, so no tsconfig path mapping is needed.

**Builder and template:**
- `buildEventPassEmail(message, { banner?, openingHours? })` returns `{ subject, html, text, attachments }`. The attachments are a QR PNG (cid `event-pass-qr`, file name `<Pass Code>.png`, never the token) and, when a banner is passed, the banner JPEG (cid `event-pass-banner`).
- Opening hours aren't confirmed, so only dates are shown. To add times, set `EVENT_OPENING_HOURS` in `event-pass-email.ts` (Bangkok "HH:mm"), e.g. `{ opens: "09:00", closes: "17:00" }`. A test already covers the time format.
- Dates use `formatRange` across consecutive chosen Event Days, in Thai (Buddhist year) and English, pinned to Asia/Bangkok. The test runs the process in Honolulu to prove it.
- The subject leaves out the Pass Code so lock-screen previews don't show it.
- A bare `EMAIL_FROM` (or `SMTP_USER` when it's empty) gets "STEM Racing Thailand 2026" as display name. A value like `Name <address>` is kept as is.

**Gotchas and conservative choices:**
- `EMAIL_FROM` must be a verified "Send mail as" alias of `SMTP_USER`, or Gmail rewrites From. With 2-Step Verification, `SMTP_PASS` is an App Password.
- Port 465 uses implicit TLS. Other ports use opportunistic STARTTLS, which keeps local sinks usable.
- nodemailer is pinned at 10.0.16. Versions up to 10.0.5 have high-severity advisories, and 10.2.0 was published the day before this ticket.
- nodemailer 10 ships its own types, and `@types/nodemailer` stops at 8.x, so it was not added.
- Outlook for Windows always uses the first font in the stack, so the stack leads with Segoe UI. Fonts are also inlined on `p` and `h1`.

**Verified:**
- Unit tests at the builder seam cover escaping, the plain-text part, Pass Code and link, Bangkok dates for one day and for the range, opening hours, and the CID attachments.
- A real send through a local SMTP sink: the MIME is multipart/alternative(text, related(html, QR, banner)), the HTML is 13KB with no `<style>`, the trailing slash on `APP_URL` is trimmed, and the QR decodes to the link (CoreImage).
- The unconfigured path, the usage error and an unreachable server all come back as results, never throws.
- The rendered HTML was eyeballed in Chrome at 760, 390 and 320px.

**Not verified:** a real Gmail or Outlook client, so the VML gradient direction and the roundrect button are unchecked. Once SMTP credentials exist, run `npm run email:test` to a Gmail and an Outlook desktop inbox.
